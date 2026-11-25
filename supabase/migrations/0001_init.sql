-- BA - Vocal Coach · esquema inicial
-- Correr en Supabase (SQL editor o `supabase db push`).

create extension if not exists "pgcrypto";

-- ───────────────────────── Perfiles ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'alumno' check (role in ('admin', 'alumno')),
  full_name text not null default '',
  email text not null default '',
  phone text,
  plan text not null default 'suelta' check (plan in ('suelta', 'mensual_2', 'mensual_4')),
  modality text not null default 'presencial' check (modality in ('presencial', 'online')),
  usual_slot text,                       -- ej. "Jueves 16:00"
  tyc_accepted_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Crea el perfil automáticamente cuando se crea un usuario (invitación o registro)
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
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
create policy own_profile on public.profiles for select using (id = auth.uid());
create policy read_availability on public.availability for select using (auth.uid() is not null);
create policy read_holidays on public.holidays for select using (auth.uid() is not null);
create policy own_lessons on public.lessons for select using (student_id = auth.uid());
create policy own_payments on public.payments for select using (student_id = auth.uid());
create policy own_recordings on public.recordings for select using (student_id = auth.uid());
create policy own_assignments on public.material_assignments for select using (student_id = auth.uid());
create policy assigned_materials on public.materials for select using (
  exists (select 1 from public.material_assignments a where a.material_id = materials.id and a.student_id = auth.uid())
);

-- ───────────────────────── Archivos ─────────────────────────
insert into storage.buckets (id, name, public) values
  ('comprobantes', 'comprobantes', false),
  ('grabaciones', 'grabaciones', false),
  ('material', 'material', false)
on conflict do nothing;

-- Cada alumno sube y lee solo dentro de su carpeta (<user_id>/archivo)
create policy own_files_read on storage.objects for select using (
  bucket_id in ('comprobantes', 'grabaciones') and (storage.foldername(name))[1] = auth.uid()::text
);
create policy own_files_write on storage.objects for insert with check (
  bucket_id in ('comprobantes', 'grabaciones') and (storage.foldername(name))[1] = auth.uid()::text
);
create policy admin_files on storage.objects for all using (public.is_admin()) with check (public.is_admin());

-- ───────────────────────── Datos iniciales ─────────────────────────
-- Horarios de Instagram. Ajustar desde Configuración.
insert into public.availability (weekday, start_time, biweekly) values
  (1, '14:30', false),
  (2, '11:00', false),
  (2, '14:30', false),
  (3, '17:00', false),
  (4, '15:00', true),
  (5, '17:00', false);

-- Después de crear tu usuario, hacete admin:
-- update public.profiles set role = 'admin' where email = 'TU_MAIL';
