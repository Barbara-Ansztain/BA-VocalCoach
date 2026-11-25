"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { profePrincipal } from "@/lib/profe";
import { mailNuevaConsulta } from "@/lib/email";

const Esquema = z.object({
  nombre: z.string().trim().min(2, "Contanos tu nombre"),
  email: z.string().trim().email("Revisá el mail"),
  telefono: z.string().trim().max(40).optional(),
  modalidad: z.enum(["Presencial", "Online", "Me da igual"]),
  experiencia: z.string().max(40).optional(),
  mensaje: z.string().trim().max(2000).optional(),
  tyc: z.literal("on", { message: "Tenés que aceptar los términos y condiciones" }),
});

export type EstadoConsulta = { ok: boolean; error?: string };

export async function enviarConsulta(_: EstadoConsulta, form: FormData): Promise<EstadoConsulta> {
  const r = Esquema.safeParse(Object.fromEntries(form));
  if (!r.success) return { ok: false, error: r.error.issues[0].message };
  const d = r.data;
  const { error } = await createAdminClient().from("consultations").insert({
    profe_id: await profePrincipal(), name: d.nombre, email: d.email, phone: d.telefono || null, modality: d.modalidad,
    experience: d.experiencia, message: d.mensaje || null, tyc_accepted_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: "No pudimos enviar la consulta. Probá de nuevo en un rato." };
  await mailNuevaConsulta({ nombre: d.nombre, email: d.email, telefono: d.telefono, mensaje: d.mensaje }).catch(() => {});
  return { ok: true };
}
