import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

function cliente() {
  if (!process.env.MP_ACCESS_TOKEN) throw new Error("Falta MP_ACCESS_TOKEN");
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
}

export async function crearPreferencia(p: { pagoId: string; titulo: string; monto: number; email: string }) {
  const site = process.env.NEXT_PUBLIC_SITE_URL!;
  const pref = await new Preference(cliente()).create({
    body: {
      items: [{ id: p.pagoId, title: p.titulo, quantity: 1, unit_price: p.monto, currency_id: "ARS" }],
      payer: { email: p.email },
      external_reference: p.pagoId,
      notification_url: `${site}/api/mercadopago/webhook`,
      back_urls: {
        success: `${site}/alumno/pagos?mp=ok`,
        pending: `${site}/alumno/pagos?mp=pendiente`,
        failure: `${site}/alumno/pagos?mp=error`,
      },
      auto_return: "approved",
    },
  });
  return { id: pref.id!, url: pref.init_point! };
}

export async function obtenerPagoMP(id: string) {
  return new Payment(cliente()).get({ id });
}
