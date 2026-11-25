-- Duración por horario fijo (ej. Lourdes 1 h 30). generate_lessons copia duration_min a cada clase.
alter table public.student_slots add column duration_min int not null default 60 check (duration_min between 15 and 240);
