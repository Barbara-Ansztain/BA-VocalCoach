import { createAdminClient, createClient } from "@/lib/supabase/server";
import { formatoPesos, NOMBRE_PLAN, OFFSET, periodoActual, recargoCuota, type Plan } from "@/lib/reglas";
import { Estado } from "@/components/Estado";
import { confirmarPago, generarCuotas, rechazarComprobante } from "@/app/actions/admin";

const FILTROS = [["todos", "Todos"], ["pendientes", "Pendientes"], ["mensual", "Mensuales"], ["suelta", "Clases sueltas"]];

export default async function Pagos({ searchParams }: PageProps<"/panel/pagos">) {
  const sp = await searchParams;
  const filtro = typeof sp.f === "string" ? sp.f : "todos";
  const mes = periodoActual();
  const supabase = await createClient();
  let q = supabase.from("payments").select("*, profiles(full_name, plan)").neq("status", "anulado").order("created_at", { ascending: false }).limit(80);
  if (filtro === "pendientes") q = q.in("status", ["pendiente", "en_revision"]);
  if (filtro === "mensual" || filtro === "suelta") q = q.eq("kind", filtro);
  const [{ data: pagos }, { data: delMes }] = await Promise.all([
    q,
    supabase.from("payments").select("amount, surcharge, status, kind, period, paid_at").neq("status", "anulado")
      .or(`period.eq.${mes},paid_at.gte.${mes}-01T00:00:00${OFFSET},status.in.(pendiente,en_revision)`),
  ]);
  const total = (p: { amount: number; surcharge: number; status: string; kind: string; period: string | null }) =>
    p.amount + (p.status === "pendiente" && p.kind === "mensual" && p.period ? recargoCuota(p.amount, p.period) : p.surcharge);
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
        <div><p className="text-sm uppercase tracking-wide">Pagos</p><h1 className="titulo mt-1 text-4xl">Cuotas y clases</h1></div>
        <form action={generarCuotas}><button className="btn-primario">Generar cuotas de {mes}</button></form>
      </header>
      <section className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
        <div className="rounded-2xl bg-menta p-5"><p className="text-[13px]">Cobrado este mes</p><p className="mt-1 text-3xl font-bold">{formatoPesos(cobrado)}</p></div>
        <div className="tarjeta p-5"><p className="text-[13px]">Por cobrar</p><p className="mt-1 text-3xl font-bold">{formatoPesos(porCobrar)}</p></div>
        <div className="tarjeta p-5"><p className="text-[13px]">Comprobantes a revisar</p><p className="mt-1 text-3xl font-bold">{aRevisar}</p></div>
      </section>
      <nav className="flex flex-wrap gap-2.5">
        {FILTROS.map(([k, t]) => (
          <a key={k} href={`?f=${k}`} className={`rounded-full px-4 py-2.5 text-sm ${filtro === k ? "bg-ciruela text-crema" : "border-[1.5px] border-ciruela text-ciruela"}`}>{t}</a>
        ))}
      </nav>
      <section className="tarjeta overflow-x-auto p-3">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead><tr className="text-left text-[13px]">{["Alumno", "Concepto", "Monto", "Estado", "Método", ""].map((h) => <th key={h} className="px-3 py-2.5">{h}</th>)}</tr></thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id} className="border-t border-arena">
                <td className="px-3 py-3.5 font-bold">{p.profiles?.full_name}</td>
                <td className="px-3 py-3.5">{p.kind === "mensual" ? `${NOMBRE_PLAN[p.profiles?.plan as Plan] ?? "Mensual"} · ${p.period}` : "Clase suelta"}</td>
                <td className="px-3 py-3.5">{formatoPesos(total(p))}{total(p) > p.amount && <span className="block text-xs">incluye 10% de recargo</span>}</td>
                <td className="px-3 py-3.5"><Estado valor={p.status} /></td>
                <td className="px-3 py-3.5">{p.method ?? "—"}</td>
                <td className="px-3 py-3.5">
                  <div className="flex flex-wrap items-center justify-end gap-2.5">
                    {p.comprobante && <a href={p.comprobante} target="_blank" rel="noreferrer" className="font-bold">Ver comprobante</a>}
                    {p.status === "en_revision" && (
                      <>
                        <form action={confirmarPago}><input type="hidden" name="id" value={p.id} /><button className="btn-primario px-3 py-2 text-[13px]">Confirmar</button></form>
                        <form action={rechazarComprobante}><input type="hidden" name="id" value={p.id} /><button className="text-[13px] underline">Rechazar</button></form>
                      </>
                    )}
                    {p.status === "pendiente" && (
                      <form action={confirmarPago} className="flex gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <button name="metodo" value="efectivo" className="text-[13px] font-bold text-petroleo">Efectivo</button>
                        <button name="metodo" value="transferencia" className="text-[13px] font-bold text-petroleo">Transferencia</button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="flex flex-wrap gap-x-8 gap-y-2 rounded-2xl bg-lila-suave px-6 py-5 text-sm">
        <strong>Reglas automáticas:</strong>
        <span>Cuota mensual del 1 al 10; desde el 11 suma 10%</span>
        <span>Clase suelta: al reservar o el mismo día</span>
        <span>Mercado Pago se acredita solo</span>
        <span>Transferencia: el alumno sube el comprobante y vos confirmás</span>
      </section>
    </>
  );
}
