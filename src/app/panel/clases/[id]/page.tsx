import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fechaHora, hora, HORAS_ELEGIBLES, HORAS_FIN, hoyAR, sumarMinutos } from "@/lib/reglas";
import { FormAccion } from "@/components/FormAccion";
import { Estado } from "@/components/Estado";
import { cambiarModalidad, cancelarClaseAdmin, etiquetarClase, marcarClase, moverClase, restaurarClase } from "@/app/actions/admin";

const ETIQUETAS = ["A reprogramar", "Tentativa", "Clase de prueba", "Virtual", "Recupera feriado"];
const MOTIVOS = ["Feriado", "Me enfermé", "El alumno avisó con tiempo", "Viaje", "Otro"];

export default async function Clase({ params }: PageProps<"/panel/clases/[id]">) {
  await connection();
  const { id } = await params;
  const supabase = await createClient();
  const { data: c } = await supabase.from("lessons").select("*, profiles(id, full_name, email, phone, plan)").eq("id", id).single();
  if (!c) notFound();
  const fecha = hoyAR(new Date(c.starts_at));
  const activa = c.status === "reservada" || c.status === "asistio";

  return (
    <>
      <Link href={`/panel/agenda?vista=dia&fecha=${fecha}`} className="text-sm">← Volver a la agenda</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide">Clase</p>
          <h1 className="mt-1 font-serif text-3xl leading-tight first-letter:uppercase sm:text-4xl">{fechaHora(c.starts_at)}{c.duration_min !== 60 ? ` a ${sumarMinutos(hora(c.starts_at), c.duration_min)}` : ""}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <Link href={`/panel/alumnos/${c.student_id}`} className="font-bold">{c.profiles?.full_name}</Link>
            <Estado valor={c.status} />
            <span className="chip bg-arena">{c.modality === "online" ? "Online" : "Presencial"}</span>
            {c.origen === "reprogramada" && <span className="chip bg-[#DCCBEA]">Reprogramada</span>}
            {c.nota && <span className="chip bg-[#FBE3C8]">{c.nota}</span>}
          </p>
        </div>
        {c.zoom_join_url && <a href={c.zoom_join_url} target="_blank" rel="noreferrer" className="btn-primario">Abrir Zoom</a>}
      </header>

      {activa ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <FormAccion action={moverClase} className="tarjeta grid gap-3 sm:grid-cols-2">
            <h2 className="font-serif text-2xl sm:col-span-2">Cambiar día, hora o duración</h2>
            <input type="hidden" name="id" value={c.id} />
            <label className="etiqueta">Día<input type="date" name="fecha" required defaultValue={fecha} className="campo" /></label>
            <label className="etiqueta">Desde
              <select name="hora" required defaultValue={hora(c.starts_at)} className="campo">
                {[...new Set([hora(c.starts_at), ...HORAS_ELEGIBLES])].sort().map((h) => <option key={h}>{h}</option>)}
              </select>
            </label>
            <label className="etiqueta sm:col-span-2">Hasta
              <select name="hasta" defaultValue={sumarMinutos(hora(c.starts_at), c.duration_min)} className="campo">
                {[...new Set([sumarMinutos(hora(c.starts_at), c.duration_min), ...HORAS_FIN])].sort().map((h) => <option key={h}>{h}</option>)}
              </select>
            </label>
            <label className="etiqueta sm:col-span-2">Motivo (opcional)<input name="motivo" placeholder="Ej. Recupera la del feriado" className="campo" /></label>
            {c.profiles?.email && <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="avisar" defaultChecked className="size-5 accent-petroleo" /> Avisarle por mail</label>}
            <button className="btn-primario sm:col-span-2">Mover clase</button>
          </FormAccion>

          <FormAccion action={cancelarClaseAdmin} className="tarjeta grid gap-3">
            <h2 className="font-serif text-2xl">Cancelar clase</h2>
            <input type="hidden" name="id" value={c.id} />
            <label className="etiqueta">Motivo
              <input name="motivo" required list="motivos" placeholder="Elegí o escribí un motivo" className="campo" />
              <datalist id="motivos">{MOTIVOS.map((m) => <option key={m} value={m} />)}</datalist>
            </label>
            <fieldset className="flex flex-col gap-2 text-sm">
              <legend className="mb-1 font-medium">¿Cómo queda?</legend>
              <label className="flex items-center gap-2"><input type="radio" name="tipo" value="cancelada" defaultChecked className="size-5 accent-petroleo" /> Cancelada: el horario queda libre y no se cobra</label>
              <label className="flex items-center gap-2"><input type="radio" name="tipo" value="perdida" className="size-5 accent-petroleo" /> Perdida: avisó tarde o faltó, se cobra igual</label>
            </fieldset>
            <button className="btn-secundario border-[#9B2C2C] text-[#9B2C2C] hover:bg-[#F2D9D9]">Cancelar clase</button>
          </FormAccion>

          <section className="tarjeta flex flex-wrap items-center gap-3">
            <h2 className="w-full font-serif text-2xl">Más opciones</h2>
            {c.status === "reservada" && (
              <form action={marcarClase} className="flex gap-2">
                <input type="hidden" name="id" value={c.id} />
                <button name="estado" value="asistio" className="btn-secundario">Asistió</button>
              </form>
            )}
            <form action={cambiarModalidad}>
              <input type="hidden" name="id" value={c.id} />
              <button className="btn-secundario">{c.modality === "online" ? "Pasar a presencial" : "Pasar a virtual"}</button>
            </form>
            <form action={etiquetarClase} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={c.id} />
              <select name="etiqueta" defaultValue={c.nota && !ETIQUETAS.includes(c.nota) ? "otra" : c.nota ?? ""} aria-label="Etiqueta" className="campo w-auto py-2.5 text-sm">
                <option value="">Sin etiqueta</option>
                {ETIQUETAS.map((e) => <option key={e}>{e}</option>)}
                <option value="otra">Otra…</option>
              </select>
              <input name="texto" defaultValue={c.nota && !ETIQUETAS.includes(c.nota) ? c.nota : ""} placeholder="Otra etiqueta" aria-label="Otra etiqueta" className="campo w-40 py-2.5 text-sm" />
              <button className="text-sm font-bold text-petroleo">Guardar etiqueta</button>
            </form>
          </section>
        </div>
      ) : (
        <section className="tarjeta flex flex-wrap items-center justify-between gap-3">
          <p>Esta clase está <strong>{c.status === "perdida" ? "perdida" : "cancelada"}</strong>{c.nota ? ` · ${c.nota}` : ""}.</p>
          <form action={restaurarClase}>
            <input type="hidden" name="id" value={c.id} />
            <button className="btn-secundario">Volver a activarla</button>
          </form>
        </section>
      )}
    </>
  );
}
