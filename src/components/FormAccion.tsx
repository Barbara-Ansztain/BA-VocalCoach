"use client";

import { useActionState, type ReactNode } from "react";

type Estado = { error?: string; ok?: string };

/** Formulario que muestra el error o la confirmación que devuelve una acción del servidor. */
export function FormAccion({ action, children, className = "" }: {
  action: (prev: Estado, form: FormData) => Promise<Estado>; children: ReactNode; className?: string;
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(action, {});
  return (
    <form action={accion} className={className} aria-busy={pendiente}>
      <fieldset disabled={pendiente} className="contents">{children}</fieldset>
      {estado.error && <p className="basis-full text-sm font-bold text-[#9B2C2C]">{estado.error}</p>}
      {estado.ok && <p className="basis-full text-sm font-bold text-petroleo">{estado.ok}</p>}
    </form>
  );
}
