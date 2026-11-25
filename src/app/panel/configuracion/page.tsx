import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConfig, getPeriodosPrecio } from "@/lib/config";
import { formatoPesos, HORAS_ELEGIBLES, hoyAR } from "@/lib/reglas";
import { FormAccion } from "@/components/FormAccion";
import { agregarAusencia, agregarDiaExtra, quitarDiaExtra, agregarFeriado, agregarHorario, borrarPrecioMes, guardarConfig, guardarPrecioMes, quitarAusencia, quitarFeriado, quitarHorario } from "@/app/actions/admin";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const nombreMes = (f: string) => `${MESES[Number(f.slice(5, 7)) - 1]} ${f.slice(0, 4)}`;

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default async function Configuracion() {
  await connection(); // la hora actual se calcula en cada visita
  const supabase = await createClient();
  const [cfg, periodos, { data: ausencias }, { data: horarios }, { data: feriados }, { data: extras }] = await Promise.all([
    getConfig(),
    getPeriodosPrecio(),
    supabase.from("ausencias").select("*").gte("hasta", hoyAR()).order("desde"),
    supabase.from("availability").select("*").eq("active", true).order("weekday").order("start_time"),
    supabase.from("holidays").select("*").gte("date", new Date().toISOString().slice(0, 10)).order("date"),
    supabase.from("horarios_extra").select("*").gte("fecha", hoyAR()).order("fecha").order("start_time"),
  ]);
  const extrasPorDia = Map.groupBy(extras ?? [], (x) => x.fecha as string);
  return (
    <>
      <h1 className="font-serif font-normal text-3xl leading-tight sm:text-4xl lg:text-5xl">Configuración</h1>
      <div className="flex flex-wrap items-start gap-6">
        <section className="tarjeta flex flex-[1_1_360px] flex-col gap-3">
          <h2 className="font-serif text-xl sm:text-2xl">Horarios que ofrecés</h2>
          <p className="text-sm">Son los horarios de clase de la semana. Los que no ocupa ningún alumno fijo (o que se liberan por una cancelación) los pueden reservar los alumnos.</p>
          {/* Un renglón por día con sus horas como chips: entra todo sin hacer bajar la página */}
          <div className="flex flex-col divide-y divide-arena">
            {[...Map.groupBy(horarios ?? [], (h) => h.weekday)].map(([dia, hs]) => (
              <div key={dia} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-start sm:gap-4">
                <strong className="w-24 shrink-0 pt-1">{DIAS[dia]}</strong>
                <div className="flex flex-wrap gap-1.5">
                  {hs.map((h) => (
                    <form key={h.id} action={quitarHorario} className="flex items-center gap-1 rounded-full bg-crema py-1 pl-3 pr-1 text-sm">
                      <input type="hidden" name="id" value={h.id} />
                      <span>{h.start_time.slice(0, 5)}{h.biweekly ? " · c/15 días" : ""}</span>
                      <button aria-label={`Quitar ${DIAS[dia]} ${h.start_time.slice(0, 5)}`} title="Quitar" className="flex size-6 items-center justify-center rounded-full text-ciruela/60 hover:bg-arena hover:text-ciruela">×</button>
                    </form>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <FormAccion action={agregarHorario} className="flex flex-wrap items-end gap-3 pt-2">
            <label className="etiqueta">Día<select name="dia" defaultValue="1" className="campo">{DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>
            <label className="etiqueta">Hora<input type="time" name="hora" required className="campo" /></label>
            <label className="flex items-center gap-2 pb-3"><input type="checkbox" name="quincenal" className="size-5 accent-petroleo" /> Cada 15 días</label>
            <label className="etiqueta">Desde (si es quincenal)<input type="date" name="desde" className="campo" /></label>
            <button className="btn-primario">Agregar</button>
          </FormAccion>
        </section>
        <section className="tarjeta flex flex-[1_1_300px] flex-col gap-3">
          <h2 className="font-serif text-xl sm:text-2xl">Feriados</h2>
          <p className="text-sm">Esos días no se puede reservar. Se recuperan en los meses de 5 clases.</p>
          {feriados?.map((f) => (
            <form key={f.date} action={quitarFeriado} className="flex items-center justify-between border-b border-arena pb-2.5">
              <input type="hidden" name="fecha" value={f.date} />
              <span><strong>{new Date(f.date + "T12:00:00").toLocaleDateString("es-AR")}</strong> · {f.name}</span>
              <button className="text-sm underline">Quitar</button>
            </form>
          ))}
          <FormAccion action={agregarFeriado} className="flex flex-wrap items-end gap-3 pt-2">
            <label className="etiqueta">Fecha<input type="date" name="fecha" required className="campo" /></label>
            <label className="etiqueta flex-1">Nombre<input name="nombre" className="campo" placeholder="Feriado" /></label>
            <button className="btn-primario">Agregar</button>
          </FormAccion>
        </section>
      </div>
      <section className="tarjeta flex flex-col gap-4">
        <h2 className="titulo text-2xl">Precios por mes</h2>
        <p className="text-sm">Cargá los precios desde el mes en que cambian. Rigen desde ese mes en adelante, hasta que cargues otros. Se usan en las cuotas, las clases sueltas, la página y los términos.</p>
        <div className="flex flex-col divide-y divide-arena">
          {periodos.length === 0 && <p className="py-2 text-sm">Todavía no cargaste precios por mes: se usan los precios base.</p>}
          {periodos.map((p) => (
            <form key={p.desde} action={borrarPrecioMes} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-3">
              <input type="hidden" name="desde" value={p.desde} />
              <strong className="w-40 first-letter:uppercase">Desde {nombreMes(p.desde)}</strong>
              <span className="text-sm">Suelta {formatoPesos(p.precios.suelta)}</span>
              <span className="text-sm">2 clases {formatoPesos(p.precios.mensual_2)}</span>
              <span className="text-sm">4 clases {formatoPesos(p.precios.mensual_4)}</span>
              <button className="ml-auto text-sm underline">Borrar</button>
            </form>
          ))}
        </div>
        <FormAccion action={guardarPrecioMes} className="grid gap-3 rounded-xl bg-crema p-3 sm:grid-cols-5 sm:items-end">
          <label className="etiqueta">Desde el mes<input type="month" name="mes" required defaultValue={new Date(Date.UTC(Number(hoyAR().slice(0, 4)), Number(hoyAR().slice(5, 7)), 1)).toISOString().slice(0, 7)} className="campo" /></label>
          <label className="etiqueta">Clase suelta ($)<input name="suelta" inputMode="numeric" required className="campo" /></label>
          <label className="etiqueta">Mensual 2 ($)<input name="mensual_2" inputMode="numeric" required className="campo" /></label>
          <label className="etiqueta">Mensual 4 ($)<input name="mensual_4" inputMode="numeric" required className="campo" /></label>
          <button className="btn-primario">Guardar</button>
        </FormAccion>
      </section>
      <section className="tarjeta flex flex-col gap-3">
        <h2 className="titulo text-2xl">Días sin clases (tus vacaciones)</h2>
        <p className="text-sm">Esos días no se generan clases ni se puede reservar. Si ya había clases, se cancelan para que las reprogrames.</p>
        {(ausencias ?? []).map((a) => (
          <form key={a.id} action={quitarAusencia} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-arena px-3 py-2">
            <input type="hidden" name="id" value={a.id} />
            <span className="text-sm"><strong>{a.desde.slice(8)}/{a.desde.slice(5, 7)} al {a.hasta.slice(8)}/{a.hasta.slice(5, 7)}</strong>{a.motivo ? ` · ${a.motivo}` : ""}</span>
            <button className="text-sm underline">Quitar</button>
          </form>
        ))}
        <FormAccion action={agregarAusencia} className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <label className="etiqueta">Desde<input type="date" name="desde" required className="campo" /></label>
          <label className="etiqueta">Hasta<input type="date" name="hasta" required className="campo" /></label>
          <label className="etiqueta">Motivo<input name="motivo" placeholder="Vacaciones" className="campo" /></label>
          <button className="btn-primario">Agregar</button>
        </FormAccion>
      </section>
      <section className="tarjeta flex flex-col gap-3">
        <h2 className="titulo text-2xl">Días extra con clases</h2>
        <p className="text-sm">Para excepciones, como los sábados de diciembre. Esos horarios aparecen libres en la agenda y los alumnos los pueden reservar, solo en esas fechas.</p>
        {[...extrasPorDia].map(([fecha, hs]) => (
          <form key={fecha} action={quitarDiaExtra} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-lila-suave px-3 py-2">
            <input type="hidden" name="fecha" value={fecha} />
            <span className="text-sm"><strong className="first-letter:uppercase">{new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "numeric" })}</strong> · {hs.map((h) => h.start_time.slice(0, 5)).join(" · ")}</span>
            <button className="text-sm underline">Quitar</button>
          </form>
        ))}
        <FormAccion action={agregarDiaExtra} className="grid gap-3 sm:grid-cols-6 sm:items-end">
          <label className="etiqueta">Desde<input type="date" name="desde" required className="campo" /></label>
          <label className="etiqueta">Hasta<input type="date" name="hasta" className="campo" /></label>
          <label className="etiqueta">Solo los<select name="dia" defaultValue="6" className="campo"><option value="">Todos los días</option>{DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>
          <label className="etiqueta">Primera clase<select name="hora_desde" required defaultValue="10:00" className="campo">{HORAS_ELEGIBLES.map((h) => <option key={h}>{h}</option>)}</select></label>
          <label className="etiqueta">Última clase<select name="hora_hasta" defaultValue="13:00" className="campo">{HORAS_ELEGIBLES.map((h) => <option key={h}>{h}</option>)}</select></label>
          <button className="btn-primario">Agregar</button>
        </FormAccion>
      </section>
      <FormAccion action={guardarConfig} className="tarjeta grid gap-4 sm:grid-cols-3">
        <h2 className="titulo text-2xl sm:col-span-3">Reglas y precios base</h2>
        <p className="text-sm sm:col-span-3">Los precios base valen para los meses que no tengan precios propios (abajo).</p>
        <label className="etiqueta">Clase suelta ($)<input name="suelta" inputMode="numeric" defaultValue={cfg.preciosBase.suelta} className="campo" /></label>
        <label className="etiqueta">Mensual 2 clases ($)<input name="mensual_2" inputMode="numeric" defaultValue={cfg.preciosBase.mensual_2} className="campo" /></label>
        <label className="etiqueta">Mensual 4 clases ($)<input name="mensual_4" inputMode="numeric" defaultValue={cfg.preciosBase.mensual_4} className="campo" /></label>
        <label className="etiqueta">La cuota vence el día<input name="vencimiento" type="number" min={1} max={28} defaultValue={cfg.diaVencimiento} className="campo" /></label>
        <label className="etiqueta">Recargo después del vencimiento (%)<input name="recargo" type="number" min={0} max={100} defaultValue={cfg.recargoPct} className="campo" /></label>
        <label className="etiqueta">Aviso mínimo para cancelar (horas)<input name="aviso" type="number" min={0} max={168} defaultValue={cfg.horasAviso} className="campo" /></label>
        <p className="text-sm sm:col-span-2">Se actualizan solos la página pública, los términos y las cuotas y clases que se generen desde ahora.</p>
        <button className="btn-primario">Guardar valores</button>
      </FormAccion>
    </>
  );
}
