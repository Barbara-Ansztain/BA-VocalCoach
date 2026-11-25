-- Precios y reglas editables desde el panel (Configuración).
create table public.settings (
  id int primary key default 1 check (id = 1),
  precio_suelta int not null default 50000,
  precio_mensual_2 int not null default 100000,
  precio_mensual_4 int not null default 155000,
  recargo_pct int not null default 10 check (recargo_pct between 0 and 100),
  dia_vencimiento int not null default 10 check (dia_vencimiento between 1 and 28),
  horas_aviso int not null default 24 check (horas_aviso between 0 and 168),
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1);

alter table public.settings enable row level security;
grant select on public.settings to anon, authenticated;
grant update on public.settings to authenticated;
grant all on public.settings to service_role;
create policy read_settings on public.settings for select using (true);
create policy admin_update on public.settings for update using (private.is_admin()) with check (private.is_admin());

-- generate_lessons: las clases sueltas toman settings.precio_suelta (ver migración aplicada en Supabase).
