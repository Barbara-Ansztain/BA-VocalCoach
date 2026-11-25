"use client";

import { Tutorial, type Paso } from "./Tutorial";
import { terminarTutorial } from "@/app/actions/tutorial";

const PASOS: Paso[] = [
  { titulo: "¡Hola, Barbi!", texto: "Te muestro rápido dónde está cada cosa de tu panel." },
  { destino: "resumen", titulo: "Tu día de un vistazo", texto: "Cuántas clases tenés hoy, pagos por cobrar, consultas nuevas y lo que cobraste en el mes." },
  { destino: "agenda-hoy", titulo: "Agenda de hoy", texto: "Tus clases del día. Marcá «Asistió» o «Faltó» al terminar cada una." },
  { destino: "cobros", titulo: "Cobros", texto: "Confirmá los comprobantes de transferencia o marcá lo que te pagan en efectivo." },
  { destino: "nueva-clase", titulo: "Nueva clase", texto: "Para agendar una clase. Si es alguien nuevo (por ejemplo, alguien que no va a usar la app), lo podés cargar ahí mismo." },
  { destino: "menu", titulo: "El menú", texto: "Agenda (día, semana, mes), Alumnos, Consultas del formulario, Pagos, Material y Configuración, donde cambiás precios y horarios." },
  { titulo: "¡Listo!", texto: "Podés volver a ver esta guía con «Ver tutorial» en el menú." },
];

export function TutorialPanel({ abierto }: { abierto: boolean }) {
  return <Tutorial pasos={PASOS} abierto={abierto} onTerminar={terminarTutorial} />;
}
