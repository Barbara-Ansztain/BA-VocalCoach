import { NextResponse, type NextRequest } from "next/server";
import { WebhookSignatureValidator } from "mercadopago";
import { createAdminClient } from "@/lib/supabase/server";
import { obtenerPagoMP } from "@/lib/mercadopago";

// Mercado Pago avisa acá cuando cambia un pago. Se valida la firma y se consulta el pago a la API (no se confía en el cuerpo).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const tipo = request.nextUrl.searchParams.get("type") ?? body.type;
  const dataId = request.nextUrl.searchParams.get("data.id") ?? body?.data?.id;
  if (tipo !== "payment" || !dataId) return NextResponse.json({ ok: true });

  if (process.env.MP_WEBHOOK_SECRET) {
    try {
      WebhookSignatureValidator.validate({
        xSignature: request.headers.get("x-signature"), xRequestId: request.headers.get("x-request-id"),
        dataId: String(dataId), secret: process.env.MP_WEBHOOK_SECRET, toleranceSeconds: 600,
      });
    } catch {
      return NextResponse.json({ error: "firma inválida" }, { status: 401 });
    }
  }

  const pago = await obtenerPagoMP(String(dataId));
  if (pago.status === "approved" && pago.external_reference) {
    await createAdminClient().from("payments").update({
      status: "pagado", method: "mercadopago", mp_payment_id: String(pago.id), paid_at: pago.date_approved ?? new Date().toISOString(),
    }).eq("id", pago.external_reference).neq("status", "pagado");
  }
  return NextResponse.json({ ok: true });
}
