-- Diciembre 2026 según el calendario de Barbi (capturas del 24/11).
-- Precios nuevos, días sin clases, alumnos que no vienen, y clases reprogramadas.

insert into public.price_periods (desde, precio_suelta, precio_mensual_2, precio_mensual_4)
values ('2026-12-01', 40000, 80000, 140000) on conflict (desde) do update
  set precio_suelta = excluded.precio_suelta, precio_mensual_2 = excluded.precio_mensual_2, precio_mensual_4 = excluded.precio_mensual_4;

insert into public.ausencias (desde, hasta, motivo) values
  ('2026-12-01', '2026-12-05', 'Barbi no da clases'),
  ('2026-12-15', '2026-12-17', 'Barbi no da clases');

insert into public.pausas (student_id, desde, hasta, motivo)
select id, '2026-12-01', '2026-12-31', 'No viene este mes' from public.profiles where full_name in ('Sofi Mallol', 'Daiana');

create temp table cal_dic (fecha date, hora time, nombre text, dia int, origen text, modalidad text, nota text);
insert into cal_dic values
  ('2026-12-07', '13:30', 'Yami', null, 'reprogramada', null, null),
  ('2026-12-07', '14:30', 'Luqui', null, 'fijo', 'online', 'Virtual'),
  ('2026-12-07', '15:30', 'Leonel', null, 'fijo', null, null),
  ('2026-12-07', '16:30', 'Lourdes', null, 'fijo', null, null),
  ('2026-12-07', '18:00', 'Anto', 1, 'fijo', null, null),
  ('2026-12-07', '19:00', 'Agustín', null, 'fijo', null, null),
  ('2026-12-08', '10:00', 'Lourdes', null, 'reprogramada', null, null),
  ('2026-12-08', '18:30', 'Valentina', null, 'fijo', null, null),
  ('2026-12-08', '19:30', 'Abril', null, 'fijo', null, null),
  ('2026-12-09', '10:00', 'Lourdes', null, 'reprogramada', null, null),
  ('2026-12-09', '11:30', 'Pilar', null, 'reprogramada', null, null),
  ('2026-12-09', '14:00', 'Josefina', null, 'fijo', null, null),
  ('2026-12-09', '15:00', 'Caro', null, 'fijo', null, null),
  ('2026-12-09', '16:00', 'Rami', null, 'fijo', null, null),
  ('2026-12-09', '17:00', 'Rafa', null, 'fijo', null, null),
  ('2026-12-09', '18:00', 'Luciana', null, 'fijo', null, null),
  ('2026-12-09', '19:00', 'Patto', null, 'fijo', null, null),
  ('2026-12-10', '10:00', 'Majo', null, 'fijo', null, null),
  ('2026-12-10', '11:00', 'Marianela', null, 'reprogramada', null, null),
  ('2026-12-10', '12:00', 'Elina', null, 'reprogramada', null, null),
  ('2026-12-10', '14:00', 'Leandro', null, 'fijo', null, null),
  ('2026-12-10', '15:00', 'Milagros', null, 'fijo', null, null),
  ('2026-12-10', '16:00', 'Rafa', null, 'reprogramada', null, null),
  ('2026-12-10', '17:00', 'Leonel', null, 'reprogramada', null, null),
  ('2026-12-10', '18:00', 'Agus', null, 'fijo', null, null),
  ('2026-12-10', '19:00', 'Abril', null, 'reprogramada', null, null),
  ('2026-12-11', '12:00', 'Elina', null, 'reprogramada', null, null),
  ('2026-12-11', '14:00', 'Leandro', null, 'reprogramada', null, null),
  ('2026-12-11', '15:00', 'Maru', null, 'fijo', null, null),
  ('2026-12-11', '16:00', 'Sofi de Simoni', null, 'fijo', null, null),
  ('2026-12-11', '17:00', 'Emma', null, 'fijo', null, null),
  ('2026-12-11', '18:00', 'Anto', 5, 'fijo', null, null),
  ('2026-12-11', '19:00', 'Agustín', null, 'reprogramada', null, null),
  ('2026-12-14', '13:30', 'Valentina', null, 'reprogramada', null, null),
  ('2026-12-14', '14:30', 'Yami', null, 'reprogramada', null, null),
  ('2026-12-14', '15:30', 'Leonel', null, 'fijo', null, null),
  ('2026-12-14', '16:30', 'Lourdes', null, 'fijo', null, null),
  ('2026-12-14', '18:00', 'Anto', 1, 'fijo', null, null),
  ('2026-12-14', '19:00', 'Agustín', null, 'fijo', null, null),
  ('2026-12-17', '15:00', 'Milagros', null, 'fijo', null, null),
  ('2026-12-18', '14:00', 'Claudia', null, 'fijo', null, null),
  ('2026-12-18', '15:00', 'Maru', null, 'fijo', null, null),
  ('2026-12-18', '16:00', 'Sofi de Simoni', null, 'fijo', null, null),
  ('2026-12-18', '17:00', 'Emma', null, 'fijo', null, null),
  ('2026-12-18', '18:00', 'Agus', null, 'reprogramada', null, null),
  ('2026-12-18', '19:00', 'Agustín', null, 'reprogramada', null, null),
  ('2026-12-21', '13:00', 'Luciana', null, 'reprogramada', null, null),
  ('2026-12-21', '14:30', 'Valentina', null, 'reprogramada', null, null),
  ('2026-12-21', '15:30', 'Leonel', null, 'fijo', null, null),
  ('2026-12-21', '16:30', 'Lourdes', null, 'fijo', null, null),
  ('2026-12-21', '18:00', 'Anto', 1, 'fijo', null, null),
  ('2026-12-21', '19:00', 'Agustín', null, 'fijo', null, null),
  ('2026-12-22', '11:00', 'Pilar', null, 'fijo', null, null),
  ('2026-12-22', '12:00', 'Elina', null, 'fijo', null, null),
  ('2026-12-22', '14:30', 'Yami', null, 'fijo', null, null),
  ('2026-12-22', '15:30', 'Marianela', null, 'reprogramada', null, null),
  ('2026-12-22', '18:30', 'Valentina', null, 'fijo', null, null),
  ('2026-12-22', '19:30', 'Abril', null, 'fijo', null, null),
  ('2026-12-23', '10:00', 'Pilar', null, 'reprogramada', null, null),
  ('2026-12-23', '11:00', 'Anto', 5, 'reprogramada', null, null),
  ('2026-12-23', '14:00', 'Josefina', null, 'fijo', null, null),
  ('2026-12-23', '15:00', 'Caro', null, 'fijo', null, null),
  ('2026-12-23', '16:00', 'Rami', null, 'fijo', null, null),
  ('2026-12-23', '17:00', 'Rafa', null, 'fijo', null, null),
  ('2026-12-23', '18:00', 'Luciana', null, 'fijo', null, null),
  ('2026-12-23', '19:00', 'Patto', null, 'fijo', null, null),
  ('2026-12-24', '10:00', 'Majo', null, 'fijo', null, null),
  ('2026-12-24', '14:00', 'Leandro', null, 'fijo', null, null),
  ('2026-12-24', '15:00', 'Milagros', null, 'fijo', null, null),
  ('2026-12-28', '13:30', 'Abril', null, 'reprogramada', null, 'Tentativa'),
  ('2026-12-28', '14:30', 'Luqui', null, 'fijo', null, null),
  ('2026-12-28', '15:30', 'Leonel', null, 'fijo', null, null),
  ('2026-12-28', '16:30', 'Lourdes', null, 'fijo', null, null),
  ('2026-12-28', '18:00', 'Anto', 1, 'fijo', null, null),
  ('2026-12-28', '19:00', 'Agustín', null, 'fijo', null, null),
  ('2026-12-29', '11:00', 'Pilar', null, 'fijo', null, null),
  ('2026-12-29', '12:00', 'Elina', null, 'fijo', null, null),
  ('2026-12-29', '13:30', 'Majo', null, 'reprogramada', null, null),
  ('2026-12-29', '14:30', 'Yami', null, 'fijo', null, null),
  ('2026-12-29', '15:30', 'Marianela', null, 'fijo', null, null),
  ('2026-12-29', '18:30', 'Valentina', null, 'fijo', null, null),
  ('2026-12-29', '19:30', 'Abril', null, 'fijo', null, null),
  ('2026-12-30', '14:00', 'Josefina', null, 'fijo', null, null),
  ('2026-12-30', '15:00', 'Caro', null, 'fijo', null, null),
  ('2026-12-30', '16:00', 'Rami', null, 'fijo', null, null),
  ('2026-12-30', '17:00', 'Rafa', null, 'fijo', null, null),
  ('2026-12-30', '18:00', 'Luciana', null, 'fijo', 'online', 'Virtual'),
  ('2026-12-30', '19:00', 'Patto', null, 'reprogramada', null, null),
  ('2026-12-31', '10:00', 'Majo', null, 'fijo', null, null),
  ('2026-12-31', '14:00', 'Leandro', null, 'fijo', null, null),
  ('2026-12-31', '15:00', 'Milagros', null, 'fijo', null, null);

create temp table cal_ok as
select c.*, p.id as student_id, p.modality as mod_base,
       ((c.fecha + c.hora) at time zone 'America/Argentina/Buenos_Aires') as inicio
from cal_dic c
join public.profiles p on p.full_name = c.nombre and (c.dia is null or p.usual_weekday = c.dia);

-- Clases fijas de diciembre que no están en el calendario: canceladas
with fuera as (
  update public.lessons l set status = 'cancelada', cancelled_at = now(), nota = 'No figura en el calendario de diciembre'
  where l.status = 'reservada'
    and l.starts_at >= '2026-12-01T00:00:00-03:00' and l.starts_at < '2027-01-01T00:00:00-03:00'
    and not exists (select 1 from cal_ok c where c.student_id = l.student_id and c.inicio = l.starts_at)
  returning l.id
)
update public.payments set status = 'anulado' where lesson_id in (select id from fuera) and status = 'pendiente';

-- Las que ya existen: marcar origen, modalidad y nota
update public.lessons l set origen = c.origen, modality = coalesce(c.modalidad, l.modality), nota = c.nota
from cal_ok c where c.student_id = l.student_id and c.inicio = l.starts_at;

-- Las que faltan (reprogramaciones y clases en días especiales): crearlas
insert into public.lessons (student_id, starts_at, modality, origen, nota)
select c.student_id, c.inicio, coalesce(c.modalidad, c.mod_base), c.origen, c.nota
from cal_ok c
where not exists (select 1 from public.lessons l where l.student_id = c.student_id and l.starts_at = c.inicio);

drop table cal_ok;
drop table cal_dic;
