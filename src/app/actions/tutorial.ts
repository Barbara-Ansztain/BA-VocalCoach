"use server";

import { getPerfil } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export async function terminarTutorial() {
  const perfil = await getPerfil();
  if (!perfil || perfil.tour_completed_at) return;
  await createAdminClient().from("profiles").update({ tour_completed_at: new Date().toISOString() }).eq("id", perfil.id);
}
