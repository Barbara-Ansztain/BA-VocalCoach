-- Varias profesoras en la misma app: cada dato pertenece a una profe (profe_id = perfil admin)
-- y las reglas de seguridad (RLS) hacen que cada una vea y toque solo lo suyo.

-- 1) Quién es la profe de cada perfil (la admin es su propia profe) y cuál es la principal (página pública)
alter table public.profiles
  add column profe_id uuid references public.profiles on delete cascade,
  add column es_principal boolean not null default false;
update public.profiles set profe_id = (select id from public.profiles where role = 'admin' order by created_at limit 1);
update public.profiles set profe_id = id, es_principal = true where id = (select id from public.profiles where role = 'admin' order by created_at limit 1);
create index profiles_profe_idx on public.profiles (profe_id);

create or replace function private.mi_profe() returns uuid
language sql stable security definer set search_path = public as $$
  select profe_id from public.profiles where user_id = auth.uid();
$$;
create or replace function private.profe_principal() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.profiles where es_principal limit 1;
$$;
revoke execute on function private.mi_profe() from public, anon;
revoke execute on function private.profe_principal() from public, anon, authenticated;
grant execute on function private.mi_profe() to authenticated;

-- 2) profe_id en todas las tablas, con los datos actuales asignados a la profe principal
do $$
declare t text; principal uuid := (select id from public.profiles where es_principal);
begin
  foreach t in array array['availability','holidays','blocked_slots','lessons','lesson_notes','payments','consultations',
    'materials','material_assignments','recordings','settings','price_periods','ausencias','pausas','student_slots',
    'recordatorios','horarios_extra'] loop
    execute format('alter table public.%I add column profe_id uuid references public.profiles on delete cascade', t);
    execute format('update public.%I set profe_id = %L', t, principal);
    execute format('create index %I on public.%I (profe_id)', t || '_profe_idx', t);
  end loop;
end $$;

-- Completa profe_id solo: la profe logueada, o la profe del alumno de la fila
create or replace function private.completar_profe() returns trigger
language plpgsql security definer set search_path = public as $$
declare alumno uuid;
begin
  if new.profe_id is null then
    new.profe_id := private.mi_profe();
  end if;
  if new.profe_id is null then
    alumno := nullif(to_jsonb(new) ->> 'student_id', '')::uuid;
    if alumno is not null then
      select profe_id into new.profe_id from public.profiles where id = alumno;
    end if;
  end if;
  if new.profe_id is null and tg_table_name = 'material_assignments' then
    select profe_id into new.profe_id from public.materials where id = new.material_id;
  end if;
  return new;
end $$;
revoke execute on function private.completar_profe() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['profiles','availability','holidays','blocked_slots','lessons','lesson_notes','payments','consultations',
    'materials','material_assignments','recordings','settings','price_periods','ausencias','pausas','student_slots',
    'recordatorios','horarios_extra'] loop
    execute format('create trigger completar_profe before insert on public.%I for each row execute function private.completar_profe()', t);
    if t <> 'profiles' then
      execute format('alter table public.%I alter column profe_id set not null', t);
    end if;
  end loop;
end $$;

-- 3) Claves únicas por profe
alter table public.settings drop constraint settings_pkey;
alter table public.settings drop column id;
alter table public.settings add primary key (profe_id);

alter table public.price_periods drop constraint price_periods_pkey;
alter table public.price_periods add primary key (profe_id, desde);

alter table public.holidays drop constraint holidays_pkey;
alter table public.holidays add primary key (profe_id, date);

alter table public.horarios_extra drop constraint horarios_extra_fecha_start_time_key;
alter table public.horarios_extra add constraint horarios_extra_profe_fecha_hora_key unique (profe_id, fecha, start_time);

drop index public.lessons_slot_unique;
create unique index lessons_slot_unique on public.lessons (profe_id, starts_at) where status in ('reservada', 'asistio');

-- 4) Reglas: la admin solo ve lo de su profe_id; los alumnos solo lo de su profe
do $$
declare t text;
begin
  foreach t in array array['profiles','availability','holidays','blocked_slots','lessons','lesson_notes','payments','consultations',
    'materials','material_assignments','recordings','price_periods','ausencias','pausas','student_slots','recordatorios'] loop
    execute format('drop policy admin_all on public.%I', t);
    execute format('create policy admin_all on public.%I for all using (private.is_admin() and profe_id = private.mi_profe()) with check (private.is_admin() and profe_id = private.mi_profe())', t);
  end loop;
end $$;

drop policy admin_update on public.settings;
create policy admin_all on public.settings for all using (private.is_admin() and profe_id = private.mi_profe()) with check (private.is_admin() and profe_id = private.mi_profe());
grant insert on public.settings to authenticated;

drop policy "horarios_extra admin" on public.horarios_extra;
drop policy "horarios_extra lectura" on public.horarios_extra;
create policy admin_all on public.horarios_extra for all using (private.is_admin() and profe_id = private.mi_profe()) with check (private.is_admin() and profe_id = private.mi_profe());
create policy read_horarios_extra on public.horarios_extra for select using (profe_id = private.mi_profe());

drop policy read_availability on public.availability;
create policy read_availability on public.availability for select using (profe_id = private.mi_profe());
drop policy read_holidays on public.holidays;
create policy read_holidays on public.holidays for select using (profe_id = private.mi_profe());
drop policy read_ausencias on public.ausencias;
create policy read_ausencias on public.ausencias for select using (profe_id = private.mi_profe());

-- 5) Cuentas nuevas sin perfil previo quedan con la profe principal (luego la profe las asigna)
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set user_id = new.id
   where user_id is null and lower(email) = lower(new.email);
  if not found then
    insert into public.profiles (user_id, email, full_name, plan, profe_id)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'suelta', private.profe_principal());
  end if;
  return new;
end $$;

-- 6) Precio de la clase suelta según la profe, y generación de clases con la profe de cada alumno
drop function public.precio_suelta_en(date);
create function public.precio_suelta_en(p_fecha date, p_profe uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select precio_suelta from price_periods where profe_id = p_profe and desde <= p_fecha order by desde desc limit 1),
    (select precio_suelta from settings where profe_id = p_profe));
$$;
revoke execute on function public.precio_suelta_en(date, uuid) from public, anon, authenticated;

create or replace function public.generate_lessons(p_from date, p_to date) returns int
language plpgsql security definer set search_path = public as $$
declare
  r record; d date; inicio timestamptz; nueva uuid; creadas int := 0;
begin
  for r in select s.*, p.plan, p.modality, p.profe_id as profe from student_slots s join profiles p on p.id = s.student_id
           where p.role = 'alumno' and p.active loop
    for d in select g::date from generate_series(p_from, p_to, interval '1 day') g loop
      continue when extract(dow from d) <> r.weekday;
      continue when exists (select 1 from holidays h where h.profe_id = r.profe and h.date = d);
      continue when exists (select 1 from ausencias a where a.profe_id = r.profe and d between a.desde and a.hasta);
      continue when exists (select 1 from pausas pa where pa.student_id = r.student_id and d >= pa.desde and (pa.hasta is null or d <= pa.hasta));
      continue when r.biweekly and r.biweekly_anchor is not null and ((d - r.biweekly_anchor) / 7) % 2 <> 0;
      inicio := (d + r.start_time) at time zone 'America/Argentina/Buenos_Aires';
      continue when exists (select 1 from lessons l where l.student_id = r.student_id and l.starts_at = inicio);
      insert into lessons (student_id, starts_at, modality, duration_min, profe_id)
      values (r.student_id, inicio, r.modality, r.duration_min, r.profe)
      on conflict do nothing
      returning id into nueva;
      if nueva is not null then
        creadas := creadas + 1;
        if r.plan = 'suelta' then
          insert into payments (student_id, kind, lesson_id, amount, profe_id) values (r.student_id, 'suelta', nueva, precio_suelta_en(d, r.profe), r.profe);
        end if;
        nueva := null;
      end if;
    end loop;
  end loop;
  return creadas;
end $$;
revoke execute on function public.generate_lessons(date, date) from public, anon, authenticated;
grant execute on function public.generate_lessons(date, date) to service_role;

-- 7) Sin FK en profe_id: si no, las lecturas "clase → alumno" de la API quedan ambiguas (dos caminos a profiles)
do $$
declare r record;
begin
  for r in select c.conname, c.conrelid::regclass as tabla from pg_constraint c
           join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
           where c.contype = 'f' and c.connamespace = 'public'::regnamespace and a.attname = 'profe_id' loop
    execute format('alter table %s drop constraint %I', r.tabla, r.conname);
  end loop;
end $$;
notify pgrst, 'reload schema';
