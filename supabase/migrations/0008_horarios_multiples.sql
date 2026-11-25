-- Varios horarios fijos por alumno (student_slots), Anto unificada (lunes y viernes),
-- y fechas de viaje corregidas: 30/11–6/12 y 15/12–20/12. Ver migración aplicada en Supabase.
create table public.student_slots (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  biweekly boolean not null default false,
  biweekly_anchor date,
  created_at timestamptz not null default now()
);
create index student_slots_student_idx on public.student_slots (student_id);
grant select, insert, update, delete on public.student_slots to authenticated, service_role;
alter table public.student_slots enable row level security;
create policy admin_all on public.student_slots for all using (private.is_admin()) with check (private.is_admin());
create policy own_slots on public.student_slots for select using (student_id = private.my_profile_id());
insert into public.student_slots (student_id, weekday, start_time, biweekly, biweekly_anchor)
select id, usual_weekday, usual_time, biweekly, biweekly_anchor from public.profiles
where usual_weekday is not null and usual_time is not null;
update public.profiles set usual_weekday = null, usual_time = null, biweekly = false, biweekly_anchor = null;
-- generate_lessons recorre student_slots (misma lógica: feriados, ausencias, pausas, quincenal).
