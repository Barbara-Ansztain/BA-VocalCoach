import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { diaSemana, sumarDias, type Disponibilidad } from "@/lib/agenda";
import { hora, hoyAR, OFFSET } from "@/lib/reglas";
import { FormAccion } from "@/components/FormAccion";
import { bloquearHorario, crearTurno } from "@/app/actions/admin";

const NOMBRES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default async function Agenda({ searchParams }: PageProps<"/panel/agenda">) {
  const sp = await searchParams;
  const base = typeof sp.semana === "string" ? sp.semana : hoyAR();
  const lunes = sumarDias(base, -((diaSemana(base) + 6) % 7));
  const dias = Array.from({ length: 6 }, (_, i) => sumarDias(lunes, i));
  const supabase = await createClient();
  const [{ data: clases }, { data: disp }, { data: feriados }, { data: bloqueos }, { data: alumnos }] = await Promise.all([
    supabase.from("lessons").select("*, profiles(full_name, plan)").in("status", ["reservada", "asistio", "perdida"])
      .gte("starts_at", `${dias[0]}T00:00:00${OFFSET}`).lte("starts_at", `${dias[5]}T23:59:59${OFFSET}`),
    supabase.from("availability").select("*").eq("active", true),
    supabase.from("holidays").select("*").gte("date", dias[0]).lte("date", dias[5]),
    supabase.from("blocked_slots").select("*").gte("starts_at", `${dias[0]}T00:00:00${OFFSET}`).lte("starts_at", `${dias[5]}T23:59:59${OFFSET}`),
    supabase.from("profiles").select("id, full_name").eq("role", "alumno").eq("active", true).order("full_name"),
  ]);
  const fechaDe = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso));
  const feriado = new Map((feriados ?? []).map((f) => [f.date, f.name]));
  const horas = [...new Set([...(disp ?? []).map((d) => d.start_time.slice(0, 5)), ...(clases ?? []).map((c) => hora(c.starts_at))])].sort();
  const diasVisibles = dias.filter((d, i) => i < 5 || (disp ?? []).some((x) => x.weekday === 6) || (clases ?? []).some((c) => fechaDe(c.starts_at) === d));

  function celda(fecha: string, h: string) {
    if (feriado.has(fecha)) return <div className="min-h-16 rounded-xl bg-arena p-2.5 text-xs">{feriado.get(fecha)}</div>;
    const c = (clases ?? []).find((x) => fechaDe(x.starts_at) === fecha && hora(x.starts_at) === h);
    if (c) return (
      <Link href={`/panel/alumnos/${c.student_id}`} className={`block min-h-16 rounded-xl p-2.5 text-ciruela ${c.profiles?.plan === "suelta" ? "bg-lila-suave" : "bg-white"}`}>
        <p className="text-sm font-bold">{c.profiles?.full_name}</p>
        <p className="text-xs">{c.modality === "online" ? "Online" : "Presencial"}{c.status !== "reservada" ? ` · ${c.status === "asistio" ? "asistió" : "perdida"}` : ""}</p>
      </Link>
    );
    if ((bloqueos ?? []).some((b) => fechaDe(b.starts_at) === fecha && hora(b.starts_at) === h))
      return <div className="min-h-16 rounded-xl bg-arena p-2.5 text-xs">Bloqueado</div>;
    const ofrece = (disp as Disponibilidad[] ?? []).some((d) => d.weekday === diaSemana(fecha) && d.start_time.slice(0, 5) === h);
    return ofrece ? <div className="flex min-h-16 items-center rounded-xl border-[1.5px] border-dashed border-lila p-2.5 text-sm">Libre</div> : <div className="min-h-16" />;
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide">Agenda</p>
          <h1 className="titulo mt-1 text-4xl">Semana del {Number(dias[0].slice(8))}/{Number(dias[0].slice(5, 7))}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/panel/agenda?semana=${sumarDias(lunes, -7)}`} className="btn-secundario">← Anterior</Link>
          <Link href="/panel/agenda" className="btn-secundario">Hoy</Link>
          <Link href={`/panel/agenda?semana=${sumarDias(lunes, 7)}`} className="btn-secundario">Siguiente →</Link>
        </div>
      </header>
      <section className="tarjeta overflow-x-auto p-5">
        <div className="grid min-w-[640px] gap-2 rounded-2xl bg-crema p-3" style={{ gridTemplateColumns: `56px repeat(${diasVisibles.length}, minmax(110px, 1fr))` }}>
          <div />
          {diasVisibles.map((d) => <div key={d} className="px-0.5 py-1 text-sm font-bold">{NOMBRES[diaSemana(d)]} {Number(d.slice(8))}</div>)}
          {horas.map((h) => (
            <div key={h} className="contents">
              <div className="pt-2.5 text-sm font-bold">{h}</div>
              {diasVisibles.map((d) => <div key={d + h}>{celda(d, h)}</div>)}
            </div>
          ))}
        </div>
        <p className="mt-3.5 flex flex-wrap gap-4 text-[13px]">
          <span>Blanco: mensual</span><span>Lila: clase suelta</span><span>Punteado: libre, el alumno lo puede reservar</span>
        </p>
      </section>
      <div id="nuevo" className="flex flex-wrap gap-6">
        <FormAccion action={crearTurno} className="tarjeta flex flex-[1_1_380px] flex-wrap items-end gap-3">
          <h2 className="titulo basis-full text-2xl">Nuevo turno</h2>
          <label className="etiqueta flex-[1_1_180px]">Alumno
            <select name="alumno" required className="campo">{alumnos?.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}</select>
          </label>
          <label className="etiqueta">Fecha<input type="date" name="fecha" required className="campo" /></label>
          <label className="etiqueta">Hora<input type="time" name="hora" required className="campo" /></label>
          <button className="btn-primario">Crear y avisar</button>
        </FormAccion>
        <FormAccion action={bloquearHorario} className="tarjeta flex flex-[1_1_320px] flex-wrap items-end gap-3">
          <h2 className="titulo basis-full text-2xl">Bloquear horario</h2>
          <label className="etiqueta">Fecha<input type="date" name="fecha" required className="campo" /></label>
          <label className="etiqueta">Hora<input type="time" name="hora" required className="campo" /></label>
          <label className="etiqueta flex-1">Motivo<input name="motivo" className="campo" /></label>
          <button className="btn-secundario">Bloquear</button>
        </FormAccion>
      </div>
    </>
  );
}
