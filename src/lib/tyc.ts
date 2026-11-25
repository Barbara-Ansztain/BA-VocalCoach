import { formatoPesos, PRECIOS } from "./reglas";

// Términos y condiciones de Barbi. Se muestran al crear usuario y al enviar el formulario de consulta.
export const TYC_VERSION = "2026-11";

export const TYC = [
  {
    titulo: "Valores y pagos",
    items: [
      `Clase suelta: ${formatoPesos(PRECIOS.suelta)}, se abona al momento de reservar o el mismo día.`,
      `Mensual de 2 clases: ${formatoPesos(PRECIOS.mensual_2)}. Mensual de 4 clases: ${formatoPesos(PRECIOS.mensual_4)}.`,
      "La cuota mensual se abona del 1 al 10. Después de esa fecha tiene un 10% de recargo.",
      "Se puede abonar con Mercado Pago desde la página, en efectivo o por transferencia. Si pagás por transferencia, el comprobante se sube desde tu perfil.",
    ],
  },
  {
    titulo: "Cancelaciones y reprogramaciones",
    items: [
      "Podés recuperar una clase si avisás con un mínimo de 24 h (reloj, no el día anterior a la noche).",
      "Si avisás con menos de 24 h ya no puedo coordinar con otro alumno, por lo que la clase debe abonarse: con mensual se pierde la clase, con clase suelta se abona el mismo día. Sin excepción.",
      "Los feriados no hay clase. Se recuperan en los meses que tienen 5 clases.",
      "Responsabilidad con el horario: cancelar o reprogramar seguido puede derivar en la pérdida del horario.",
    ],
  },
];

export const TYC_CIERRE =
  "Cualquier cosa que necesites conversar, siempre estoy disponible. ¡Gracias por confiar en mí para transitar esta experiencia de la música y el canto!";
