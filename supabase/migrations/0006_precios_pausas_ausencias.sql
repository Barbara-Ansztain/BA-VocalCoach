-- Precios por mes, pausas de alumnos, días sin clases de Barbi y clases reprogramadas.

-- Precios que rigen desde un mes en adelante (si no hay ninguno, valen los de settings)
create table public.price_periods (
  desde date primary key check (extract(day from desde) = 1),
  precio_suelta int not null,
  precio_mensual_2 int not null,
  precio_mensual_4 int not null,
  created_at timestamptz not null default now()
);

-- Días en que Barbi no da clases (vacaciones, viajes)
create table public.ausencias (
  id uuid primary key default gen_random_uuid(),
  desde date not null,
  hasta date not null check (hasta >= desde),
  motivo text
);

-- Alumno que no viene por un tiempo (descanso, vacaciones, no viene este mes)
create table public.pausas (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles on delete cascade,
  desde date not null,
  hasta date not null check (hasta >= desde),
  motivo text not null default 'descanso',
  created_at timestamptz not null default now()
);
create index pausas_student_idx on public.pausas (student_id);

alter table public.lessons
  add column origen text not null default 'fijo' check (origen in ('fijo', 'reprogramada', 'extra')),
  add column nota text;

grant select on public.price_periods to anon, authenticated;
grant select, insert, update, delete on public.price_periods, public.ausencias, public.pausas to authenticated, service_role;
alter table public.price_periods enable row level security;
alter table public.ausencias enable row level security;
alter table public.pausas enable row level security;
create policy admin_all on public.price_periods for all using (private.is_admin()) with check (private.is_admin());
create policy admin_all on public.ausencias for all using (private.is_admin()) with check (private.is_admin());
create policy admin_all on public.pausas for all using (private.is_admin()) with check (private.is_admin());
create policy read_prices on public.price_periods for select using (true);
create policy read_ausencias on public.ausencias for select using (auth.uid() is not null);
create policy own_pausas on public.pausas for select using (student_id = private.my_profile_id());

-- Precio de clase suelta vigente en una fecha
create or replace function public.precio_suelta_en(p_fecha date) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select precio_suelta from price_periods where desde <= p_fecha order by desde desc limit 1),
    (select precio_suelta from settings where id = 1));
$$;
revoke execute on function public.precio_suelta_en(date) from public, anon, authenticated;

-- Clases de horario fijo: ahora saltean ausencias de Barbi y pausas del alumno
create or replace function public.generate_lessons(p_from date, p_to date) returns int
language plpgsql security definer set search_path = public as $$
declare
  r record; d date; inicio timestamptz; nueva uuid; creadas int := 0;
begin
  for r in select * from profiles
           where role = 'alumno' and active and usual_weekday is not null and usual_time is not null loop
    for d in select g::date from generate_series(p_from, p_to, interval '1 day') g loop
      continue when extract(dow from d) <> r.usual_weekday;
      continue when exists (select 1 from holidays h where h.date = d);
      continue when exists (select 1 from ausencias a where d between a.desde and a.hasta);
      continue when exists (select 1 from pausas p where p.student_id = r.id and d between p.desde and p.hasta);
      continue when r.biweekly and r.biweekly_anchor is not null and ((d - r.biweekly_anchor) / 7) % 2 <> 0;
      inicio := (d + r.usual_time) at time zone 'America/Argentina/Buenos_Aires';
      continue when exists (select 1 from lessons l where l.student_id = r.id and l.starts_at = inicio);
      insert into lessons (student_id, starts_at, modality)
      values (r.id, inicio, r.modality)
      on conflict do nothing
      returning id into nueva;
      if nueva is not null then
        creadas := creadas + 1;
        if r.plan = 'suelta' then
          insert into payments (student_id, kind, lesson_id, amount) values (r.id, 'suelta', nueva, precio_suelta_en(d));
        end if;
        nueva := null;
      end if;
    end loop;
  end loop;
  return creadas;
end $$;
revoke execute on function public.generate_lessons(date, date) from public, anon, authenticated;
grant execute on function public.generate_lessons(date, date) to service_role;
