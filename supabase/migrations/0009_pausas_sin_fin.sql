-- Una pausa puede no tener fecha de fin ("inactivo desde ..."). generate_lessons la respeta.
alter table public.pausas alter column hasta drop not null;
