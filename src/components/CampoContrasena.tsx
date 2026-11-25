"use client";

import { useState } from "react";

/** Campo de contraseña con botón de ojito para mostrarla u ocultarla. */
export function CampoContrasena({ name = "password", autoComplete = "current-password", minLength }: {
  name?: string; autoComplete?: string; minLength?: number;
}) {
  const [ver, setVer] = useState(false);
  return (
    <span className="relative block">
      <input name={name} type={ver ? "text" : "password"} required minLength={minLength} autoComplete={autoComplete} className="campo pr-12" />
      <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={ver}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ciruela/70 hover:text-ciruela">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {ver && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </span>
  );
}
