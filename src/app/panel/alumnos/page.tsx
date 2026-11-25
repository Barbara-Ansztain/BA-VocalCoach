import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { horarioFijo, HORAS_ELEGIBLES, HORAS_FIN, hoyAR, NOMBRE_PLAN, type HorarioFijo, type Plan } from "@/lib/reglas";
import { connection } from "next/server";
import { FormAccion } from "@/components/FormAccion";
import { estadoAlumno, PuntoEstado } from "@/components/PuntoEstado";
import { agregarAlumno } from "@/app/actions/admin";

export default async function Alumnos() {
  await connection();
  const supabase = await createClient();
  const hoy = hoyAR();
  const { data: filas } = await supabase.from("profiles").select("*, student_slots(*), pausas(desde, hasta, motivo)").eq("role", "alumno").order("full_name");
  // Orden: activos primero, por día y hora de su primer horario fijo
  const clave = (a: { student_slots: HorarioFijo[] }) => {
    const h = [...(a.student_slots ?? [])].sort((x, y) => x.weekday - y.weekday || x.start_time.localeCompare(y.start_time))[0];
    return h ? `${(h.weekday + 6) % 7}${h.start_time}` : "9";
  };
  const data = (filas ?? []).sort((a, b) => Number(b.active) - Number(a.active) || clave(a).localeCompare(clave(b)));
  const pausaDe = (a: { pausas: { desde: string; hasta: string | null; motivo: string }[] }) =>
    (a.pausas ?? []).find((p) => !p.hasta || p.hasta >= hoy);
  return (
    <>
      <h1 className="font-serif font-normal text-3xl leading-tight sm:text-4xl lg:text-5xl">Alumnos <span className="font-sans text-lg">· {data?.filter((a) => a.active).length ?? 0} activos</span></h1>
      <p className="flex flex-wrap gap-4 text-sm"><PuntoEstado estado="activo" conTexto /><PuntoEstado estado="manual" conTexto /><PuntoEstado estado="inactivo" conTexto /></p>
      <details className="tarjeta group/det">
        <summary className="cursor-pointer list-none font-bold text-petroleo [&::-webkit-details-marker]:hidden">＋ Agregar alumno</summary>
        <FormAccion action={agregarAlumno} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="etiqueta">Nombre<input name="nombre" required className="campo" /></label>
          <label className="etiqueta">WhatsApp (opcional)<input name="telefono" type="tel" className="campo" /></label>
          <label className="etiqueta">Mail (opcional)<input name="email" type="email" className="campo" /></label>
          <label className="etiqueta">Plan
            <select name="plan" defaultValue="mensual_4" className="campo">
              <option value="suelta">Clase suelta</option><option value="mensual_2">Mensual · 2 clases</option><option value="mensual_4">Mensual · 4 clases</option>
            </select>
          </label>
          <label className="etiqueta">Día fijo
            <select name="dia" defaultValue="" className="campo">
              <option value="">A coordinar</option>
              {["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </label>
          <label className="etiqueta">Desde
            <select name="hora" defaultValue="" className="campo"><option value="">—</option>{HORAS_ELEGIBLES.map((h) => <option key={h}>{h}</option>)}</select>
          </label>
          <label className="etiqueta">Hasta
            <select name="hasta" defaultValue="" className="campo"><option value="">1 hora después</option>{HORAS_FIN.map((h) => <option key={h}>{h}</option>)}</select>
          </label>
          <p className="text-xs sm:col-span-2 lg:col-span-2">No necesita usar la app. Si querés que entre, después le mandás la invitación desde su ficha. Los que escriben por la página llegan a <Link href="/panel/consultas" className="font-bold">Consultas</Link>.</p>
          <button className="btn-primario">Agregar</button>
        </FormAccion>
      </details>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {data?.map((a) => (
          <Link key={a.id} href={`/panel/alumnos/${a.id}`} className={`tarjeta flex items-center gap-4 text-ciruela hover:bg-menta ${estadoAlumno(a, hoy) === "inactivo" ? "opacity-60" : ""}`}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-lila font-serif text-xl text-white">{a.full_name.charAt(0) || "?"}</span>
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate font-bold"><PuntoEstado estado={estadoAlumno(a, hoy)} />{a.full_name || a.email}</p>
              <p className="text-sm">{horarioFijo(a.student_slots)}</p>
              <p className="text-xs">{NOMBRE_PLAN[a.plan as Plan]}{a.tyc_accepted_at ? "" : a.user_id ? " · invitado" : " · sin cuenta"}</p>
              {pausaDe(a) && (
                <span className="chip mt-1 bg-arena">
                  {pausaDe(a)!.desde > hoy ? `Inactivo desde el ${pausaDe(a)!.desde.slice(8)}/${pausaDe(a)!.desde.slice(5, 7)}` : "Inactivo"}
                  {pausaDe(a)!.hasta ? ` hasta el ${pausaDe(a)!.hasta!.slice(8)}/${pausaDe(a)!.hasta!.slice(5, 7)}` : ""}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
