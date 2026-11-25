"use client";

import { Tutorial, type Paso } from "./Tutorial";
import { terminarTutorial } from "@/app/actions/tutorial";

const PASOS: Paso[] = [
  { titulo: "¡Bienvenida/o!", texto: "Te muestro en un minuto cómo usar tu espacio de clases. Tocá «Siguiente» para avanzar." },
  { destino: "proxima", titulo: "Tu próxima clase", texto: "Acá ves el día y la hora de tu próxima clase. Si es online, desde acá entrás a Zoom." },
  { destino: "reprogramar", titulo: "Si no podés venir", texto: "Tocá «Reprogramar» para elegir otro horario, o «cancelar». Avisá con 24 horas de anticipación para no perder la clase." },
  { destino: "virtual", titulo: "¿Te vas de vacaciones?", texto: "Si no podés venir pero tenés conexión, tocá «Tomarla virtual»: te llega el link de Zoom y no perdés la clase." },
  { destino: "pagos", titulo: "Tus pagos", texto: "Acá ves si tenés algo para pagar. Podés pagar con Mercado Pago o subir el comprobante de la transferencia." },
  { destino: "grabaciones", titulo: "Tus grabaciones", texto: "Podés subir audios cantando y Barbi te deja sus comentarios." },
  { destino: "menu", titulo: "El menú", texto: "Desde acá vas a Inicio, Reservar una clase, Pagos y tu Material. Si te perdés, tocá «Inicio»." },
  { titulo: "¡Eso es todo!", texto: "Si querés ver esta guía otra vez, tocá «Ver tutorial» arriba de todo. ¡Nos vemos en clase!" },
];

export function TutorialAlumno({ abierto }: { abierto: boolean }) {
  return <Tutorial pasos={PASOS} abierto={abierto} onTerminar={terminarTutorial} />;
}
