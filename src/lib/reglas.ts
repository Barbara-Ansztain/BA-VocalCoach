// Reglas del negocio de BA - Vocal Coach. Cambiar acá si cambian precios o pautas.

export const PRECIOS = {
  suelta: 50_000,
  mensual_2: 100_000,
  mensual_4: 155_000,
} as const;

export type Plan = keyof typeof PRECIOS;

export const NOMBRE_PLAN: Record<Plan, string> = {
  suelta: "Clase suelta",
  mensual_2: "Mensual · 2 clases",
  mensual_4: "Mensual · 4 clases",
};

export const DURACION_CLASE_MIN = 60;
export const HORAS_MINIMAS_AVISO = 24;
export const DIA_VENCIMIENTO_CUOTA = 10;
export const RECARGO = 0.1;
export const ZONA = "America/Argentina/Buenos_Aires";
export const OFFSET = "-03:00"; // Argentina no tiene horario de verano

export function formatoPesos(n: number) {
  return "$" + n.toLocaleString("es-AR");
}

/** ¿Faltan al menos 24 h (reloj) para la clase? */
export function avisoATiempo(startsAt: Date | string, ahora = new Date()) {
  const ms = new Date(startsAt).getTime() - ahora.getTime();
  return ms >= HORAS_MINIMAS_AVISO * 60 * 60 * 1000;
}

/** Fecha de hoy en Buenos Aires, como YYYY-MM-DD. */
export function hoyAR(ahora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(ahora);
}

export function periodoActual(ahora = new Date()) {
  return hoyAR(ahora).slice(0, 7); // YYYY-MM
}

/** Recargo de una cuota mensual impaga: 10% desde el día 11 del mes de la cuota (o cualquier día de un mes posterior). */
export function recargoCuota(monto: number, periodo: string, ahora = new Date()) {
  const hoy = hoyAR(ahora);
  const [hoyPeriodo, dia] = [hoy.slice(0, 7), Number(hoy.slice(8, 10))];
  const vencida = hoyPeriodo > periodo || (hoyPeriodo === periodo && dia > DIA_VENCIMIENTO_CUOTA);
  return vencida ? Math.round(monto * RECARGO) : 0;
}

export function fechaHora(d: Date | string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}

export function hora(d: Date | string) {
  return new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}

/** ISO de hace `horas` horas (para filtrar clases en curso). */
export function haceHoras(horas: number) {
  return new Date(Date.now() - horas * 3_600_000).toISOString();
}
