import type { Config } from "./config";
import { formatoPesos } from "./reglas";

export type SeccionTyc = { titulo: string; items: string[] };

// Términos y condiciones de Barbi. Los valores salen de Configuración.
export function tycSecciones(c: Config): SeccionTyc[] {
  return [
    {
      titulo: "Valores y pagos",
      items: [
        `Clase suelta: ${formatoPesos(c.precios.suelta)}, se abona al momento de reservar o el mismo día.`,
        `Mensual de 2 clases: ${formatoPesos(c.precios.mensual_2)}. Mensual de 4 clases: ${formatoPesos(c.precios.mensual_4)}.`,
        `La cuota mensual se abona del 1 al ${c.diaVencimiento}. Después de esa fecha tiene un ${c.recargoPct}% de recargo.`,
        "Se puede abonar con Mercado Pago desde la página, en efectivo o por transferencia. Si pagás por transferencia, el comprobante se sube desde tu perfil.",
      ],
    },
    {
      titulo: "Cancelaciones y reprogramaciones",
      items: [
        `Podés recuperar una clase si avisás con un mínimo de ${c.horasAviso} h (reloj, no el día anterior a la noche).`,
        `Si avisás con menos de ${c.horasAviso} h ya no puedo coordinar con otro alumno, por lo que la clase debe abonarse: con mensual se pierde la clase, con clase suelta se abona el mismo día. Sin excepción.`,
        "Los feriados no hay clase. Se recuperan en los meses que tienen 5 clases.",
        "Responsabilidad con el horario: cancelar o reprogramar seguido puede derivar en la pérdida del horario.",
      ],
    },
  ];
}

export const TYC_CIERRE =
  "Cualquier cosa que necesites conversar, siempre estoy disponible. ¡Gracias por confiar en mí para transitar esta experiencia de la música y el canto!";
