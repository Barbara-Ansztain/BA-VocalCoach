"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAlumno } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { horariosLibres } from "@/lib/agenda";
import { avisoATiempo, DURACION_CLASE_MIN, NOMBRE_PLAN, PRECIOS, recargoCuota } from "@/lib/reglas";
import { borrarReunionZoom, crearReunionZoom } from "@/lib/zoom";
import { mailClaseAgendada } from "@/lib/email";
import { crearPreferencia } from "@/lib/mercadopago";

const CUPO_MENSUAL = { mensual_2: 2, mensual_4: 4 } as const;

export type Resultado = { error?: string; ok?: string };

async function crearClase(alumno: Awaited<ReturnType<typeof requireAlumno>>, inicio: string, reprogramadaDe?: string) {
  const db = createAdminClient();
  let zoom: { id: string; joinUrl: string } | null = null;
  if (alumno.modality === "online") {
    zoom = await crearReunionZoom({ tema: `Clase de canto · ${alumno.full_name}`, inicio: new Date(inicio), duracionMin: DURACION_CLASE_MIN })
      .catch((e) => { console.error(e); return null; });
  }
  const { data: clase, error } = await db.from("lessons").insert({
    student_id: alumno.id, starts_at: inicio, modality: alumno.modality, duration_min: DURACION_CLASE_MIN,
    zoom_join_url: zoom?.joinUrl ?? null, zoom_meeting_id: zoom?.id ?? null, rescheduled_from: reprogramadaDe ?? null,
  }).select().single();
  if (error) {
    if (zoom) await borrarReunionZoom(zoom.id);
    return { error: "Ese horario se acaba de ocupar. Elegí otro." as const };
  }
  await mailClaseAgendada({
    to: alumno.email, nombre: alumno.full_name.split(" ")[0] || alumno.full_name, inicio,
    modalidad: alumno.modality, zoomUrl: zoom?.joinUrl, reprogramada: !!reprogramadaDe,
  }).catch(console.error);
  return { clase };
}

async function validarHorario(inicio: string) {
  const libres = await horariosLibres();
  return libres.some((l) => Date.parse(l) === Date.parse(inicio));
}

export async function reservar(_: Resultado, form: FormData): Promise<Resultado> {
  const alumno = await requireAlumno();
  const inicio = String(form.get("inicio"));
  if (!(await validarHorario(inicio))) return { error: "Ese horario ya no está disponible." };

  const db = createAdminClient();
  if (alumno.plan !== "suelta") {
    const mes = inicio.slice(0, 7);
    const { count } = await db.from("lessons").select("id", { count: "exact", head: true })
      .eq("student_id", alumno.id).in("status", ["reservada", "asistio", "perdida"])
      .gte("starts_at", `${mes}-01T00:00:00-03:00`).lt("starts_at", siguienteMes(mes));
    if ((count ?? 0) >= CUPO_MENSUAL[alumno.plan]) {
      return { error: `Ya tenés tus ${CUPO_MENSUAL[alumno.plan]} clases de ese mes. Si necesitás una extra, escribile a Barbi.` };
    }
  }

  const r = await crearClase(alumno, inicio);
  if ("error" in r) return { error: r.error };
  if (alumno.plan === "suelta") {
    await db.from("payments").insert({ student_id: alumno.id, kind: "suelta", lesson_id: r.clase.id, amount: PRECIOS.suelta });
  }
  revalidatePath("/alumno");
  redirect("/alumno?reservada=1");
}

function siguienteMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m, 1));
  return `${d.toISOString().slice(0, 7)}-01T00:00:00-03:00`;
}

async function claseDelAlumno(id: string, alumnoId: string) {
  const { data } = await createAdminClient().from("lessons").select("*").eq("id", id).eq("student_id", alumnoId).single();
  return data;
}

/** Cancelar: con 24 h o más se puede recuperar; con menos, la clase se pierde (mensual) o se abona igual (suelta). */
export async function cancelar(form: FormData) {
  const alumno = await requireAlumno();
  const clase = await claseDelAlumno(String(form.get("id")), alumno.id);
  if (!clase || clase.status !== "reservada") return;
  const db = createAdminClient();
  const aTiempo = avisoATiempo(clase.starts_at);
  await db.from("lessons").update({ status: aTiempo ? "cancelada" : "perdida", cancelled_at: new Date().toISOString() }).eq("id", clase.id);
  if (aTiempo) {
    if (clase.zoom_meeting_id) await borrarReunionZoom(clase.zoom_meeting_id).catch(() => {});
    // Clase suelta cancelada a tiempo: no se cobra.
    await db.from("payments").update({ status: "anulado" }).eq("lesson_id", clase.id).eq("status", "pendiente");
  }
  revalidatePath("/alumno");
}

export async function reprogramar(_: Resultado, form: FormData): Promise<Resultado> {
  const alumno = await requireAlumno();
  const clase = await claseDelAlumno(String(form.get("id")), alumno.id);
  const inicio = String(form.get("inicio"));
  if (!clase || clase.status !== "reservada") return { error: "No encontramos esa clase." };
  if (!avisoATiempo(clase.starts_at)) return { error: "Falta menos de 24 h: ya no se puede reprogramar." };
  if (!(await validarHorario(inicio))) return { error: "Ese horario ya no está disponible." };

  const db = createAdminClient();
  await db.from("lessons").update({ status: "reprogramada", cancelled_at: new Date().toISOString() }).eq("id", clase.id);
  const r = await crearClase(alumno, inicio, clase.id);
  if ("error" in r) {
    await db.from("lessons").update({ status: "reservada", cancelled_at: null }).eq("id", clase.id);
    return { error: r.error };
  }
  if (clase.zoom_meeting_id) await borrarReunionZoom(clase.zoom_meeting_id).catch(() => {});
  await db.from("payments").update({ lesson_id: r.clase.id }).eq("lesson_id", clase.id);
  revalidatePath("/alumno");
  redirect("/alumno?reprogramada=1");
}

async function pagoDelAlumno(id: string, alumnoId: string) {
  const { data } = await createAdminClient().from("payments").select("*").eq("id", id).eq("student_id", alumnoId).single();
  return data;
}

export async function pagarConMercadoPago(form: FormData) {
  const alumno = await requireAlumno();
  const pago = await pagoDelAlumno(String(form.get("id")), alumno.id);
  if (!pago || pago.status !== "pendiente") return;
  const recargo = pago.kind === "mensual" && pago.period ? recargoCuota(pago.amount, pago.period) : 0;
  const titulo = pago.kind === "mensual" ? `Cuota ${pago.period} · ${NOMBRE_PLAN[alumno.plan]}` : "Clase suelta de canto";
  const pref = await crearPreferencia({ pagoId: pago.id, titulo, monto: pago.amount + recargo, email: alumno.email });
  await createAdminClient().from("payments").update({ mp_preference_id: pref.id, surcharge: recargo }).eq("id", pago.id);
  redirect(pref.url);
}

const TIPOS_COMPROBANTE = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function subirComprobante(_: Resultado, form: FormData): Promise<Resultado> {
  const alumno = await requireAlumno();
  const pago = await pagoDelAlumno(String(form.get("id")), alumno.id);
  const archivo = form.get("archivo");
  if (!pago || pago.status !== "pendiente") return { error: "Ese pago ya no está pendiente." };
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elegí el comprobante." };
  if (!TIPOS_COMPROBANTE.includes(archivo.type) || archivo.size > 10_000_000) return { error: "Subí una imagen o PDF de hasta 10 MB." };
  const db = createAdminClient();
  const ruta = `${alumno.id}/${pago.id}-${Date.now()}.${archivo.name.split(".").pop()}`;
  const { error } = await db.storage.from("comprobantes").upload(ruta, archivo, { contentType: archivo.type });
  if (error) return { error: "No se pudo subir el archivo." };
  const recargo = pago.kind === "mensual" && pago.period ? recargoCuota(pago.amount, pago.period) : 0;
  await db.from("payments").update({ status: "en_revision", method: "transferencia", receipt_path: ruta, surcharge: recargo }).eq("id", pago.id);
  revalidatePath("/alumno/pagos");
  return { ok: "¡Listo! Barbi lo va a confirmar." };
}

export async function subirGrabacion(_: Resultado, form: FormData): Promise<Resultado> {
  const alumno = await requireAlumno();
  const archivo = form.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elegí un audio." };
  if (!archivo.type.startsWith("audio/") || archivo.size > 30_000_000) return { error: "Subí un audio de hasta 30 MB." };
  const db = createAdminClient();
  const ruta = `${alumno.id}/${Date.now()}.${archivo.name.split(".").pop()}`;
  const { error } = await db.storage.from("grabaciones").upload(ruta, archivo, { contentType: archivo.type });
  if (error) return { error: "No se pudo subir el audio." };
  await db.from("recordings").insert({ student_id: alumno.id, file_path: ruta, title: String(form.get("titulo") || "") || null });
  revalidatePath("/alumno/grabaciones");
  return { ok: "Grabación subida." };
}
