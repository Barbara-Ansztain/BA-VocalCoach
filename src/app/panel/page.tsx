import { connection } from "next/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { conceptoPago, formatoPesos, hora, hoyAR, OFFSET, periodoActual, recargoCuota, ZONA } from "@/lib/reglas";
import { Estado } from "@/components/Estado";
import { Recordatorios } from "@/components/Recordatorios";
import { getConfig } from "@/lib/config";

export default async function Hoy() {
  await connection(); // la hora actual se calcula en cada visita
  const supabase = await createClient();
  const cfg = await getConfig();
  const hoy = hoyAR();
  const mes = periodoActual();
  const [{ data: clases }, { data: pagos }, { data: consultas }, { data: recordatorios }, { data: alumnos }, { data: cobrados }] = await Promise.all([
    supabase.from("lessons").select("*, profiles(full_name, plan)").gte("starts_at", `${hoy}T00:00:00${OFFSET}`).lte("starts_at", `${hoy}T23:59:59${OFFSET}`)
      .in("status", ["reservada", "asistio", "perdida"]).order("starts_at"),
    supabase.from("payments").select("*, profiles(full_name)").in("status", ["pendiente", "en_revision"]).order("status").limit(6),
    supabase.from("consultations").select("*").eq("status", "nueva").order("created_at", { ascending: false }).limit(3),
    supabase.from("recordatorios").select("*, profiles(full_name)").eq("hecho", false).order("fecha", { nullsFirst: false }).order("created_at"),
    supabase.from("profiles").select("id, full_name").eq("role", "alumno").eq("active", true).order("full_name"),
    supabase.from("payments").select("amount, surcharge").eq("status", "pagado").gte("paid_at", `${mes}-01T00:00:00${OFFSET}`),
  ]);
  const ingresos = (cobrados ?? []).reduce((t, p) => t + p.amount + p.surcharge, 0);
  const titulo = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide">{titulo}</p>
          <h1 className="font-serif font-normal text-3xl leading-tight sm:text-4xl lg:text-5xl mt-1">Hola, Barbi</h1>
        </div>
        <Link data-tour="nueva-clase" href="/panel/agenda#nueva" className="btn-primario">+ Nueva clase</Link>
      </header>
      <section data-tour="resumen" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[["Clases hoy", clases?.length ?? 0], ["Pagos pendientes", pagos?.length ?? 0], ["Consultas nuevas", consultas?.length ?? 0]].map(([t, n]) => (
          <div key={t} className="tarjeta p-5"><p className="text-sm">{t}</p><p className="mt-1 text-3xl font-bold sm:text-4xl">{n}</p></div>
        ))}
        <div className="rounded-2xl bg-menta p-5"><p className="text-sm">Cobrado este mes</p><p className="mt-1 text-3xl font-bold sm:text-4xl">{formatoPesos(ingresos)}</p></div>
      </section>
      <div className="flex flex-wrap items-start gap-6">
        <section data-tour="agenda-hoy" className="tarjeta flex min-w-0 flex-[2_1_380px] flex-col gap-3">
          <h2 className="font-serif font-normal text-2xl leading-tight sm:text-[28px]">Agenda de hoy</h2>
          {!clases?.length && <p>Hoy no tenés clases.</p>}
          {clases?.map((c) => (
            <Link key={c.id} href={`/panel/clases/${c.id}`} className="flex items-center gap-4 rounded-2xl bg-crema px-4 py-3 text-ciruela hover:bg-arena">
              <span className="w-14 shrink-0 text-lg font-bold">{hora(c.starts_at)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{c.profiles?.full_name}</span>
                <span className="block text-sm">{c.modality === "online" ? "Online" : "Presencial"}{c.nota ? ` · ${c.nota}` : ""}</span>
              </span>
              {c.status !== "reservada" && <Estado valor={c.status} />}
              <span aria-hidden="true" className="text-xl text-ciruela/40">›</span>
            </Link>
          ))}
          <p className="text-[13px]">Tocá una clase para marcar asistencia, moverla o cancelarla.</p>
        </section>
        <div className="flex flex-[1_1_280px] flex-col gap-6">
          <section data-tour="cobros" className="tarjeta flex flex-col gap-3.5">
            <h2 className="font-serif font-normal text-2xl leading-tight sm:text-[28px]">Pagos por cobrar</h2>
            {!pagos?.length && <p className="text-sm">Todo al día.</p>}
            {pagos?.map((p) => (
              <Link key={p.id} href="/panel/pagos?f=pendientes" className="flex items-center justify-between gap-3 text-ciruela">
                <span className="min-w-0">
                  <span className="block truncate font-bold">{p.profiles?.full_name}</span>
                  <span className="block truncate text-[13px]">{conceptoPago(p)}</span>
                </span>
                <span className="shrink-0 font-bold">{formatoPesos(p.amount + (p.status === "pendiente" && p.kind === "mensual" && p.period && p.aplica_recargo !== false ? recargoCuota(p.amount, p.period, cfg) : p.surcharge))}</span>
              </Link>
            ))}
            <Link href="/panel/pagos" className="text-sm font-bold">Ver todos →</Link>
          </section>
          <Recordatorios items={recordatorios ?? []} alumnos={alumnos ?? []} />
          <section className="flex flex-col gap-3 rounded-2xl bg-lila-suave p-6">
            <h2 className="font-serif font-normal text-2xl leading-tight sm:text-[28px]">Consultas nuevas</h2>
            {!consultas?.length && <p className="text-sm">No hay consultas nuevas.</p>}
            {consultas?.map((c) => <p key={c.id}><strong>{c.name}</strong> · {c.message?.slice(0, 60) || c.modality}</p>)}
            <Link href="/panel/consultas" className="font-bold">Ver consultas →</Link>
          </section>
        </div>
      </div>
    </>
  );
}
