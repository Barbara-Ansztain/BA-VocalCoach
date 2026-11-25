"use client";

import { useActionState } from "react";
import { completarBienvenida, type EstadoForm } from "@/app/actions/auth";
import { TycTexto } from "@/components/Tyc";

export function FormBienvenida({ nombre }: { nombre: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(completarBienvenida, {});
  return (
    <form action={accion} className="flex flex-col gap-4">
      <div className="tarjeta grid gap-4 sm:grid-cols-2">
        <label className="etiqueta">Nombre y apellido<input name="nombre" defaultValue={nombre} required className="campo" /></label>
        <label className="etiqueta">Contraseña<input name="password" type="password" minLength={8} required className="campo" autoComplete="new-password" /></label>
      </div>
      <h2 className="titulo text-2xl">Términos y condiciones</h2>
      <TycTexto />
      <label className="flex items-center gap-2.5 text-[15px]">
        <input type="checkbox" name="tyc" required className="size-5 accent-petroleo" /> Leí y acepto los términos y condiciones
      </label>
      {estado.error && <p className="text-sm font-bold text-[#9B2C2C]">{estado.error}</p>}
      <button disabled={pendiente} className="btn-primario self-end">Aceptar y continuar</button>
    </form>
  );
}
