import { createAdminClient } from "./supabase/server";
import { hoyAR, type Plan } from "./reglas";
import { profeActual } from "./profe";

export type Precios = Record<Plan, number>;

export type Config = {
  /** Precios del mes en curso (o los base si no hay ninguno cargado por mes). */
  precios: Precios;
  /** Precios base de Configuración, que valen mientras no haya precios por mes. */
  preciosBase: Precios;
  recargoPct: number;
  diaVencimiento: number;
  horasAviso: number;
};

export type PeriodoPrecio = { desde: string; precios: Precios };

export const CONFIG_INICIAL: Config = {
  precios: { suelta: 50_000, mensual_2: 100_000, mensual_4: 155_000 },
  preciosBase: { suelta: 50_000, mensual_2: 100_000, mensual_4: 155_000 },
  recargoPct: 10,
  diaVencimiento: 5,
  horasAviso: 24,
};

/** Precios por mes que cargó Barbi (de más viejo a más nuevo). */
export async function getPeriodosPrecio(profe?: string): Promise<PeriodoPrecio[]> {
  const id = profe ?? (await profeActual());
  const { data } = await createAdminClient().from("price_periods").select("*").eq("profe_id", id).order("desde");
  return (data ?? []).map((p) => ({ desde: p.desde, precios: { suelta: p.precio_suelta, mensual_2: p.precio_mensual_2, mensual_4: p.precio_mensual_4 } }));
}

function preciosEn(fecha: string, base: Precios, periodos: PeriodoPrecio[]): Precios {
  const vigente = periodos.filter((p) => p.desde <= fecha).at(-1);
  return vigente?.precios ?? base;
}

/** Precios que rigen en una fecha (YYYY-MM-DD) o un mes (YYYY-MM). */
export async function getPrecios(fecha: string, profe?: string): Promise<Precios> {
  const id = profe ?? (await profeActual());
  const [cfg, periodos] = await Promise.all([getConfig(id), getPeriodosPrecio(id)]);
  return preciosEn(fecha.length === 7 ? `${fecha}-01` : fecha.slice(0, 10), cfg.preciosBase, periodos);
}

/** Reglas de Configuración, con los precios del mes en curso. */
export async function getConfig(profe?: string): Promise<Config> {
  const id = profe ?? (await profeActual());
  const db = createAdminClient();
  const [{ data }, { data: periodos }] = await Promise.all([
    db.from("settings").select("*").eq("profe_id", id).maybeSingle(),
    db.from("price_periods").select("*").eq("profe_id", id).lte("desde", hoyAR()).order("desde", { ascending: false }).limit(1),
  ]);
  if (!data) return CONFIG_INICIAL;
  const base = { suelta: data.precio_suelta, mensual_2: data.precio_mensual_2, mensual_4: data.precio_mensual_4 };
  const p = periodos?.[0];
  return {
    precios: p ? { suelta: p.precio_suelta, mensual_2: p.precio_mensual_2, mensual_4: p.precio_mensual_4 } : base,
    preciosBase: base,
    recargoPct: data.recargo_pct,
    diaVencimiento: data.dia_vencimiento,
    horasAviso: data.horas_aviso,
  };
}
