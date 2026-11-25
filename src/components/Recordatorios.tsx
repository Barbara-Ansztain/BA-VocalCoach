import Link from "next/link";
import { FormAccion } from "./FormAccion";
import { agregarRecordatorio, marcarRecordatorio } from "@/app/actions/admin";

type Recordatorio = { id: string; texto: string; fecha: string | null; hecho: boolean; student_id: string | null; profiles?: { full_name: string } | null };

/** Lista de recordatorios con casilla para tachar y formulario para agregar. */
export function Recordatorios({ items, alumnos, alumnoFijo }: {
  items: Recordatorio[]; alumnos?: { id: string; full_name: string }[]; alumnoFijo?: string;
}) {
  return (
    <section data-tour="recordatorios" className="tarjeta flex flex-col gap-3">
      <h2 className="font-serif text-2xl">Recordatorios</h2>
      {!items.length && <p className="text-sm">No tenés recordatorios pendientes.</p>}
      {items.map((r) => (
        <form key={r.id} action={marcarRecordatorio} className="flex items-start gap-3">
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="hecho" value={r.hecho ? "0" : "1"} />
          <button aria-label={r.hecho ? "Marcar como pendiente" : "Marcar como hecho"}
            className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border-2 ${r.hecho ? "border-petroleo bg-petroleo text-white" : "border-lila"}`}>
            {r.hecho && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>}
          </button>
          <p className={`text-[15px] ${r.hecho ? "text-ciruela/50 line-through" : ""}`}>
            {r.texto}
            {r.fecha && <span className="ml-2 chip bg-arena">{r.fecha.slice(8)}/{r.fecha.slice(5, 7)}</span>}
            {!alumnoFijo && r.student_id && r.profiles && (
              <Link href={`/panel/alumnos/${r.student_id}`} className="ml-2 chip bg-menta text-ciruela">{r.profiles.full_name}</Link>
            )}
          </p>
        </form>
      ))}
      <FormAccion action={agregarRecordatorio} className="mt-1 flex flex-wrap gap-2">
        <input name="texto" placeholder="Nuevo recordatorio…" aria-label="Nuevo recordatorio" className="campo flex-1" />
        <button className="btn-secundario">Agregar</button>
        {alumnoFijo ? <input type="hidden" name="alumno" value={alumnoFijo} /> : (
          <details className="w-full text-sm">
            <summary className="cursor-pointer text-ciruela/70">Asociar a un alumno o una fecha</summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <select name="alumno" defaultValue="" aria-label="Alumno (opcional)" className="campo py-2 text-sm">
                <option value="">Sin alumno</option>
                {alumnos?.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
              <input type="date" name="fecha" aria-label="Fecha (opcional)" className="campo py-2 text-sm" />
            </div>
          </details>
        )}
      </FormAccion>
    </section>
  );
}
