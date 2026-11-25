-- BA - Vocal Coach · esquema inicial
-- Correr en Supabase (SQL editor o `supabase db push`).

create extension if not exists "pgcrypto";

-- ───────────────────────── Perfiles ─────────────────────────
-- Un perfil por persona. Los alumnos pueden existir sin cuenta (user_id vacío):
-- cuando Barbi los invita y crean su contraseña, el perfil se vincula por mail.
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users on delete set null,
  role text not null default 'alumno' check (role in ('admin', 'alumno')),
  full_name text not null default '',
  email text,
  phone text,
  plan text not null default 'mensual_4' check (plan in ('suelta', 'mensual_2', 'mensual_4')),
  modality text not null default 'presencial' check (modality in ('presencial', 'online')),
  -- Horario fijo: día (0 = domingo) y hora. Quincenal = cada 15 días desde biweekly_anchor.
  usual_weekday int check (usual_weekday between 0 and 6),
  usual_time time,
  biweekly boolean not null default false,
  biweekly_anchor date,
  notes text,
  tyc_accepted_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index profiles_email_idx on public.profiles (lower(email));

-- Al crearse un usuario (invitación o alta manual): se vincula al perfil con ese mail, o se crea uno.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set user_id = new.id
   where user_id is null and lower(email) = lower(new.email);
  if not found then
    insert into public.profiles (user_id, email, full_name, plan)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'suelta');
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin');
$$;

create function public.my_profile_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.profiles where user_id = auth.uid();
$$;

-- ───────────────────────── Agenda ─────────────────────────
-- Horarios que Barbi ofrece cada semana
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  weekday int not null check (weekday between 0 and 6),   -- 0 = domingo
  start_time time not null,
  biweekly boolean not null default false,                 -- "cada 15 días"
  biweekly_anchor date,                                    -- primera fecha válida si es quincenal
  active boolean not null default true
);

create table public.holidays (
  date date primary key,
  name text not null default 'Feriado'
);

-- Horarios bloqueados puntualmente por Barbi
create table public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  reason text
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles on delete cascade,
  starts_at timestamptz not null,
  duration_min int not null default 60,
  modality text not null check (modality in ('presencial', 'online')),
  status text not null default 'reservada'
    check (status in ('reservada', 'asistio', 'cancelada', 'perdida', 'reprogramada')),
  zoom_join_url text,
  zoom_meeting_id text,
  rescheduled_from uuid references public.lessons,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index lessons_slot_unique on public.lessons (starts_at)
  where status in ('reservada', 'asistio');
create index lessons_student_idx on public.lessons (student_id);

create table public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles on delete cascade,
  lesson_id uuid references public.lessons on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Pagos ─────────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('mensual', 'suelta')),
  period text,                      -- 'YYYY-MM' para cuotas mensuales
  lesson_id uuid references public.lessons on delete set null,
  amount int not null,              -- en pesos, sin recargo
  surcharge int not null default 0, -- recargo aplicado al cobrar
  method text check (method in ('mercadopago', 'transferencia', 'efectivo')),
  status text not null default 'pendiente' check (status in ('pendiente', 'en_revision', 'pagado', 'anulado')),
  receipt_path text,
  mp_preference_id text,
  mp_payment_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index payments_monthly_unique on public.payments (student_id, period) where kind = 'mensual';
create index payments_student_idx on public.payments (student_id);

-- ───────────────────────── Consultas (formulario público) ─────────────────────────
create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  modality text,
  experience text,
  message text,
  tyc_accepted_at timestamptz not null,
  status text not null default 'nueva' check (status in ('nueva', 'contactada', 'alumno', 'descartada')),
  created_at timestamptz not null default now()
);

-- ───────────────────────── Material y grabaciones ─────────────────────────
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null default 'otro' check (kind in ('vocalizacion', 'partitura', 'pista', 'audio', 'otro')),
  file_path text,
  url text,
  created_at timestamptz not null default now()
);

create table public.material_assignments (
  material_id uuid references public.materials on delete cascade,
  student_id uuid references public.profiles on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (material_id, student_id)
);

create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles on delete cascade,
  file_path text not null,
  title text,
  comment text,
  commented_at timestamptz,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Permisos de la Data API ─────────────────────────
-- El proyecto no expone tablas nuevas automáticamente: se habilitan acá y RLS decide qué filas ve cada uno.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.my_profile_id() to authenticated;

-- ───────────────────────── Seguridad (RLS) ─────────────────────────
alter table public.profiles enable row level security;
alter table public.availability enable row level security;
alter table public.holidays enable row level security;
alter table public.blocked_slots enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_notes enable row level security;
alter table public.payments enable row level security;
alter table public.consultations enable row level security;
alter table public.materials enable row level security;
alter table public.material_assignments enable row level security;
alter table public.recordings enable row level security;

-- Barbi (admin) puede todo
create policy admin_all on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.availability for all using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.holidays for all using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.blocked_slots for all using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.lessons for all using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.lesson_notes for all using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.payments for all using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.consultations for all using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.materials for all using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.material_assignments for all using (public.is_admin()) with check (public.is_admin());
create policy admin_all on public.recordings for all using (public.is_admin()) with check (public.is_admin());

-- Alumnos: leen lo suyo. Las escrituras pasan por acciones del servidor que validan las reglas.
create policy own_profile on public.profiles for select using (user_id = auth.uid());
create policy read_availability on public.availability for select using (auth.uid() is not null);
create policy read_holidays on public.holidays for select using (auth.uid() is not null);
create policy own_lessons on public.lessons for select using (student_id = public.my_profile_id());
create policy own_payments on public.payments for select using (student_id = public.my_profile_id());
create policy own_recordings on public.recordings for select using (student_id = public.my_profile_id());
create policy own_assignments on public.material_assignments for select using (student_id = public.my_profile_id());
create policy assigned_materials on public.materials for select using (
  exists (select 1 from public.material_assignments a where a.material_id = materials.id and a.student_id = public.my_profile_id())
);

-- ───────────────────────── Archivos ─────────────────────────
insert into storage.buckets (id, name, public) values
  ('comprobantes', 'comprobantes', false),
  ('grabaciones', 'grabaciones', false),
  ('material', 'material', false)
on conflict do nothing;

-- Cada alumno sube y lee solo dentro de su carpeta (<user_id>/archivo)
create policy own_files_read on storage.objects for select using (
  bucket_id in ('comprobantes', 'grabaciones') and (storage.foldername(name))[1] = public.my_profile_id()::text
);
create policy own_files_write on storage.objects for insert with check (
  bucket_id in ('comprobantes', 'grabaciones') and (storage.foldername(name))[1] = public.my_profile_id()::text
);
create policy admin_files on storage.objects for all using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────── Clases de horario fijo ─────────────────────────
-- Crea las clases de cada alumno activo con horario fijo entre dos fechas.
-- Saltea feriados y horarios ya ocupados; no duplica. Devuelve cuántas creó.
create function public.generate_lessons(p_from date, p_to date) returns int
language plpgsql security definer set search_path = public as $$
declare
  r record; d date; inicio timestamptz; nueva uuid; creadas int := 0;
begin
  for r in select * from profiles
           where role = 'alumno' and active and usual_weekday is not null and usual_time is not null loop
    for d in select g::date from generate_series(p_from, p_to, interval '1 day') g loop
      continue when extract(dow from d) <> r.usual_weekday;
      continue when exists (select 1 from holidays h where h.date = d);
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
          insert into payments (student_id, kind, lesson_id, amount) values (r.id, 'suelta', nueva, 50000);
        end if;
        nueva := null;
      end if;
    end loop;
  end loop;
  return creadas;
end $$;
revoke execute on function public.generate_lessons(date, date) from public, anon, authenticated;
grant execute on function public.generate_lessons(date, date) to service_role;

-- ───────────────────────── Feriados conocidos ─────────────────────────
insert into public.holidays (date, name) values
  ('2026-12-08', 'Inmaculada Concepción'),
  ('2026-12-25', 'Navidad'),
  ('2027-01-01', 'Año Nuevo')
on conflict do nothing;

-- Los horarios y alumnos de Barbi se cargan en 0002_alumnos.sql.
