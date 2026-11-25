import { redirect } from "next/navigation";
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
  active: boolean;
  created_at: string;
};

export async function getPerfil() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("user_id", auth.user.id).single();
  return (data as Perfil) ?? null;
}

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
