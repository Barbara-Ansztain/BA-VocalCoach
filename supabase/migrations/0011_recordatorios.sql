-- Recordatorios de Barbi (opcionalmente de un alumno y con fecha).
create table public.recordatorios (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  student_id uuid references public.profiles on delete cascade,
  fecha date,
  hecho boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.recordatorios to authenticated, service_role;
alter table public.recordatorios enable row level security;
create policy admin_all on public.recordatorios for all using (private.is_admin()) with check (private.is_admin());
