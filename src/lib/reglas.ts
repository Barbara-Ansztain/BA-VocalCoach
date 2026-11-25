// Reglas del negocio de BA - Vocal Coach. Cambiar acá si cambian precios o pautas.

export type Plan = "suelta" | "mensual_2" | "mensual_4";

export const NOMBRE_PLAN: Record<Plan, string> = {
  suelta: "Clase suelta",
  mensual_2: "Mensual · 2 clases",
  mensual_4: "Mensual · 4 clases",
};

type Reglas = { recargoPct: number; diaVencimiento: number; horasAviso: number };

export const DURACION_CLASE_MIN = 60;
export const ZONA = "America/Argentina/Buenos_Aires";
export const OFFSET = "-03:00"; // Argentina no tiene horario de verano

const DIAS_LARGOS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export type HorarioFijo = { id?: string; weekday: number; start_time: string; biweekly: boolean; biweekly_anchor?: string | null; duration_min?: number };

/** "Lunes 18:00 y Viernes 18:00", "Miércoles 19:00 · cada 15 días" o "A coordinar". */
export function horarioFijo(horarios: HorarioFijo[] | null | undefined) {
  if (!horarios?.length) return "A coordinar";
  return [...horarios]
    .sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time))
    .map((h) => `${DIAS_LARGOS[h.weekday]} ${h.start_time.slice(0, 5)}${h.duration_min && h.duration_min !== 60 ? `–${sumarMinutos(h.start_time.slice(0, 5), h.duration_min)}` : ""}${h.biweekly ? " · cada 15 días" : ""}`)
    .join(" y ");
}

export function formatoPesos(n: number) {
  return "$" + n.toLocaleString("es-AR");
}

/** ¿Se avisó con la anticipación mínima (24 h reloj por defecto)? */
export function avisoATiempo(startsAt: Date | string, cfg: Pick<Reglas, "horasAviso">, ahora = new Date()) {
  const ms = new Date(startsAt).getTime() - ahora.getTime();
  return ms >= cfg.horasAviso * 60 * 60 * 1000;
}

/** Fecha de hoy en Buenos Aires, como YYYY-MM-DD. */
export function hoyAR(ahora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(ahora);
}

export function periodoActual(ahora = new Date()) {
  return hoyAR(ahora).slice(0, 7); // YYYY-MM
}

/** Recargo de una cuota mensual impaga: desde el día siguiente al vencimiento (o cualquier día de un mes posterior). */
export function recargoCuota(monto: number, periodo: string, cfg: Pick<Reglas, "recargoPct" | "diaVencimiento">, ahora = new Date()) {
  const hoy = hoyAR(ahora);
  const [hoyPeriodo, dia] = [hoy.slice(0, 7), Number(hoy.slice(8, 10))];
  const vencida = hoyPeriodo > periodo || (hoyPeriodo === periodo && dia > cfg.diaVencimiento);
  return vencida ? Math.round((monto * cfg.recargoPct) / 100) : 0;
}

export function fechaHora(d: Date | string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(d));
}

/** Hora en formato 24 h ("14:30"), igual en cualquier compu. */
export function hora(d: Date | string) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(d));
  return `${p.find((x) => x.type === "hour")!.value}:${p.find((x) => x.type === "minute")!.value}`;
}

/** ISO de hace `horas` horas (para filtrar clases en curso). */
export function haceHoras(horas: number) {
  return new Date(Date.now() - horas * 3_600_000).toISOString();
}

export function msAhora() {
  return Date.now();
}

/** Horas para elegir en los formularios: de 8:00 a 22:00 cada 30 minutos. */
export const HORAS_ELEGIBLES = Array.from({ length: 29 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

const MESES_CORTOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Texto para mostrar un pago: su concepto, o "Cuota de noviembre 2026" / "Clase suelta". */
export function conceptoPago(p: { kind: string; period: string | null; concepto?: string | null }) {
  if (p.concepto) return p.concepto;
  if (p.kind === "mensual" && p.period) return `Cuota de ${MESES_CORTOS[Number(p.period.slice(5, 7)) - 1]} ${p.period.slice(0, 4)}`;
  if (p.kind === "suelta") return "Clase suelta";
  return "Otro cargo";
}

/** "16:30" + 90 → "18:00" */
export function sumarMinutos(hhmm: string, min: number) {
  const t = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5)) + min;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** Minutos entre "desde" y "hasta" (si no hay "hasta", 60). */
export function duracionEntre(desde: string, hasta: string) {
  if (!hasta) return 60;
  const m = (x: string) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3, 5));
  const d = m(hasta) - m(desde);
  return d >= 15 && d <= 240 ? d : 60;
}

/** Horas para "hasta": de 8:30 a 23:00 cada 30 minutos. */
export const HORAS_FIN = Array.from({ length: 30 }, (_, i) => sumarMinutos("08:30", i * 30));
