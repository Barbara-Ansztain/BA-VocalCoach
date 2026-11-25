"use client";

import { useActionState, useState } from "react";
import { ingresar, recuperar, type EstadoForm } from "@/app/actions/auth";
import { CampoContrasena } from "@/components/CampoContrasena";

export function FormIngresar({ next }: { next: string }) {
  const [modo, setModo] = useState<"login" | "recuperar">("login");
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(modo === "login" ? ingresar : recuperar, {});
  return (
    <form action={accion} className="tarjeta flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="etiqueta">Mail<input name="email" type="email" required className="campo" autoComplete="email" /></label>
      {modo === "login" && (
        <label className="etiqueta">Contraseña<CampoContrasena /></label>
      )}
      {estado.error && <p className="text-sm font-bold text-[#9B2C2C]">{estado.error}</p>}
      {estado.ok && <p className="rounded-xl bg-menta p-3 text-sm">{estado.ok}</p>}
      <button disabled={pendiente} className="btn-primario">{modo === "login" ? "Entrar" : "Mandarme el link"}</button>
      <button type="button" className="text-sm underline" onClick={() => setModo(modo === "login" ? "recuperar" : "login")}>
        {modo === "login" ? "Me olvidé la contraseña" : "Volver a ingresar"}
      </button>
    </form>
  );
}
