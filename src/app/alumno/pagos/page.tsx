import { requireAlumno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fechaHora, formatoPesos, recargoCuota } from "@/lib/reglas";
import { FormAccion } from "@/components/FormAccion";
import { pagarConMercadoPago, subirComprobante } from "@/app/actions/alumno";

const ESTADO: Record<string, [string, string]> = {
  pendiente: ["Pendiente", "bg-lila-suave"], en_revision: ["En revisión", "bg-arena"], pagado: ["Pagado", "bg-menta"], anulado: ["Anulado", "bg-arena"],
};

export default async function PagosAlumno({ searchParams }: PageProps<"/alumno/pagos">) {
  await requireAlumno();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: pagos } = await supabase.from("payments").select("*, lessons(starts_at)").neq("status", "anulado").order("created_at", { ascending: false });
  const pendientes = (pagos ?? []).filter((p) => p.status === "pendiente");
  const resto = (pagos ?? []).filter((p) => p.status !== "pendiente");

  return (
    <>
      <h1 className="titulo text-4xl">Pagos</h1>
      {sp.mp === "ok" && <p className="rounded-xl bg-menta p-3 text-sm">¡Gracias! Mercado Pago confirmó tu pago. Puede tardar unos minutos en aparecer.</p>}
      {sp.mp === "error" && <p className="rounded-xl bg-lila-suave p-3 text-sm">El pago no se completó. Podés intentar de nuevo.</p>}
      <p className="text-sm">Clase suelta: al reservar o el mismo día. Cuota mensual: del 1 al 10; después, 10% de recargo.</p>

      {pendientes.length === 0 && <p className="tarjeta">No tenés pagos pendientes.</p>}
      {pendientes.map((p) => {
        const recargo = p.kind === "mensual" && p.period ? recargoCuota(p.amount, p.period) : 0;
        return (
          <section key={p.id} className="tarjeta flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold">
                {p.kind === "mensual" ? `Cuota ${p.period}` : <span className="first-letter:uppercase">Clase del {fechaHora(p.lessons?.starts_at)}</span>}
              </h2>
              <p className="text-2xl font-bold">{formatoPesos(p.amount + recargo)}</p>
            </div>
            {recargo > 0 && <p className="text-sm">Incluye {formatoPesos(recargo)} de recargo por pago después del día 10.</p>}
            <form action={pagarConMercadoPago}>
              <input type="hidden" name="id" value={p.id} />
              <button className="btn-primario w-full">Pagar con Mercado Pago</button>
            </form>
            <FormAccion action={subirComprobante} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={p.id} />
              <label className="etiqueta flex-1">¿Pagaste por transferencia? Subí el comprobante
                <input type="file" name="archivo" accept="image/*,application/pdf" required className="campo py-2" />
              </label>
              <button className="btn-secundario">Subir</button>
            </FormAccion>
            <p className="text-xs">Si pagás en efectivo, Barbi lo marca como pagado en la clase.</p>
          </section>
        );
      })}

      {resto.length > 0 && (
        <section className="tarjeta flex flex-col">
          <h2 className="mb-2 text-lg font-bold">Historial</h2>
          {resto.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-arena py-3 text-sm">
              <span>{p.kind === "mensual" ? `Cuota ${p.period}` : "Clase suelta"}{p.method ? ` · ${p.method}` : ""}</span>
              <span className="font-bold">{formatoPesos(p.amount + p.surcharge)}</span>
              <span className={`chip ${ESTADO[p.status][1]}`}>{ESTADO[p.status][0]}</span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
