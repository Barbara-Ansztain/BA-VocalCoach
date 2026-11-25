"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";

export type EstadoPrimerUso = { error?: string };

/** ¿Ya existe una administradora? Mientras no exista, /primer-uso permite crearla. */
export async function hayAdmin() {
  const { count } = await createAdminClient().from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return (count ?? 0) > 0;
}

export async function crearAdmin(_: EstadoPrimerUso, form: FormData): Promise<EstadoPrimerUso> {
  if (await hayAdmin()) return { error: "Ya hay una cuenta de administración. Ingresá desde /ingresar." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const nombre = String(form.get("nombre") ?? "").trim() || "Barbi Ansztain";
  if (!email.includes("@")) return { error: "Revisá el mail." };
  if (password.length < 8) return { error: "La contraseña tiene que tener al menos 8 caracteres." };
  const db = createAdminClient();
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: nombre } });
  if (error || !data.user) return { error: "No se pudo crear la cuenta: " + (error?.message ?? "error desconocido") };
  await db.from("profiles").update({
    role: "admin", full_name: nombre, plan: "suelta", tyc_accepted_at: new Date().toISOString(),
  }).eq("user_id", data.user.id);
  redirect("/ingresar?next=/panel&creada=1");
}
