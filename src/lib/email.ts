import nodemailer from "nodemailer";
import { fechaHora } from "./reglas";

// Los mails salen por Gmail (o cualquier SMTP) con una "contraseña de aplicación".
// SMTP_USER = la cuenta (ej. bavocalcoach@gmail.com), SMTP_PASS = la contraseña de aplicación de 16 letras.
const usuario = process.env.SMTP_USER;
const transporte = usuario && process.env.SMTP_PASS
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: usuario, pass: process.env.SMTP_PASS },
    })
  : null;
const FROM = `"BA - Vocal Coach" <${usuario}>`;

function plantilla(titulo: string, cuerpo: string) {
  return `<div style="font-family:Arial,sans-serif;background:#F5EFE6;padding:32px;color:#49304F">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:28px">
    <p style="margin:0 0 24px;font-family:Georgia,serif"><span style="font-size:28px;color:#9B7BB5">BA</span> <em style="font-size:18px">Vocal Coach</em></p>
    <h1 style="font-family:Georgia,serif;font-weight:400;font-size:26px;margin:0 0 16px">${titulo}</h1>
    ${cuerpo}
  </div></div>`;
}

async function enviar(to: string | null | undefined, subject: string, html: string) {
  if (!to) return;
  if (!transporte) {
    console.warn("[email] Falta SMTP_USER / SMTP_PASS; no se envió:", subject, "→", to);
    return;
  }
  await transporte.sendMail({ from: FROM, to, subject, html, replyTo: process.env.ADMIN_EMAIL || undefined });
}

/** Aviso de agenda al reservar o reprogramar. Si es online lleva el link de Zoom. */
export async function mailClaseAgendada(p: {
  to: string | null; nombre: string; inicio: string; modalidad: "presencial" | "online"; zoomUrl?: string | null; reprogramada?: boolean;
}) {
  const cuando = fechaHora(p.inicio);
  const donde = p.modalidad === "online"
    ? p.zoomUrl
      ? `<p>Es online. Entrá con este link:</p><p><a href="${p.zoomUrl}" style="background:#286B68;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;display:inline-block">Entrar a Zoom</a></p>`
      : `<p>Es online. Te mando el link de Zoom antes de la clase.</p>`
    : `<p>Es presencial, en Palermo.</p>`;
  await enviar(
    p.to,
    p.reprogramada ? `Clase reprogramada: ${cuando}` : `Clase agendada: ${cuando}`,
    plantilla(
      `¡Hola, ${p.nombre}!`,
      `<p>Tu clase quedó ${p.reprogramada ? "reprogramada" : "agendada"} para el <strong>${cuando}</strong>.</p>${donde}
       <p style="font-size:13px">Si no podés venir, avisá con al menos 24 h desde tu perfil para poder recuperarla.</p>`,
    ),
  );
}

export async function mailNuevaConsulta(c: { nombre: string; email: string; telefono?: string | null; mensaje?: string | null }) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) return;
  await enviar(to, `Nueva consulta de ${c.nombre}`, plantilla("Nueva consulta",
    `<p><strong>${c.nombre}</strong> · ${c.email}${c.telefono ? " · " + c.telefono : ""}</p><p>${c.mensaje ?? ""}</p>`));
}
