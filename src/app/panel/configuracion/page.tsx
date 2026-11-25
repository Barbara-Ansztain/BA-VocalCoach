import { createClient } from "@/lib/supabase/server";
import { formatoPesos, NOMBRE_PLAN, PRECIOS } from "@/lib/reglas";
import { FormAccion } from "@/components/FormAccion";
import { agregarFeriado, agregarHorario, quitarFeriado, quitarHorario } from "@/app/actions/admin";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default async function Configuracion() {
  const supabase = await createClient();
  const [{ data: horarios }, { data: feriados }] = await Promise.all([
    supabase.from("availability").select("*").eq("active", true).order("weekday").order("start_time"),
    supabase.from("holidays").select("*").gte("date", new Date().toISOString().slice(0, 10)).order("date"),
  ]);
  return (
    <>
      <h1 className="titulo text-4xl">Configuración</h1>
      <div className="flex flex-wrap items-start gap-6">
        <section className="tarjeta flex flex-[1_1_360px] flex-col gap-3">
          <h2 className="titulo text-2xl">Horarios que ofrecés</h2>
          {horarios?.map((h) => (
            <form key={h.id} action={quitarHorario} className="flex items-center justify-between border-b border-arena pb-2.5">
              <input type="hidden" name="id" value={h.id} />
              <span><strong>{DIAS[h.weekday]}</strong> · {h.start_time.slice(0, 5)}{h.biweekly ? " (cada 15 días)" : ""}</span>
              <button className="text-sm underline">Quitar</button>
            </form>
          ))}
          <FormAccion action={agregarHorario} className="flex flex-wrap items-end gap-3 pt-2">
            <label className="etiqueta">Día<select name="dia" className="campo">{DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>
            <label className="etiqueta">Hora<input type="time" name="hora" required className="campo" /></label>
            <label className="flex items-center gap-2 pb-3"><input type="checkbox" name="quincenal" className="size-5 accent-petroleo" /> Cada 15 días</label>
            <label className="etiqueta">Desde (si es quincenal)<input type="date" name="desde" className="campo" /></label>
            <button className="btn-primario">Agregar</button>
          </FormAccion>
        </section>
        <section className="tarjeta flex flex-[1_1_300px] flex-col gap-3">
          <h2 className="titulo text-2xl">Feriados</h2>
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
      <section className="rounded-2xl bg-menta p-6">
        <h2 className="titulo mb-2 text-2xl">Valores</h2>
        <p className="text-sm">{Object.entries(PRECIOS).map(([k, v]) => `${NOMBRE_PLAN[k as keyof typeof PRECIOS]}: ${formatoPesos(v)}`).join(" · ")}</p>
        <p className="mt-1 text-xs">Se cambian en <code>src/lib/reglas.ts</code> (y en los términos se actualizan solos).</p>
      </section>
    </>
  );
}
