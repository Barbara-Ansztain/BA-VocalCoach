"use client";

import { useActionState } from "react";
import { crearAdmin, type EstadoPrimerUso } from "@/app/actions/primer-uso";
import { CampoContrasena } from "@/components/CampoContrasena";

export function FormPrimerUso() {
  const [estado, accion, pendiente] = useActionState<EstadoPrimerUso, FormData>(crearAdmin, {});
  return (
    <form action={accion} className="tarjeta flex flex-col gap-4">
      <label className="etiqueta">Nombre<input name="nombre" defaultValue="Barbi Ansztain" className="campo" /></label>
      <label className="etiqueta">Mail<input name="email" type="email" required className="campo" autoComplete="email" /></label>
      <label className="etiqueta">Contraseña<CampoContrasena autoComplete="new-password" minLength={8} /></label>
      {estado.error && <p className="text-sm font-bold text-[#9B2C2C]">{estado.error}</p>}
      <button disabled={pendiente} className="btn-primario">{pendiente ? "Creando..." : "Crear cuenta"}</button>
    </form>
  );
}
