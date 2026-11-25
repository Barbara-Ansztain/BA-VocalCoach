import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "./supabase/server";

export type Perfil = {
  id: string;
  user_id: string | null;
  role: "admin" | "alumno";
  full_name: string;
  email: string | null;
  phone: string | null;
  plan: "suelta" | "mensual_2" | "mensual_4";
  modality: "presencial" | "online";
  usual_weekday: number | null;
  usual_time: string | null;
  biweekly: boolean;
  biweekly_anchor: string | null;
  notes: string | null;
  tyc_accepted_at: string | null;
  tour_completed_at: string | null;
  profe_id: string | null;
  active: boolean;
  created_at: string;
};

/** Una sola consulta por pedido (layout y página la comparten). getClaims valida el token sin ir a Supabase Auth cuando puede. */
export const getPerfil = cache(async () => {
  await connection(); // depende de la sesión: siempre se calcula en el pedido, nunca al armar la página
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;
  const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
  return (data as Perfil) ?? null;
});

export async function requireAdmin() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/ingresar");
  if (perfil.role !== "admin") redirect("/alumno");
  return perfil;
}

export async function requireAlumno() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/ingresar");
  if (perfil.role === "admin") redirect("/panel");
  if (!perfil.tyc_accepted_at) redirect("/bienvenida");
  return perfil;
}
