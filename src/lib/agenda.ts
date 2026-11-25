import { createAdminClient } from "./supabase/server";
import { hoyAR, OFFSET } from "./reglas";

export type Disponibilidad = { id: string; weekday: number; start_time: string; biweekly: boolean; biweekly_anchor: string | null; active: boolean };

const DIA_MS = 86_400_000;

function sumarDias(fecha: string, n: number) {
  return new Date(Date.parse(fecha + "T12:00:00Z") + n * DIA_MS).toISOString().slice(0, 10);
}
function diaSemana(fecha: string) {
  return new Date(fecha + "T12:00:00Z").getUTCDay();
}

/** Horarios libres de los próximos `dias` días, como ISO con zona -03:00. */
export async function horariosLibres(dias = 21, margenHoras = 2) {
  const db = createAdminClient();
  const desde = hoyAR();
  const hasta = sumarDias(desde, dias);
  const [{ data: disp }, { data: feriados }, { data: bloqueos }, { data: ocupadas }] = await Promise.all([
    db.from("availability").select("*").eq("active", true),
    db.from("holidays").select("date").gte("date", desde).lte("date", hasta),
    db.from("blocked_slots").select("starts_at").gte("starts_at", desde).lte("starts_at", hasta + "T23:59:59" + OFFSET),
    db.from("lessons").select("starts_at").in("status", ["reservada", "asistio"]).gte("starts_at", desde).lte("starts_at", hasta + "T23:59:59" + OFFSET),
  ]);
  const feriado = new Set((feriados ?? []).map((f) => f.date));
  const tomado = new Set([...(bloqueos ?? []), ...(ocupadas ?? [])].map((x) => new Date(x.starts_at).getTime()));
  const minimo = Date.now() + margenHoras * 3_600_000;

  const libres: string[] = [];
  for (let i = 0; i <= dias; i++) {
    const fecha = sumarDias(desde, i);
    if (feriado.has(fecha)) continue;
    for (const d of (disp ?? []) as Disponibilidad[]) {
      if (d.weekday !== diaSemana(fecha)) continue;
      if (d.biweekly && d.biweekly_anchor) {
        const semanas = Math.round((Date.parse(fecha) - Date.parse(d.biweekly_anchor)) / (7 * DIA_MS));
        if (semanas % 2 !== 0) continue;
      }
      const iso = `${fecha}T${d.start_time.slice(0, 5)}:00${OFFSET}`;
      const t = Date.parse(iso);
      if (t < minimo || tomado.has(t)) continue;
      libres.push(iso);
    }
  }
  return libres.sort();
}

export { sumarDias, diaSemana };
