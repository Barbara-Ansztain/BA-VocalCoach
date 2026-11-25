-- Cargos extra (entradas, piano, etc.), concepto libre, recargo opcional, quién paga y saldo a favor.
alter table public.payments drop constraint payments_kind_check;
alter table public.payments add constraint payments_kind_check check (kind in ('mensual', 'suelta', 'extra'));
alter table public.payments add column concepto text, add column aplica_recargo boolean not null default true;
alter table public.profiles add column pagador text, add column credito int not null default 0;
-- Los cobros de noviembre, deudas de Leonel, entradas de la muestra y Soledad se cargaron directo en Supabase (25/11).
