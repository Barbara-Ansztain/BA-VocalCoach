-- Horarios de excepción: días puntuales con clases fuera de la semana habitual (ej. sábados de diciembre)
create table if not exists public.horarios_extra (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  start_time time not null,
  created_at timestamptz not null default now(),
  unique (fecha, start_time)
);
alter table public.horarios_extra enable row level security;
create policy "horarios_extra lectura" on public.horarios_extra for select to authenticated using (true);
create policy "horarios_extra admin" on public.horarios_extra for all to authenticated using (private.is_admin()) with check (private.is_admin());
grant select on public.horarios_extra to authenticated;
grant insert, update, delete on public.horarios_extra to authenticated;
