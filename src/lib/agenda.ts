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
  const [{ data: disp }, { data: feriados }, { data: bloqueos }, { data: ocupadas }, { data: ausencias }, { data: extras }] = await Promise.all([
    db.from("availability").select("*").eq("active", true),
    db.from("holidays").select("date").gte("date", desde).lte("date", hasta),
    db.from("blocked_slots").select("starts_at, ends_at").lte("starts_at", hasta + "T23:59:59" + OFFSET).gte("ends_at", desde + "T00:00:00" + OFFSET),
    db.from("lessons").select("starts_at, duration_min").in("status", ["reservada", "asistio"]).gte("starts_at", desde).lte("starts_at", hasta + "T23:59:59" + OFFSET),
    db.from("ausencias").select("desde, hasta").gte("hasta", desde).lte("desde", hasta),
    db.from("horarios_extra").select("fecha, start_time").gte("fecha", desde).lte("fecha", hasta),
  ]);
  const feriado = new Set((feriados ?? []).map((f) => f.date));
  const tomado = new Set((ocupadas ?? []).map((x) => new Date(x.starts_at).getTime()));
  const bloqueado = (t: number) => (bloqueos ?? []).some((b) => Date.parse(b.starts_at) <= t && t < Date.parse(b.ends_at));
  const minimo = Date.now() + margenHoras * 3_600_000;

  const libres: string[] = [];
  for (let i = 0; i <= dias; i++) {
    const fecha = sumarDias(desde, i);
    if (feriado.has(fecha)) continue;
    if ((ausencias ?? []).some((a) => fecha >= a.desde && fecha <= a.hasta)) continue;
    const horas = new Set<string>();
    for (const d of (disp ?? []) as Disponibilidad[]) {
      if (d.weekday !== diaSemana(fecha)) continue;
      if (d.biweekly && d.biweekly_anchor) {
        const semanas = Math.round((Date.parse(fecha) - Date.parse(d.biweekly_anchor)) / (7 * DIA_MS));
        if (semanas % 2 !== 0) continue;
      }
      horas.add(d.start_time.slice(0, 5));
    }
    for (const x of extras ?? []) if (x.fecha === fecha) horas.add(x.start_time.slice(0, 5));
    for (const h of horas) {
      const iso = `${fecha}T${h}:00${OFFSET}`;
      const t = Date.parse(iso);
      const pisa = (ocupadas ?? []).some((o) => Date.parse(o.starts_at) <= t && t < Date.parse(o.starts_at) + (o.duration_min ?? 60) * 60_000);
      if (t < minimo || tomado.has(t) || bloqueado(t) || pisa) continue;
      libres.push(iso);
    }
  }
  return libres.sort();
}

export { sumarDias, diaSemana };
