import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatoPesos, hora, hoyAR, OFFSET, periodoActual, recargoCuota, ZONA } from "@/lib/reglas";
import { confirmarPago, marcarClase } from "@/app/actions/admin";
import { Estado } from "@/components/Estado";

export default async function Hoy() {
  const supabase = await createClient();
  const hoy = hoyAR();
  const mes = periodoActual();
  const [{ data: clases }, { data: pagos }, { data: consultas }, { data: cobrados }] = await Promise.all([
    supabase.from("lessons").select("*, profiles(full_name, plan)").gte("starts_at", `${hoy}T00:00:00${OFFSET}`).lte("starts_at", `${hoy}T23:59:59${OFFSET}`)
      .in("status", ["reservada", "asistio", "perdida"]).order("starts_at"),
    supabase.from("payments").select("*, profiles(full_name)").in("status", ["pendiente", "en_revision"]).order("status").limit(6),
    supabase.from("consultations").select("*").eq("status", "nueva").order("created_at", { ascending: false }).limit(3),
    supabase.from("payments").select("amount, surcharge").eq("status", "pagado").gte("paid_at", `${mes}-01T00:00:00${OFFSET}`),
  ]);
  const ingresos = (cobrados ?? []).reduce((t, p) => t + p.amount + p.surcharge, 0);
  const titulo = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide">{titulo}</p>
          <h1 className="titulo mt-1 text-5xl">Hola, Barbi</h1>
        </div>
        <Link href="/panel/agenda#nuevo" className="btn-primario">+ Nuevo turno</Link>
      </header>
      <section className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        {[["Clases hoy", clases?.length ?? 0], ["Pagos pendientes", pagos?.length ?? 0], ["Consultas nuevas", consultas?.length ?? 0]].map(([t, n]) => (
          <div key={t} className="tarjeta p-5"><p className="text-sm">{t}</p><p className="mt-1.5 text-4xl font-bold">{n}</p></div>
        ))}
        <div className="rounded-2xl bg-menta p-5"><p className="text-sm">Cobrado este mes</p><p className="mt-1.5 text-4xl font-bold">{formatoPesos(ingresos)}</p></div>
      </section>
      <div className="flex flex-wrap items-start gap-6">
        <section className="tarjeta flex flex-[2_1_420px] flex-col gap-3">
          <h2 className="titulo text-3xl">Agenda de hoy</h2>
          {!clases?.length && <p>Hoy no tenés clases.</p>}
          {clases?.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-4 rounded-2xl bg-crema p-4">
              <span className="w-16 text-lg font-bold">{hora(c.starts_at)}</span>
              <div className="flex-[1_1_160px]">
                <Link href={`/panel/alumnos/${c.student_id}`} className="font-bold text-ciruela">{c.profiles?.full_name}</Link>
                <p className="text-sm">{c.modality === "online" ? "Online" : "Presencial"}</p>
              </div>
              <Estado valor={c.status} />
              {c.zoom_join_url && <a href={c.zoom_join_url} target="_blank" rel="noreferrer" className="btn-primario px-3.5 py-2.5 text-sm">Abrir Zoom</a>}
              {c.status === "reservada" && (
                <form action={marcarClase} className="flex gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <button name="estado" value="asistio" className="btn-secundario px-3.5 py-2.5 text-sm">Asistió</button>
                  <button name="estado" value="perdida" className="px-2 text-sm underline">Faltó</button>
                </form>
              )}
            </div>
          ))}
          <p className="text-[13px]">Cancelación con menos de 24 h: mensual pierde la clase, suelta la abona igual · feriados sin clase</p>
        </section>
        <div className="flex flex-[1_1_280px] flex-col gap-6">
          <section className="tarjeta flex flex-col gap-3.5">
            <h2 className="titulo text-3xl">Pagos por cobrar</h2>
            {!pagos?.length && <p className="text-sm">Todo al día.</p>}
            {pagos?.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{p.profiles?.full_name}</p>
                  <p className="text-[13px]">
                    {p.kind === "mensual" ? `Cuota ${p.period}` : "Clase suelta"} · {formatoPesos(p.amount + (p.status === "pendiente" && p.period ? recargoCuota(p.amount, p.period) : p.surcharge))}
                  </p>
                </div>
                <form action={confirmarPago}>
                  <input type="hidden" name="id" value={p.id} />
                  {p.status === "en_revision"
                    ? <button className="text-sm font-bold text-petroleo">Confirmar</button>
                    : <button name="metodo" value="efectivo" className="text-sm font-bold text-petroleo">Cobré en efectivo</button>}
                </form>
              </div>
            ))}
            <Link href="/panel/pagos" className="text-sm font-bold">Ver todos →</Link>
          </section>
          <section className="flex flex-col gap-3 rounded-2xl bg-lila-suave p-6">
            <h2 className="titulo text-3xl">Consultas nuevas</h2>
            {!consultas?.length && <p className="text-sm">No hay consultas nuevas.</p>}
            {consultas?.map((c) => <p key={c.id}><strong>{c.name}</strong> · {c.message?.slice(0, 60) || c.modality}</p>)}
            <Link href="/panel/consultas" className="font-bold">Ver consultas →</Link>
          </section>
        </div>
      </div>
    </>
  );
}
