"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/** Cliente con los permisos de la profe logueada: las reglas de Supabase lo limitan a sus propios datos.
 *  (createAdminClient queda solo para invitar cuentas, archivos y generar clases.) */
const dbProfe = () => createClient();
import { duracionEntre, sumarMinutos, DURACION_CLASE_MIN, hora, hoyAR, OFFSET, periodoActual, recargoCuota, type Plan } from "@/lib/reglas";
import { getConfig, getPrecios } from "@/lib/config";
import { borrarReunionZoom, crearReunionZoom } from "@/lib/zoom";
import { mailClaseAgendada } from "@/lib/email";
import { sumarDias } from "@/lib/agenda";

type Resultado = { error?: string; ok?: string };
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// ───────── Clases ─────────
export async function marcarClase(form: FormData) {
  await requireAdmin();
  const estado = s(form, "estado");
  if (!["asistio", "perdida", "cancelada", "reservada"].includes(estado)) return;
  await (await dbProfe()).from("lessons").update({ status: estado }).eq("id", s(form, "id"));
  revalidatePath("/panel", "layout");
}

/** Crea el perfil de un alumno cargado por Barbi (puede no usar nunca la app). */
async function insertarAlumno(form: FormData, horario?: { dia: number; hora: string; duracion?: number }) {
  const nombre = s(form, "nuevo_nombre") || s(form, "nombre");
  if (!nombre) return { error: "Escribí el nombre del alumno." as const };
  const { data, error } = await (await dbProfe()).from("profiles").insert({
    full_name: nombre, phone: s(form, "nuevo_telefono") || s(form, "telefono") || null,
    email: (s(form, "nuevo_email") || s(form, "email")).toLowerCase() || null,
    plan: s(form, "nuevo_plan") || s(form, "plan") || "suelta", modality: s(form, "nuevo_modalidad") || s(form, "modalidad") || "presencial",
  }).select().single();
  if (error || !data) return { error: "No se pudo crear el alumno." as const };
  if (horario) await (await dbProfe()).from("student_slots").insert({ student_id: data.id, weekday: horario.dia, start_time: horario.hora, duration_min: horario.duracion ?? 60 });
  return { alumno: data };
}

export async function crearClase(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const db = await dbProfe();
  const fecha = s(form, "fecha"), hora = s(form, "hora");
  const duracion = duracionEntre(hora, s(form, "hasta"));
  const inicio = `${fecha}T${hora}:00${OFFSET}`;
  if (!fecha || !hora || Number.isNaN(Date.parse(inicio))) return { error: "Revisá la fecha y la hora." };
  let alumno;
  if (s(form, "alumno") === "nuevo") {
    const fijo = form.get("nuevo_fijo") === "on";
    const r = await insertarAlumno(form, fijo ? { dia: new Date(`${fecha}T12:00:00Z`).getUTCDay(), hora, duracion } : undefined);
    if ("error" in r) return { error: r.error };
    alumno = r.alumno;
  } else {
    alumno = (await db.from("profiles").select("*").eq("id", s(form, "alumno")).single()).data;
  }
  if (!alumno) return { error: "Elegí un alumno." };
  const zoom = alumno.modality === "online"
    ? await crearReunionZoom({ tema: `Clase de canto · ${alumno.full_name}`, inicio: new Date(inicio), duracionMin: duracion }).catch(() => null)
    : null;
  const { data: clase, error } = await db.from("lessons").insert({
    student_id: alumno.id, starts_at: inicio, modality: alumno.modality, duration_min: duracion, zoom_join_url: zoom?.joinUrl ?? null, zoom_meeting_id: zoom?.id ?? null,
  }).select().single();
  if (error) return { error: "Ese horario ya está ocupado." };
  if (alumno.plan === "suelta") await db.from("payments").insert({ student_id: alumno.id, kind: "suelta", lesson_id: clase.id, amount: (await getPrecios(fecha)).suelta });
  if (alumno.email) await mailClaseAgendada({ to: alumno.email, nombre: alumno.full_name.split(" ")[0], inicio, modalidad: alumno.modality, zoomUrl: zoom?.joinUrl }).catch(console.error);
  revalidatePath("/panel", "layout");
  return { ok: alumno.email ? `Clase creada para ${alumno.full_name}. Le llegó un mail.` : `Clase creada para ${alumno.full_name}.` };
}

export async function agregarAlumno(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const dia = s(form, "dia"), hora = s(form, "hora");
  const r = await insertarAlumno(form, dia !== "" && hora ? { dia: Number(dia), hora, duracion: duracionEntre(hora, s(form, "hasta")) } : undefined);
  if ("error" in r) return { error: r.error };
  revalidatePath("/panel", "layout");
  return { ok: `${r.alumno.full_name} quedó cargado. ${dia !== "" && hora ? "Tocá «Generar clases» en Agenda para crear sus clases." : ""}` };
}

export async function bloquearHorario(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const desde = s(form, "desde"), hasta = s(form, "hasta") || desde;
  const hDesde = s(form, "hora_desde") || "00:00", hHasta = s(form, "hora_hasta") || "";
  if (!desde || hasta < desde) return { error: "Revisá las fechas." };
  if (hHasta && hHasta <= hDesde) return { error: "La hora de fin tiene que ser después de la de inicio." };
  // Una franja por día; sin hora de fin = hasta el final del día
  const filas: { starts_at: string; ends_at: string; reason: string | null }[] = [];
  for (let d = desde; d <= hasta; d = new Date(Date.parse(`${d}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10)) {
    const fin = hHasta ? `${d}T${hHasta}:00${OFFSET}` : new Date(Date.parse(`${d}T00:00:00${OFFSET}`) + 86_400_000).toISOString();
    filas.push({ starts_at: `${d}T${hDesde}:00${OFFSET}`, ends_at: fin, reason: s(form, "motivo") || null });
    if (filas.length > 120) return { error: "El rango es demasiado largo." };
  }
  await (await dbProfe()).from("blocked_slots").insert(filas);
  revalidatePath("/panel/agenda");
  return { ok: filas.length === 1 ? "Horario bloqueado." : `Bloqueado en ${filas.length} días.` };
}

export async function desbloquear(form: FormData) {
  await requireAdmin();
  await (await dbProfe()).from("blocked_slots").delete().eq("id", s(form, "id"));
  revalidatePath("/panel/agenda");
}

// ───────── Pagos ─────────
export async function confirmarPago(form: FormData) {
  await requireAdmin();
  const db = await dbProfe();
  const { data: p } = await db.from("payments").select("*").eq("id", s(form, "id")).single();
  if (!p) return;
  const metodo = s(form, "metodo") || p.method || "efectivo";
  const surcharge = p.status === "pendiente" && p.kind === "mensual" && p.period && p.aplica_recargo !== false ? recargoCuota(p.amount, p.period, await getConfig()) : p.surcharge;
  await db.from("payments").update({ status: "pagado", method: metodo, surcharge, paid_at: new Date().toISOString() }).eq("id", p.id);
  revalidatePath("/panel", "layout");
}

export async function rechazarComprobante(form: FormData) {
  await requireAdmin();
  await (await dbProfe()).from("payments").update({ status: "pendiente", method: null }).eq("id", s(form, "id"));
  revalidatePath("/panel/pagos");
}

/** Crea las cuotas del mes para cada alumno con plan mensual que todavía no la tenga. */
export async function generarCuotas(form: FormData) {
  await requireAdmin();
  const db = await dbProfe();
  const elegido = s(form, "periodo");
  const periodo = /^\d{4}-\d{2}$/.test(elegido) ? elegido : periodoActual();
  const { data: alumnos } = await db.from("profiles").select("id, plan").eq("role", "alumno").eq("active", true).neq("plan", "suelta");
  const precios = await getPrecios(periodo);
  // No se genera cuota a quien está en pausa todo el mes
  const finMes = new Date(Date.UTC(Number(periodo.slice(0, 4)), Number(periodo.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const { data: pausados } = await db.from("pausas").select("student_id").lte("desde", `${periodo}-01`).or(`hasta.is.null,hasta.gte.${finMes}`);
  const enPausa = new Set((pausados ?? []).map((p) => p.student_id));
  const filas = (alumnos ?? []).filter((a) => !enPausa.has(a.id))
    .map((a) => ({ student_id: a.id, kind: "mensual", period: periodo, amount: precios[a.plan as Plan] }));
  if (filas.length) await db.from("payments").upsert(filas, { onConflict: "student_id,period", ignoreDuplicates: true });
  revalidatePath("/panel", "layout");
}

// ───────── Consultas y alumnos ─────────
async function invitar(email: string, nombre: string) {
  return createAdminClient().auth.admin.inviteUserByEmail(email, {
    data: { full_name: nombre },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/bienvenida`,
  });
}

/** Consulta nueva → alumno: si ya existe un alumno con ese mail se vincula; si no, se crea el perfil. */
export async function darAcceso(form: FormData) {
  const yo = await requireAdmin();
  const db = await dbProfe();
  const { data: c } = await db.from("consultations").select("*").eq("id", s(form, "id")).single();
  if (!c) return;
  const { data, error } = await invitar(c.email, c.name);
  if (error || !data.user) { console.error(error); return; }
  // La cuenta nueva puede haber nacido sin profe: se la asigna a la profe que da el acceso
  await createAdminClient().from("profiles").update({
    full_name: c.name, phone: c.phone, modality: c.modality === "Online" ? "online" : "presencial",
    plan: (s(form, "plan") || "suelta") as Plan, profe_id: yo.profe_id,
  }).eq("user_id", data.user.id);
  await db.from("consultations").update({ status: "alumno" }).eq("id", c.id);
  revalidatePath("/panel", "layout");
}

/** Alumno cargado sin cuenta: le manda el mail para crear su contraseña. */
export async function invitarAlumno(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const db = await dbProfe();
  const { data: a } = await db.from("profiles").select("*").eq("id", s(form, "id")).single();
  if (!a) return { error: "No encontramos al alumno." };
  if (!a.email) return { error: "Primero cargá su mail en la ficha y guardá." };
  if (a.user_id) return { error: "Ya tiene cuenta." };
  const { error } = await invitar(a.email, a.full_name);
  if (error) return { error: "No se pudo mandar la invitación. Revisá el mail." };
  revalidatePath("/panel/alumnos", "layout");
  return { ok: `Invitación enviada a ${a.email}.` };
}

export async function estadoConsulta(form: FormData) {
  await requireAdmin();
  await (await dbProfe()).from("consultations").update({ status: s(form, "estado") }).eq("id", s(form, "id"));
  revalidatePath("/panel", "layout");
}

export async function guardarAlumno(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const { error } = await (await dbProfe()).from("profiles").update({
    full_name: s(form, "nombre"), email: s(form, "email").toLowerCase() || null, phone: s(form, "telefono") || null,
    plan: s(form, "plan"), modality: s(form, "modalidad"),
    notes: s(form, "notas") || null, active: form.get("activo") === "on",
    pagador: s(form, "pagador") || null, credito: Number(s(form, "credito").replace(/\D/g, "")) || 0,
  }).eq("id", s(form, "id"));
  revalidatePath("/panel", "layout");
  return error ? { error: "No se pudo guardar." } : { ok: "Guardado." };
}

/** Crea las clases de horario fijo de las próximas 6 semanas (y los links de Zoom de las online). */
export async function generarClases(): Promise<Resultado> {
  await requireAdmin();
  const db = await dbProfe();
  const desde = hoyAR();
  const hasta = new Date(Date.parse(desde) + 42 * 86_400_000).toISOString().slice(0, 10);
  const { data: n, error } = await createAdminClient().rpc("generate_lessons", { p_from: desde, p_to: hasta });
  if (error) return { error: "No se pudieron generar las clases." };
  const { data: online } = await db.from("lessons").select("id, starts_at, profiles(full_name)")
    .eq("modality", "online").eq("status", "reservada").is("zoom_join_url", null).gte("starts_at", desde);
  for (const c of online ?? []) {
    const nombre = (c.profiles as unknown as { full_name: string } | null)?.full_name ?? "";
    const z = await crearReunionZoom({ tema: `Clase de canto · ${nombre}`, inicio: new Date(c.starts_at), duracionMin: DURACION_CLASE_MIN }).catch(() => null);
    if (z) await db.from("lessons").update({ zoom_join_url: z.joinUrl, zoom_meeting_id: z.id }).eq("id", c.id);
  }
  revalidatePath("/panel", "layout");
  return { ok: n ? `Se crearon ${n} clases hasta el ${hasta.slice(8)}/${hasta.slice(5, 7)}.` : "Las clases ya estaban generadas." };
}

export async function generarClasesBoton(): Promise<Resultado> {
  return generarClases();
}

export async function agregarNota(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const cuerpo = s(form, "nota");
  if (!cuerpo) return { error: "Escribí la nota." };
  await (await dbProfe()).from("lesson_notes").insert({ student_id: s(form, "id"), body: cuerpo });
  revalidatePath("/panel/alumnos", "layout");
  return { ok: "Nota guardada." };
}

export async function comentarGrabacion(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  await (await dbProfe()).from("recordings").update({ comment: s(form, "comentario"), commented_at: new Date().toISOString() }).eq("id", s(form, "id"));
  revalidatePath("/panel/alumnos", "layout");
  return { ok: "Comentario enviado." };
}

// ───────── Material ─────────
export async function subirMaterial(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const db = await dbProfe();
  const archivo = form.get("archivo");
  let ruta: string | null = null;
  if (archivo instanceof File && archivo.size > 0) {
    ruta = `${Date.now()}-${archivo.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await createAdminClient().storage.from("material").upload(ruta, archivo, { contentType: archivo.type });
    if (error) return { error: "No se pudo subir el archivo." };
  }
  const url = s(form, "url") || null;
  if (!ruta && !url) return { error: "Subí un archivo o pegá un link." };
  await db.from("materials").insert({ title: s(form, "titulo"), kind: s(form, "tipo") || "otro", file_path: ruta, url });
  revalidatePath("/panel/material");
  return { ok: "Material agregado." };
}

export async function asignarMaterial(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const material = s(form, "material");
  const alumnos = form.getAll("alumnos").map(String);
  if (!material || alumnos.length === 0) return { error: "Elegí material y alumnos." };
  await (await dbProfe()).from("material_assignments").upsert(alumnos.map((a) => ({ material_id: material, student_id: a })), { ignoreDuplicates: true });
  revalidatePath("/panel", "layout");
  return { ok: "Asignado." };
}

// ───────── Configuración ─────────
export async function agregarHorario(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const quincenal = form.get("quincenal") === "on";
  await (await dbProfe()).from("availability").insert({
    weekday: Number(s(form, "dia")), start_time: s(form, "hora"), biweekly: quincenal, biweekly_anchor: quincenal ? s(form, "desde") || null : null,
  });
  revalidatePath("/panel/configuracion");
  return { ok: "Horario agregado." };
}

export async function quitarHorario(form: FormData) {
  await requireAdmin();
  await (await dbProfe()).from("availability").update({ active: false }).eq("id", s(form, "id"));
  revalidatePath("/panel/configuracion");
}

export async function agregarFeriado(_: Resultado, form: FormData): Promise<Resultado> {
  const yo = await requireAdmin();
  await (await dbProfe()).from("holidays").upsert({ profe_id: yo.profe_id, date: s(form, "fecha"), name: s(form, "nombre") || "Feriado" });
  revalidatePath("/panel", "layout");
  return { ok: "Feriado agregado." };
}

export async function quitarFeriado(form: FormData) {
  await requireAdmin();
  await (await dbProfe()).from("holidays").delete().eq("date", s(form, "fecha"));
  revalidatePath("/panel", "layout");
}

export async function guardarConfig(_: Resultado, form: FormData): Promise<Resultado> {
  const yo = await requireAdmin();
  const n = (k: string) => Number(s(form, k).replace(/\D/g, ""));
  const datos = {
    precio_suelta: n("suelta"), precio_mensual_2: n("mensual_2"), precio_mensual_4: n("mensual_4"),
    recargo_pct: n("recargo"), dia_vencimiento: n("vencimiento"), horas_aviso: n("aviso"), updated_at: new Date().toISOString(),
  };
  if ([datos.precio_suelta, datos.precio_mensual_2, datos.precio_mensual_4].some((x) => !x)) return { error: "Revisá los precios." };
  const { error } = await (await dbProfe()).from("settings").upsert({ profe_id: yo.profe_id, ...datos });
  revalidatePath("/", "layout");
  return error ? { error: "No se pudo guardar. Revisá los valores." } : { ok: "Guardado. Los precios nuevos se usan en las cuotas y clases que se generen desde ahora, en la página pública y en los términos." };
}

// ───────── Precios por mes ─────────
export async function guardarPrecioMes(_: Resultado, form: FormData): Promise<Resultado> {
  const yo = await requireAdmin();
  const mes = s(form, "mes"); // YYYY-MM
  const n = (k: string) => Number(s(form, k).replace(/\D/g, ""));
  if (!/^\d{4}-\d{2}$/.test(mes)) return { error: "Elegí el mes." };
  const fila = { profe_id: yo.profe_id, desde: `${mes}-01`, precio_suelta: n("suelta"), precio_mensual_2: n("mensual_2"), precio_mensual_4: n("mensual_4") };
  if (!fila.precio_suelta || !fila.precio_mensual_2 || !fila.precio_mensual_4) return { error: "Completá los tres precios." };
  const { error } = await (await dbProfe()).from("price_periods").upsert(fila);
  revalidatePath("/", "layout");
  return error ? { error: "No se pudo guardar." } : { ok: "Precios guardados. Rigen desde ese mes en adelante, hasta que cargues otros." };
}

export async function borrarPrecioMes(form: FormData) {
  await requireAdmin();
  await (await dbProfe()).from("price_periods").delete().eq("desde", s(form, "desde"));
  revalidatePath("/", "layout");
}

// ───────── Pausas de alumnos ─────────
const finDelDia = (f: string) => `${f}T23:59:59${OFFSET}`;

export async function pausarAlumno(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const db = await dbProfe();
  const id = s(form, "id"), desde = s(form, "desde"), hasta = s(form, "hasta") || null, motivo = s(form, "motivo") || "Descanso";
  if (!desde || (hasta && hasta < desde)) return { error: "Revisá las fechas." };
  await db.from("pausas").insert({ student_id: id, desde, hasta, motivo });
  let q = db.from("lessons")
    .update({ status: "cancelada", cancelled_at: new Date().toISOString(), nota: `Pausa: ${motivo}` })
    .eq("student_id", id).eq("status", "reservada").gte("starts_at", `${desde}T00:00:00${OFFSET}`);
  if (hasta) q = q.lte("starts_at", finDelDia(hasta));
  const { data: canceladas } = await q.select("id");
  const ids = (canceladas ?? []).map((c) => c.id);
  if (ids.length) await db.from("payments").update({ status: "anulado" }).in("lesson_id", ids).eq("status", "pendiente");
  revalidatePath("/panel", "layout");
  const rango = hasta ? `del ${desde.slice(8)}/${desde.slice(5, 7)} al ${hasta.slice(8)}/${hasta.slice(5, 7)}` : `desde el ${desde.slice(8)}/${desde.slice(5, 7)}, sin fecha de vuelta`;
  return { ok: `Listo: inactivo ${rango}. Se liberaron ${ids.length} clases.` };
}

export async function quitarPausa(form: FormData) {
  await requireAdmin();
  const db = await dbProfe();
  const { data: p } = await db.from("pausas").select("*").eq("id", s(form, "id")).single();
  if (!p) return;
  await db.from("pausas").delete().eq("id", p.id);
  // Vuelven sus clases de horario fijo en ese rango (desde hoy)
  const hasta: string = p.hasta ?? new Date(Date.parse(hoyAR()) + 42 * 86_400_000).toISOString().slice(0, 10);
  await db.from("lessons").delete().eq("student_id", p.student_id).eq("status", "cancelada").like("nota", "Pausa:%")
    .gte("starts_at", `${p.desde}T00:00:00${OFFSET}`).lte("starts_at", finDelDia(hasta));
  const desde = p.desde > hoyAR() ? p.desde : hoyAR();
  if (desde <= hasta) await createAdminClient().rpc("generate_lessons", { p_from: desde, p_to: hasta });
  revalidatePath("/panel", "layout");
}

// ───────── Días extra con clases (excepciones, ej. sábados de diciembre) ─────────
export async function agregarDiaExtra(_: Resultado, form: FormData): Promise<Resultado> {
  const yo = await requireAdmin();
  const desde = s(form, "desde"), hasta = s(form, "hasta") || desde, dia = s(form, "dia");
  const hIni = s(form, "hora_desde"), hFin = s(form, "hora_hasta") || hIni;
  if (!desde || hasta < desde) return { error: "Revisá las fechas." };
  if (!hIni || hFin < hIni) return { error: "Revisá los horarios." };
  const horas: string[] = [];
  for (let h = hIni; h <= hFin; h = sumarMinutos(h, 60)) { horas.push(h); if (h >= "23:00") break; }
  const filas: { profe_id: string | null; fecha: string; start_time: string }[] = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    if (dia !== "" && new Date(f + "T12:00:00Z").getUTCDay() !== Number(dia)) continue;
    for (const h of horas) filas.push({ profe_id: yo.profe_id, fecha: f, start_time: h });
  }
  if (!filas.length) return { error: "En esas fechas no hay ningún día como el que elegiste." };
  const { error } = await (await dbProfe()).from("horarios_extra").upsert(filas, { onConflict: "profe_id,fecha,start_time", ignoreDuplicates: true });
  revalidatePath("/panel", "layout");
  revalidatePath("/alumno", "layout");
  const dias = new Set(filas.map((x) => x.fecha)).size;
  return error ? { error: "No se pudo guardar." } : { ok: `Listo: ${dias} ${dias === 1 ? "día" : "días"} con ${horas.length} ${horas.length === 1 ? "horario" : "horarios"} cada uno.` };
}

export async function quitarDiaExtra(form: FormData) {
  await requireAdmin();
  const db = await dbProfe();
  if (s(form, "id")) await db.from("horarios_extra").delete().eq("id", s(form, "id"));
  else await db.from("horarios_extra").delete().eq("fecha", s(form, "fecha"));
  revalidatePath("/panel", "layout");
  revalidatePath("/alumno", "layout");
}

// ───────── Días sin clases (vacaciones de Barbi) ─────────
export async function agregarAusencia(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const db = await dbProfe();
  const desde = s(form, "desde"), hasta = s(form, "hasta") || s(form, "desde"), motivo = s(form, "motivo") || "Barbi no da clases";
  if (!desde || hasta < desde) return { error: "Revisá las fechas." };
  await db.from("ausencias").insert({ desde, hasta, motivo });
  const { data: canceladas } = await db.from("lessons")
    .update({ status: "cancelada", cancelled_at: new Date().toISOString(), nota: `Sin clases: ${motivo}` })
    .eq("status", "reservada").gte("starts_at", `${desde}T00:00:00${OFFSET}`).lte("starts_at", finDelDia(hasta)).select("id");
  const ids = (canceladas ?? []).map((c) => c.id);
  if (ids.length) await db.from("payments").update({ status: "anulado" }).in("lesson_id", ids).eq("status", "pendiente");
  revalidatePath("/panel", "layout");
  return { ok: ids.length ? `Guardado. Se cancelaron ${ids.length} clases de esos días: reprogramalas desde la Agenda.` : "Guardado." };
}

export async function quitarAusencia(form: FormData) {
  await requireAdmin();
  const db = await dbProfe();
  const { data: a } = await db.from("ausencias").select("*").eq("id", s(form, "id")).single();
  if (!a) return;
  await db.from("ausencias").delete().eq("id", a.id);
  await db.from("lessons").delete().eq("status", "cancelada").like("nota", "Sin clases:%")
    .gte("starts_at", `${a.desde}T00:00:00${OFFSET}`).lte("starts_at", finDelDia(a.hasta));
  const desde = a.desde > hoyAR() ? a.desde : hoyAR();
  if (desde <= a.hasta) await createAdminClient().rpc("generate_lessons", { p_from: desde, p_to: a.hasta });
  revalidatePath("/panel", "layout");
}

// ───────── Horarios fijos de cada alumno ─────────
export async function agregarHorarioAlumno(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const quincenal = form.get("quincenal") === "on";
  const dia = s(form, "dia"), hora = s(form, "hora");
  if (dia === "" || !hora) return { error: "Elegí día y hora." };
  const db = await dbProfe();
  const { error } = await db.from("student_slots").insert({
    student_id: s(form, "id"), weekday: Number(dia), start_time: hora, biweekly: quincenal, biweekly_anchor: quincenal ? s(form, "desde") || hoyAR() : null,
    duration_min: duracionEntre(hora, s(form, "hasta")),
  });
  if (error) return { error: "No se pudo agregar." };
  const hasta = new Date(Date.parse(hoyAR()) + 42 * 86_400_000).toISOString().slice(0, 10);
  const { data: n } = await createAdminClient().rpc("generate_lessons", { p_from: hoyAR(), p_to: hasta });
  revalidatePath("/panel", "layout");
  return { ok: `Horario agregado.${n ? ` Se crearon ${n} clases.` : ""}` };
}

export async function quitarHorarioAlumno(form: FormData) {
  await requireAdmin();
  const db = await dbProfe();
  const { data: h } = await db.from("student_slots").select("*").eq("id", s(form, "id")).single();
  if (!h) return;
  await db.from("student_slots").delete().eq("id", h.id);
  // Se liberan las clases futuras de ese horario
  const { data: futuras } = await db.from("lessons").select("id, starts_at").eq("student_id", h.student_id).eq("status", "reservada").eq("origen", "fijo").gte("starts_at", new Date().toISOString());
  const ids = (futuras ?? []).filter((c) => {
    const d = new Date(c.starts_at);
    const dia = new Date(d.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })).getDay();
    return dia === h.weekday && hora(c.starts_at) === h.start_time.slice(0, 5);
  }).map((c) => c.id);
  if (ids.length) {
    await db.from("payments").update({ status: "anulado" }).in("lesson_id", ids).eq("status", "pendiente");
    await db.from("lessons").delete().in("id", ids);
  }
  revalidatePath("/panel", "layout");
}

// ───────── Pagos cargados a mano y cargos extra ─────────
const montoDe = (f: FormData, k: string) => Number(s(f, k).replace(/\D/g, ""));

export async function registrarPago(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const tipo = s(form, "tipo") || "extra", estado = s(form, "estado") === "pendiente" ? "pendiente" : "pagado";
  const monto = montoDe(form, "monto");
  if (!s(form, "alumno") || !monto) return { error: "Elegí el alumno y el monto." };
  const periodo = tipo === "mensual" ? s(form, "periodo") || periodoActual() : null;
  const fila = {
    student_id: s(form, "alumno"), kind: tipo, period: periodo, amount: monto, status: estado,
    method: s(form, "metodo") || null, concepto: s(form, "concepto") || null, aplica_recargo: false,
    paid_at: estado === "pagado" ? new Date().toISOString() : null,
  };
  const db = await dbProfe();
  const { error } = tipo === "mensual"
    ? await db.from("payments").upsert(fila, { onConflict: "student_id,period" })
    : await db.from("payments").insert(fila);
  revalidatePath("/panel", "layout");
  return error ? { error: "No se pudo guardar." } : { ok: estado === "pagado" ? "Pago registrado." : "Deuda registrada." };
}

export async function cargarExtra(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const concepto = s(form, "concepto"), monto = montoDe(form, "monto");
  const ids = form.getAll("alumnos").map(String);
  if (!concepto || !monto || !ids.length) return { error: "Completá concepto, monto y al menos una persona." };
  const estado = s(form, "estado") === "pagado" ? "pagado" : "pendiente";
  const filas = ids.map((id) => {
    const cant = Math.max(1, Number(s(form, `cant-${id}`)) || 1);
    return {
      student_id: id, kind: "extra", amount: monto * cant, status: estado, aplica_recargo: false,
      concepto: cant > 1 ? `${cant} × ${concepto}` : concepto, paid_at: estado === "pagado" ? new Date().toISOString() : null,
    };
  });
  const { error } = await (await dbProfe()).from("payments").insert(filas);
  revalidatePath("/panel", "layout");
  return error ? { error: "No se pudo cargar." } : { ok: `Cargado a ${filas.length} ${filas.length === 1 ? "persona" : "personas"}.` };
}

// ───────── Etiquetas de clases ─────────
export async function etiquetarClase(form: FormData) {
  await requireAdmin();
  const nota = s(form, "etiqueta") === "otra" ? s(form, "texto") : s(form, "etiqueta");
  await (await dbProfe()).from("lessons").update({ nota: nota || null }).eq("id", s(form, "id"));
  revalidatePath("/panel", "layout");
}

// ───────── Recordatorios ─────────
export async function agregarRecordatorio(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const texto = s(form, "texto");
  if (!texto) return { error: "Escribí el recordatorio." };
  await (await dbProfe()).from("recordatorios").insert({ texto, student_id: s(form, "alumno") || null, fecha: s(form, "fecha") || null });
  revalidatePath("/panel", "layout");
  return { ok: "Recordatorio guardado." };
}

export async function marcarRecordatorio(form: FormData) {
  await requireAdmin();
  await (await dbProfe()).from("recordatorios").update({ hecho: s(form, "hecho") === "1" }).eq("id", s(form, "id"));
  revalidatePath("/panel", "layout");
}

// ───────── Cambiar una clase a virtual o presencial ─────────
export async function cambiarModalidad(form: FormData) {
  await requireAdmin();
  const db = await dbProfe();
  const { data: c } = await db.from("lessons").select("*, profiles(full_name, email)").eq("id", s(form, "id")).single();
  if (!c) return;
  const online = c.modality !== "online";
  let zoom: { id: string; joinUrl: string } | null = null;
  if (online && !c.zoom_join_url) {
    zoom = await crearReunionZoom({ tema: `Clase de canto · ${c.profiles?.full_name ?? ""}`, inicio: new Date(c.starts_at), duracionMin: c.duration_min }).catch(() => null);
  }
  await db.from("lessons").update({
    modality: online ? "online" : "presencial",
    ...(zoom ? { zoom_join_url: zoom.joinUrl, zoom_meeting_id: zoom.id } : {}),
    nota: online ? (c.nota || "Virtual") : c.nota === "Virtual" ? null : c.nota,
  }).eq("id", c.id);
  revalidatePath("/panel", "layout");
}

// ───────── Editar una clase desde el calendario ─────────
export async function moverClase(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const db = await dbProfe();
  const { data: c } = await db.from("lessons").select("*, profiles(full_name, email)").eq("id", s(form, "id")).single();
  if (!c) return { error: "No encontramos la clase." };
  const fecha = s(form, "fecha"), horaNueva = s(form, "hora");
  const duracion = duracionEntre(horaNueva, s(form, "hasta"));
  const inicio = `${fecha}T${horaNueva}:00${OFFSET}`;
  if (!fecha || !horaNueva || Number.isNaN(Date.parse(inicio))) return { error: "Elegí día y hora." };
  const mismoHorario = Date.parse(inicio) === Date.parse(c.starts_at);
  if (mismoHorario && duracion === c.duration_min) return { error: "No cambiaste nada." };
  const antes = `${hoyAR(new Date(c.starts_at)).slice(8)}/${hoyAR(new Date(c.starts_at)).slice(5, 7)} ${hora(c.starts_at)}`;
  let zoom: { id: string; joinUrl: string } | null = null;
  if (c.modality === "online") {
    zoom = await crearReunionZoom({ tema: `Clase de canto · ${c.profiles?.full_name ?? ""}`, inicio: new Date(inicio), duracionMin: duracion }).catch(() => null);
  }
  const { error } = await db.from("lessons").update({
    starts_at: inicio, duration_min: duracion, status: "reservada",
    ...(mismoHorario ? {} : { origen: "reprogramada", nota: s(form, "motivo") || `Movida desde el ${antes}` }),
    ...(zoom ? { zoom_join_url: zoom.joinUrl, zoom_meeting_id: zoom.id } : {}),
  }).eq("id", c.id);
  if (error) return { error: "Ese horario ya está ocupado por otra clase." };
  if (zoom && c.zoom_meeting_id) await borrarReunionZoom(c.zoom_meeting_id).catch(() => {});
  if (c.profiles?.email && form.get("avisar") === "on") {
    await mailClaseAgendada({ to: c.profiles.email, nombre: c.profiles.full_name.split(" ")[0], inicio, modalidad: c.modality, zoomUrl: zoom?.joinUrl ?? c.zoom_join_url, reprogramada: true }).catch(console.error);
  }
  revalidatePath("/panel", "layout");
  return { ok: "Clase movida." };
}

export async function cancelarClaseAdmin(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const db = await dbProfe();
  const { data: c } = await db.from("lessons").select("*").eq("id", s(form, "id")).single();
  if (!c) return { error: "No encontramos la clase." };
  const motivo = s(form, "motivo");
  if (!motivo) return { error: "Escribí el motivo." };
  const perdida = s(form, "tipo") === "perdida";
  await db.from("lessons").update({ status: perdida ? "perdida" : "cancelada", cancelled_at: new Date().toISOString(), nota: motivo }).eq("id", c.id);
  if (!perdida) await db.from("payments").update({ status: "anulado" }).eq("lesson_id", c.id).eq("status", "pendiente");
  if (c.zoom_meeting_id && !perdida) await borrarReunionZoom(c.zoom_meeting_id).catch(() => {});
  revalidatePath("/panel", "layout");
  return { ok: perdida ? "Marcada como perdida (se cobra igual)." : "Clase cancelada. El horario quedó libre." };
}

export async function restaurarClase(form: FormData) {
  await requireAdmin();
  const { error } = await (await dbProfe()).from("lessons").update({ status: "reservada", cancelled_at: null }).eq("id", s(form, "id"));
  if (!error) revalidatePath("/panel", "layout");
}
