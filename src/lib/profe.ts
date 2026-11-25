import { cache } from "react";
import { getPerfil } from "./auth";
import { createAdminClient } from "./supabase/server";

/** La profe "dueña" de la página pública (Barbi). */
export const profePrincipal = cache(async (): Promise<string> => {
  const { data } = await createAdminClient().from("profiles").select("id").eq("es_principal", true).single();
  return data?.id ?? "";
});

/** La profe de quien está logueado (la admin es su propia profe; un alumno, la de su profe). Sin sesión: la principal. */
export const profeActual = cache(async (): Promise<string> => (await getPerfil())?.profe_id ?? profePrincipal());
