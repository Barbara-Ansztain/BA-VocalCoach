"use client";

import { useActionState } from "react";
import { enviarConsulta, type EstadoConsulta } from "@/app/actions/consulta";
import { AceptarTyc } from "./Tyc";

export function FormConsulta() {
  const [estado, accion, enviando] = useActionState<EstadoConsulta, FormData>(enviarConsulta, { ok: false });
  if (estado.ok)
    return (
      <div className="tarjeta flex flex-[1.4_1_420px] flex-col gap-3 p-8">
        <h2 className="titulo text-3xl">¡Gracias por escribirme!</h2>
        <p>Te contacto en estos días para coordinar tu primera clase.</p>
      </div>
    );
  return (
    <form action={accion} className="tarjeta grid flex-[1.4_1_420px] grid-cols-1 gap-4 p-8 sm:grid-cols-2">
      <h2 className="titulo text-3xl sm:col-span-2">Escribime y coordinamos</h2>
      <label className="etiqueta">Nombre<input name="nombre" required className="campo" placeholder="Tu nombre" /></label>
      <label className="etiqueta">Mail<input name="email" type="email" required className="campo" placeholder="tu@mail.com" /></label>
      <label className="etiqueta">WhatsApp<input name="telefono" type="tel" className="campo" placeholder="11 ..." /></label>
      <label className="etiqueta">Modalidad
        <select name="modalidad" className="campo"><option>Presencial</option><option>Online</option><option>Me da igual</option></select>
      </label>
      <label className="etiqueta sm:col-span-2">¿Cantaste antes?
        <select name="experiencia" className="campo"><option>Nunca</option><option>Un poco</option><option>Sí, con clases</option></select>
      </label>
      <label className="etiqueta sm:col-span-2">¿Qué te gustaría trabajar?
        <textarea name="mensaje" rows={3} className="campo" placeholder="Una audición, ganar confianza, cuidar la voz..." />
      </label>
      <div className="sm:col-span-2"><AceptarTyc /></div>
      {estado.error && <p className="text-sm font-bold text-[#9B2C2C] sm:col-span-2">{estado.error}</p>}
      <button disabled={enviando} className="btn-primario sm:col-span-2">{enviando ? "Enviando..." : "Enviar consulta"}</button>
    </form>
  );
}
