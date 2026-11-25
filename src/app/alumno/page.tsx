import { connection } from "next/server";
import Link from "next/link";
import { requireAlumno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { avisoATiempo, haceHoras, fechaHora, formatoPesos, NOMBRE_PLAN, recargoCuota } from "@/lib/reglas";
import { cancelar, pasarAVirtual } from "@/app/actions/alumno";
import { getConfig } from "@/lib/config";

export default async function InicioAlumno({ searchParams }: PageProps<"/alumno">) {
  await connection(); // la hora actual se calcula en cada visita
  const alumno = await requireAlumno();
  const sp = await searchParams;
  const supabase = await createClient();
  const cfg = await getConfig();
  const [{ data: clases }, { data: pendientes }, { data: grabaciones }] = await Promise.all([
    supabase.from("lessons").select("*").eq("status", "reservada").gte("starts_at", haceHoras(1)).order("starts_at").limit(5),
    supabase.from("payments").select("*").in("status", ["pendiente", "en_revision"]).order("created_at"),
    supabase.from("recordings").select("id, commented_at").not("comment", "is", null).order("commented_at", { ascending: false }).limit(1),
  ]);
  const [proxima, ...siguientes] = clases ?? [];
  const deuda = (pendientes ?? []).filter((p) => p.status === "pendiente")
    .reduce((t, p) => t + p.amount + (p.kind === "mensual" && p.period && p.aplica_recargo !== false ? recargoCuota(p.amount, p.period, cfg) : 0), 0);

  return (
    <>
      <h1 className="font-serif font-normal text-3xl leading-tight sm:text-4xl lg:text-5xl">Hola, {alumno.full_name.split(" ")[0]}</h1>
      {sp.reservada && <p className="rounded-xl bg-menta p-3 text-sm">¡Clase reservada! Te mandamos un mail con los detalles.</p>}
      {sp.reprogramada && <p className="rounded-xl bg-menta p-3 text-sm">¡Clase reprogramada! Te mandamos un mail con el nuevo horario.</p>}
      {sp.virtual && <p className="rounded-xl bg-menta p-3 text-sm">¡Listo! Tu clase pasó a ser virtual. Te mandamos el link de Zoom por mail.</p>}

      {proxima ? (
        <section data-tour="proxima" className="flex flex-col gap-3 rounded-3xl bg-ciruela p-6 text-crema">
          <p className="text-xs uppercase tracking-[1.5px] text-menta">Próxima clase</p>
          <p className="titulo text-3xl first-letter:uppercase">{fechaHora(proxima.starts_at)}</p>
          <p className="text-sm">{proxima.modality === "online" ? "Online" : "Presencial · Palermo"} · 1 hora{proxima.origen === "reprogramada" ? " · Reprogramada" : ""}</p>
          <div className="mt-1 flex flex-wrap gap-2.5">
            {proxima.zoom_join_url && <a href={proxima.zoom_join_url} target="_blank" rel="noreferrer" className="btn flex-1 bg-menta text-ciruela">Entrar a Zoom</a>}
            {avisoATiempo(proxima.starts_at, cfg) && (
              <Link data-tour="reprogramar" href={`/alumno/reservar?reprogramar=${proxima.id}`} className="btn flex-1 border-[1.5px] border-menta font-normal">Reprogramar</Link>
            )}
          </div>
          {proxima.modality === "presencial" && (
            <form action={pasarAVirtual} data-tour="virtual" className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/10 p-3">
              <input type="hidden" name="id" value={proxima.id} />
              <p className="flex-[1_1_200px] text-sm"><span className="chip mr-2 bg-lila text-white">¿Te vas de vacaciones?</span>Si podés, tomala virtual y no la perdés.</p>
              <button className="btn bg-white px-4 py-2 text-sm text-ciruela">Tomarla virtual</button>
            </form>
          )}
          <form action={cancelar} className="text-xs text-[#E6DCEE]">
            <input type="hidden" name="id" value={proxima.id} />
            {avisoATiempo(proxima.starts_at, cfg)
              ? <>Podés reprogramar o <button className="underline">cancelar</button> hasta {cfg.horasAviso} h antes.</>
              : <>Falta menos de {cfg.horasAviso} h: si no podés venir, <button className="underline">avisá igual</button>. La clase se considera dada.</>}
          </form>
        </section>
      ) : (
        <section className="tarjeta flex flex-col items-start gap-3">
          <p>No tenés clases reservadas.</p>
          <Link href="/alumno/reservar" className="btn-primario">Reservar una clase</Link>
        </section>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <section data-tour="pagos" className="tarjeta flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Pagos</h2>
            <span className="chip bg-lila-suave">{NOMBRE_PLAN[alumno.plan]}</span>
          </div>
          {deuda > 0
            ? <p>Tenés {formatoPesos(deuda)} pendientes.</p>
            : (pendientes ?? []).length ? <p>Tu comprobante está en revisión.</p> : <p>Estás al día.</p>}
          <Link href="/alumno/pagos" className="btn-primario">Ver pagos</Link>
        </section>
        <section data-tour="grabaciones" className="flex flex-col gap-3 rounded-2xl bg-menta p-6">
          <h2 className="text-lg font-bold">Grabaciones</h2>
          <p className="text-sm">{grabaciones?.length ? "Tenés un comentario nuevo de Barbi." : "Subí un audio y Barbi te devuelve comentarios."}</p>
          <Link href="/alumno/grabaciones" className="font-bold text-petroleo">Ir a grabaciones →</Link>
        </section>
      </div>

      {siguientes.length > 0 && (
        <section className="tarjeta flex flex-col gap-2">
          <h2 className="text-lg font-bold">Próximas clases</h2>
          {siguientes.map((c) => <p key={c.id} className="first-letter:uppercase">{fechaHora(c.starts_at)}</p>)}
        </section>
      )}
    </>
  );
}
