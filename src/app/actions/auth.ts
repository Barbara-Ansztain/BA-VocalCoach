"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EstadoForm = { error?: string; ok?: string };

export async function ingresar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email")), password: String(form.get("password")),
  });
  if (error) return { error: "Mail o contraseña incorrectos." };
  const next = String(form.get("next") || "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/alumno");
}

export async function recuperar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(String(form.get("email")), {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/bienvenida`,
  });
  return { ok: "Si el mail está registrado, te llega un link para crear una contraseña nueva." };
}

/** Primer ingreso (invitación) o recuperación: crea contraseña y acepta TyC. */
export async function completarBienvenida(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/ingresar");
  if (form.get("tyc") !== "on") return { error: "Tenés que aceptar los términos y condiciones." };
  const password = String(form.get("password") ?? "");
  const nombre = String(form.get("nombre") ?? "").trim();
  if (password.length < 8) return { error: "La contraseña tiene que tener al menos 8 caracteres." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "No pudimos guardar la contraseña. Probá de nuevo." };
  // La aceptación de TyC la guarda el servidor con permisos de admin, previa validación de sesión.
  const { createAdminClient } = await import("@/lib/supabase/server");
  await createAdminClient().from("profiles").update({
    tyc_accepted_at: new Date().toISOString(), ...(nombre ? { full_name: nombre } : {}),
  }).eq("user_id", data.user.id);
  redirect("/alumno");
}

export async function salir() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
