"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { DURACION_CLASE_MIN, OFFSET, periodoActual, PRECIOS, recargoCuota, type Plan } from "@/lib/reglas";
import { crearReunionZoom } from "@/lib/zoom";
import { mailClaseAgendada } from "@/lib/email";

type Resultado = { error?: string; ok?: string };
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// ───────── Clases ─────────
export async function marcarClase(form: FormData) {
  await requireAdmin();
  const estado = s(form, "estado");
  if (!["asistio", "perdida", "cancelada", "reservada"].includes(estado)) return;
  await createAdminClient().from("lessons").update({ status: estado }).eq("id", s(form, "id"));
  revalidatePath("/panel", "layout");
}

export async function crearTurno(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const db = createAdminClient();
  const { data: alumno } = await db.from("profiles").select("*").eq("id", s(form, "alumno")).single();
  if (!alumno) return { error: "Elegí un alumno." };
  const inicio = `${s(form, "fecha")}T${s(form, "hora")}:00${OFFSET}`;
  if (Number.isNaN(Date.parse(inicio))) return { error: "Revisá la fecha y la hora." };
  const zoom = alumno.modality === "online"
    ? await crearReunionZoom({ tema: `Clase de canto · ${alumno.full_name}`, inicio: new Date(inicio), duracionMin: DURACION_CLASE_MIN }).catch(() => null)
    : null;
  const { data: clase, error } = await db.from("lessons").insert({
    student_id: alumno.id, starts_at: inicio, modality: alumno.modality, zoom_join_url: zoom?.joinUrl ?? null, zoom_meeting_id: zoom?.id ?? null,
  }).select().single();
  if (error) return { error: "Ese horario ya está ocupado." };
  if (alumno.plan === "suelta") await db.from("payments").insert({ student_id: alumno.id, kind: "suelta", lesson_id: clase.id, amount: PRECIOS.suelta });
  await mailClaseAgendada({ to: alumno.email, nombre: alumno.full_name.split(" ")[0], inicio, modalidad: alumno.modality, zoomUrl: zoom?.joinUrl }).catch(console.error);
  revalidatePath("/panel", "layout");
  return { ok: "Turno creado y mail enviado." };
}

export async function bloquearHorario(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const inicio = `${s(form, "fecha")}T${s(form, "hora")}:00${OFFSET}`;
  await createAdminClient().from("blocked_slots").insert({ starts_at: inicio, reason: s(form, "motivo") || null });
  revalidatePath("/panel/agenda");
  return { ok: "Horario bloqueado." };
}

// ───────── Pagos ─────────
export async function confirmarPago(form: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const { data: p } = await db.from("payments").select("*").eq("id", s(form, "id")).single();
  if (!p) return;
  const metodo = s(form, "metodo") || p.method || "efectivo";
  const surcharge = p.status === "pendiente" && p.kind === "mensual" && p.period ? recargoCuota(p.amount, p.period) : p.surcharge;
  await db.from("payments").update({ status: "pagado", method: metodo, surcharge, paid_at: new Date().toISOString() }).eq("id", p.id);
  revalidatePath("/panel", "layout");
}

export async function rechazarComprobante(form: FormData) {
  await requireAdmin();
  await createAdminClient().from("payments").update({ status: "pendiente", method: null }).eq("id", s(form, "id"));
  revalidatePath("/panel/pagos");
}

/** Crea las cuotas del mes para cada alumno con plan mensual que todavía no la tenga. */
export async function generarCuotas() {
  await requireAdmin();
  const db = createAdminClient();
  const periodo = periodoActual();
  const { data: alumnos } = await db.from("profiles").select("id, plan").eq("role", "alumno").eq("active", true).neq("plan", "suelta");
  const filas = (alumnos ?? []).map((a) => ({ student_id: a.id, kind: "mensual", period: periodo, amount: PRECIOS[a.plan as Plan] }));
  if (filas.length) await db.from("payments").upsert(filas, { onConflict: "student_id,period", ignoreDuplicates: true });
  revalidatePath("/panel", "layout");
}

// ───────── Consultas y alumnos ─────────
export async function darAcceso(form: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const { data: c } = await db.from("consultations").select("*").eq("id", s(form, "id")).single();
  if (!c) return;
  const { data, error } = await db.auth.admin.inviteUserByEmail(c.email, {
    data: { full_name: c.name },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/bienvenida`,
  });
  if (error || !data.user) { console.error(error); return; }
  await db.from("profiles").update({
    full_name: c.name, phone: c.phone, modality: c.modality === "Online" ? "online" : "presencial",
    plan: (s(form, "plan") || "suelta") as Plan,
  }).eq("id", data.user.id);
  await db.from("consultations").update({ status: "alumno" }).eq("id", c.id);
  revalidatePath("/panel", "layout");
}

export async function estadoConsulta(form: FormData) {
  await requireAdmin();
  await createAdminClient().from("consultations").update({ status: s(form, "estado") }).eq("id", s(form, "id"));
  revalidatePath("/panel", "layout");
}

export async function guardarAlumno(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const { error } = await createAdminClient().from("profiles").update({
    full_name: s(form, "nombre"), phone: s(form, "telefono") || null, plan: s(form, "plan"),
    modality: s(form, "modalidad"), usual_slot: s(form, "horario") || null, active: form.get("activo") === "on",
  }).eq("id", s(form, "id"));
  revalidatePath("/panel/alumnos", "layout");
  return error ? { error: "No se pudo guardar." } : { ok: "Guardado." };
}

export async function agregarNota(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const cuerpo = s(form, "nota");
  if (!cuerpo) return { error: "Escribí la nota." };
  await createAdminClient().from("lesson_notes").insert({ student_id: s(form, "id"), body: cuerpo });
  revalidatePath("/panel/alumnos", "layout");
  return { ok: "Nota guardada." };
}

export async function comentarGrabacion(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  await createAdminClient().from("recordings").update({ comment: s(form, "comentario"), commented_at: new Date().toISOString() }).eq("id", s(form, "id"));
  revalidatePath("/panel/alumnos", "layout");
  return { ok: "Comentario enviado." };
}

// ───────── Material ─────────
export async function subirMaterial(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const db = createAdminClient();
  const archivo = form.get("archivo");
  let ruta: string | null = null;
  if (archivo instanceof File && archivo.size > 0) {
    ruta = `${Date.now()}-${archivo.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await db.storage.from("material").upload(ruta, archivo, { contentType: archivo.type });
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
  await createAdminClient().from("material_assignments").upsert(alumnos.map((a) => ({ material_id: material, student_id: a })), { ignoreDuplicates: true });
  revalidatePath("/panel", "layout");
  return { ok: "Asignado." };
}

// ───────── Configuración ─────────
export async function agregarHorario(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  const quincenal = form.get("quincenal") === "on";
  await createAdminClient().from("availability").insert({
    weekday: Number(s(form, "dia")), start_time: s(form, "hora"), biweekly: quincenal, biweekly_anchor: quincenal ? s(form, "desde") || null : null,
  });
  revalidatePath("/panel/configuracion");
  return { ok: "Horario agregado." };
}

export async function quitarHorario(form: FormData) {
  await requireAdmin();
  await createAdminClient().from("availability").update({ active: false }).eq("id", s(form, "id"));
  revalidatePath("/panel/configuracion");
}

export async function agregarFeriado(_: Resultado, form: FormData): Promise<Resultado> {
  await requireAdmin();
  await createAdminClient().from("holidays").upsert({ date: s(form, "fecha"), name: s(form, "nombre") || "Feriado" });
  revalidatePath("/panel", "layout");
  return { ok: "Feriado agregado." };
}

export async function quitarFeriado(form: FormData) {
  await requireAdmin();
  await createAdminClient().from("holidays").delete().eq("date", s(form, "fecha"));
  revalidatePath("/panel", "layout");
}
