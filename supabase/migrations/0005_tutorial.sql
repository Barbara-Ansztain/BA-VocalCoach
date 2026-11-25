-- Marca cuándo cada persona terminó (o salteó) el tutorial guiado del primer ingreso.
alter table public.profiles add column tour_completed_at timestamptz;
