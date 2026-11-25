import { connection } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { conceptoPago, formatoPesos, OFFSET, periodoActual, recargoCuota } from "@/lib/reglas";
import { FormAccion } from "@/components/FormAccion";
import { Estado } from "@/components/Estado";
import { getConfig } from "@/lib/config";
import { cargarExtra, confirmarPago, generarCuotas, rechazarComprobante, registrarPago } from "@/app/actions/admin";

const FILTROS = [["todos", "Todos"], ["pendientes", "Pendientes"], ["mensual", "Mensuales"], ["suelta", "Clases sueltas"], ["extra", "Extras"]];

export default async function Pagos({ searchParams }: PageProps<"/panel/pagos">) {
  await connection(); // la hora actual se calcula en cada visita
  const sp = await searchParams;
  const filtro = typeof sp.f === "string" ? sp.f : "todos";
  const mes = periodoActual();
  const mesSiguiente = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 1)).toISOString().slice(0, 7);
  const supabase = await createClient();
  const cfg = await getConfig();
  let q = supabase.from("payments").select("*, profiles(full_name, plan)").neq("status", "anulado").order("created_at", { ascending: false }).limit(80);
  if (filtro === "pendientes") q = q.in("status", ["pendiente", "en_revision"]);
  if (filtro === "mensual" || filtro === "suelta" || filtro === "extra") q = q.eq("kind", filtro);
  const [{ data: pagos }, { data: delMes }, { data: alumnos }] = await Promise.all([
    q,
    supabase.from("payments").select("amount, surcharge, status, kind, period, paid_at, aplica_recargo").neq("status", "anulado")
      .or(`period.eq.${mes},paid_at.gte.${mes}-01T00:00:00${OFFSET},status.in.(pendiente,en_revision)`),
    supabase.from("profiles").select("id, full_name, pagador").eq("role", "alumno").order("full_name"),
  ]);
  const total = (p: { amount: number; surcharge: number; status: string; kind: string; period: string | null; aplica_recargo: boolean }) =>
    p.amount + (p.status === "pendiente" && p.kind === "mensual" && p.period && p.aplica_recargo !== false ? recargoCuota(p.amount, p.period, cfg) : p.surcharge);
  const cobrado = (delMes ?? []).filter((p) => p.status === "pagado" && p.paid_at?.startsWith(mes)).reduce((t, p) => t + total(p), 0);
  const porCobrar = (delMes ?? []).filter((p) => p.status !== "pagado").reduce((t, p) => t + total(p), 0);
  const aRevisar = (delMes ?? []).filter((p) => p.status === "en_revision").length;
  const admin = createAdminClient();
  const lista = await Promise.all((pagos ?? []).map(async (p) => ({
    ...p, comprobante: p.receipt_path ? (await admin.storage.from("comprobantes").createSignedUrl(p.receipt_path, 3600)).data?.signedUrl : null,
  })));

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm uppercase tracking-wide">Pagos</p><h1 className="font-serif font-normal text-3xl leading-tight sm:text-4xl lg:text-5xl mt-1">Cuotas y clases</h1></div>
        <form action={generarCuotas} className="flex flex-wrap items-center gap-2">
          <select name="periodo" defaultValue={mes} aria-label="Mes de las cuotas" className="campo w-auto py-2.5">
            <option value={mes}>{mes}</option>
            <option value={mesSiguiente}>{mesSiguiente}</option>
          </select>
          <button className="btn-primario">Generar cuotas</button>
        </form>
      </header>
      <section className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-3">
        <div className="rounded-2xl bg-menta p-5"><p className="text-[13px]">Cobrado este mes</p><p className="mt-1 text-xl font-bold whitespace-nowrap sm:text-3xl">{formatoPesos(cobrado)}</p></div>
        <div className="tarjeta p-5"><p className="text-[13px]">Por cobrar</p><p className="mt-1 text-xl font-bold whitespace-nowrap sm:text-3xl">{formatoPesos(porCobrar)}</p></div>
        <div className="tarjeta p-5"><p className="text-[13px]">Comprobantes a revisar</p><p className="mt-1 text-xl font-bold whitespace-nowrap sm:text-3xl">{aRevisar}</p></div>
      </section>
      <nav className="flex flex-wrap gap-2.5">
        {FILTROS.map(([k, t]) => (
          <a key={k} href={`?f=${k}`} className={`rounded-full px-4 py-2.5 text-sm ${filtro === k ? "bg-ciruela text-crema" : "border-[1.5px] border-ciruela text-ciruela"}`}>{t}</a>
        ))}
      </nav>
      <div className="grid gap-6 lg:grid-cols-2">
        <details className="tarjeta" id="registrar">
          <summary className="cursor-pointer list-none font-bold text-petroleo [&::-webkit-details-marker]:hidden">＋ Registrar un pago o una deuda</summary>
          <FormAccion action={registrarPago} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="etiqueta sm:col-span-2">Alumno
              <select name="alumno" required defaultValue="" className="campo">
                <option value="" disabled>Elegí</option>
                {alumnos?.map((a) => <option key={a.id} value={a.id}>{a.full_name}{a.pagador ? ` (paga ${a.pagador})` : ""}</option>)}
              </select>
            </label>
            <label className="etiqueta">Tipo
              <select name="tipo" className="campo"><option value="mensual">Cuota mensual</option><option value="suelta">Clase suelta</option><option value="extra">Otro (entradas, piano…)</option></select>
            </label>
            <label className="etiqueta">Mes (si es cuota)<input type="month" name="periodo" defaultValue={mes} className="campo" /></label>
            <label className="etiqueta sm:col-span-2">Concepto<input name="concepto" placeholder="Ej. Cuota noviembre · 2 veces por semana" className="campo" /></label>
            <label className="etiqueta">Monto ($)<input name="monto" inputMode="numeric" required className="campo" /></label>
            <label className="etiqueta">Estado
              <select name="estado" className="campo"><option value="pagado">Ya lo pagó</option><option value="pendiente">Lo debe</option></select>
            </label>
            <label className="etiqueta sm:col-span-2">Cómo pagó
              <select name="metodo" defaultValue="" className="campo"><option value="">—</option><option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="mercadopago">Mercado Pago</option></select>
            </label>
            <button className="btn-primario sm:col-span-2">Guardar</button>
          </FormAccion>
        </details>
        <details className="tarjeta">
          <summary className="cursor-pointer list-none font-bold text-petroleo [&::-webkit-details-marker]:hidden">＋ Cargo extra para varias personas</summary>
          <FormAccion action={cargarExtra} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="etiqueta sm:col-span-2">Concepto<input name="concepto" required placeholder="Ej. Entrada muestra" className="campo" /></label>
            <label className="etiqueta">Monto por unidad ($)<input name="monto" inputMode="numeric" required className="campo" /></label>
            <label className="etiqueta">Estado
              <select name="estado" className="campo"><option value="pendiente">Lo deben</option><option value="pagado">Ya lo pagaron</option></select>
            </label>
            <fieldset className="flex max-h-64 flex-col gap-1.5 overflow-y-auto rounded-xl bg-crema p-3 sm:col-span-2">
              <legend className="sr-only">Personas</legend>
              {alumnos?.map((a) => (
                <div key={a.id} className="flex items-center gap-2">
                  <input type="checkbox" name="alumnos" value={a.id} id={`ex-${a.id}`} className="size-5 accent-petroleo" />
                  <label htmlFor={`ex-${a.id}`} className="flex-1 text-sm">{a.full_name}</label>
                  <input name={`cant-${a.id}`} type="number" min={1} defaultValue={1} aria-label={`Cantidad para ${a.full_name}`} className="campo w-16 px-2 py-1 text-sm" />
                </div>
              ))}
            </fieldset>
            <p className="text-xs sm:col-span-2">La cantidad multiplica el monto (ej. 3 entradas).</p>
            <button className="btn-primario sm:col-span-2">Cargar</button>
          </FormAccion>
        </details>
      </div>
      <section className="tarjeta flex flex-col p-2 sm:p-4">
        <div className="hidden grid-cols-[1.2fr_1.4fr_1fr_1fr_0.9fr_1.4fr] gap-3 px-3 pb-2 text-[13px] font-bold md:grid">
          <span>Alumno</span><span>Concepto</span><span>Monto</span><span>Estado</span><span>Método</span><span />
        </div>
        {lista.length === 0 && <p className="p-4 text-center">No hay pagos para mostrar. Generá las cuotas del mes con el botón de arriba.</p>}
        {lista.map((p) => (
          <div key={p.id} className="grid grid-cols-2 items-center gap-x-3 gap-y-1.5 border-t border-arena p-3 first:border-t-0 md:grid-cols-[1.2fr_1.4fr_1fr_1fr_0.9fr_1.4fr] md:first:border-t">
            <span className="font-bold">{p.profiles?.full_name}</span>
            <span className="justify-self-end md:justify-self-auto"><Estado valor={p.status} /></span>
            <span className="text-sm md:order-none">{conceptoPago(p)}</span>
            <span className="justify-self-end whitespace-nowrap font-bold md:justify-self-auto md:font-normal">
              {formatoPesos(total(p))}{total(p) > p.amount && <span className="block text-xs font-normal">incluye recargo</span>}
            </span>
            <span className="text-sm text-ciruela/80">{p.method ?? "—"}</span>
            <div className="col-span-2 flex flex-wrap items-center gap-3 md:col-span-1 md:justify-end">
              {p.comprobante && <a href={p.comprobante} target="_blank" rel="noreferrer" className="text-sm font-bold">Ver comprobante</a>}
              {p.status === "en_revision" && (
                <>
                  <form action={confirmarPago}><input type="hidden" name="id" value={p.id} /><button className="btn-primario px-3 py-2 text-[13px]">Confirmar</button></form>
                  <form action={rechazarComprobante}><input type="hidden" name="id" value={p.id} /><button className="py-2 text-[13px] underline">Rechazar</button></form>
                </>
              )}
              {p.status === "pendiente" && (
                <form action={confirmarPago} className="flex flex-wrap gap-3">
                  <input type="hidden" name="id" value={p.id} />
                  <button name="metodo" value="efectivo" className="py-2 text-[13px] font-bold text-petroleo">Cobré efectivo</button>
                  <button name="metodo" value="transferencia" className="py-2 text-[13px] font-bold text-petroleo">Cobré transferencia</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </section>
      <section className="flex flex-wrap gap-x-8 gap-y-2 rounded-2xl bg-lila-suave px-6 py-5 text-sm">
        <strong>Reglas automáticas:</strong>
        <span>Cuota mensual del 1 al {cfg.diaVencimiento}; después suma {cfg.recargoPct}%</span>
        <span>Clase suelta: al reservar o el mismo día</span>
        <span>Mercado Pago se acredita solo</span>
        <span>Transferencia: el alumno sube el comprobante y vos confirmás</span>
      </section>
    </>
  );
}
