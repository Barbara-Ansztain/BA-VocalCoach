import Link from "next/link";
import { requireAlumno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { avisoATiempo, haceHoras, fechaHora, formatoPesos, NOMBRE_PLAN, recargoCuota } from "@/lib/reglas";
import { cancelar } from "@/app/actions/alumno";

export default async function InicioAlumno({ searchParams }: PageProps<"/alumno">) {
  const alumno = await requireAlumno();
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: clases }, { data: pendientes }, { data: grabaciones }] = await Promise.all([
    supabase.from("lessons").select("*").eq("status", "reservada").gte("starts_at", haceHoras(1)).order("starts_at").limit(5),
    supabase.from("payments").select("*").in("status", ["pendiente", "en_revision"]).order("created_at"),
    supabase.from("recordings").select("id, commented_at").not("comment", "is", null).order("commented_at", { ascending: false }).limit(1),
  ]);
  const [proxima, ...siguientes] = clases ?? [];
  const deuda = (pendientes ?? []).filter((p) => p.status === "pendiente")
    .reduce((t, p) => t + p.amount + (p.kind === "mensual" && p.period ? recargoCuota(p.amount, p.period) : 0), 0);

  return (
    <>
      <h1 className="titulo text-4xl">Hola, {alumno.full_name.split(" ")[0]}</h1>
      {sp.reservada && <p className="rounded-xl bg-menta p-3 text-sm">¡Clase reservada! Te mandamos un mail con los detalles.</p>}
      {sp.reprogramada && <p className="rounded-xl bg-menta p-3 text-sm">¡Clase reprogramada! Te mandamos un mail con el nuevo horario.</p>}

      {proxima ? (
        <section className="flex flex-col gap-3 rounded-3xl bg-ciruela p-6 text-crema">
          <p className="text-xs uppercase tracking-[1.5px] text-menta">Próxima clase</p>
          <p className="titulo text-3xl first-letter:uppercase">{fechaHora(proxima.starts_at)}</p>
          <p className="text-sm">{proxima.modality === "online" ? "Online" : "Presencial · Palermo"} · 1 hora</p>
          <div className="mt-1 flex flex-wrap gap-2.5">
            {proxima.zoom_join_url && <a href={proxima.zoom_join_url} target="_blank" rel="noreferrer" className="btn flex-1 bg-menta text-ciruela">Entrar a Zoom</a>}
            {avisoATiempo(proxima.starts_at) && (
              <Link href={`/alumno/reservar?reprogramar=${proxima.id}`} className="btn flex-1 border-[1.5px] border-menta font-normal">Reprogramar</Link>
            )}
          </div>
          <form action={cancelar} className="text-xs text-[#E6DCEE]">
            <input type="hidden" name="id" value={proxima.id} />
            {avisoATiempo(proxima.starts_at)
              ? <>Podés reprogramar o <button className="underline">cancelar</button> hasta 24 h antes.</>
              : <>Falta menos de 24 h: si no podés venir, <button className="underline">avisá igual</button>. La clase se considera dada.</>}
          </form>
        </section>
      ) : (
        <section className="tarjeta flex flex-col items-start gap-3">
          <p>No tenés clases reservadas.</p>
          <Link href="/alumno/reservar" className="btn-primario">Reservar una clase</Link>
        </section>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <section className="tarjeta flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Pagos</h2>
            <span className="chip bg-lila-suave">{NOMBRE_PLAN[alumno.plan]}</span>
          </div>
          {deuda > 0
            ? <p>Tenés {formatoPesos(deuda)} pendientes.</p>
            : (pendientes ?? []).length ? <p>Tu comprobante está en revisión.</p> : <p>Estás al día.</p>}
          <Link href="/alumno/pagos" className="btn-primario">Ver pagos</Link>
        </section>
        <section className="flex flex-col gap-3 rounded-2xl bg-menta p-6">
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
