-- Bloqueos por rango (de un día/hora a otro). Un horario está bloqueado si starts_at <= horario < ends_at.
alter table public.blocked_slots add column ends_at timestamptz;
update public.blocked_slots set ends_at = starts_at + interval '1 hour' where ends_at is null;
alter table public.blocked_slots alter column ends_at set not null;
