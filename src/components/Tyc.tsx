"use client";

import { useState } from "react";
import { TYC_CIERRE, type SeccionTyc } from "@/lib/tyc";

export function TycTexto({ secciones }: { secciones: SeccionTyc[] }) {
  return (
    <div className="flex max-h-[52vh] flex-col gap-2.5 overflow-y-auto rounded-2xl bg-white p-5 text-sm leading-relaxed">
      {secciones.map((s) => (
        <div key={s.titulo} className="flex flex-col gap-2">
          <h3 className="mt-1 text-[13px] font-bold uppercase tracking-[1.5px] text-petroleo">{s.titulo}</h3>
          {s.items.map((i) => <p key={i}>• {i}</p>)}
        </div>
      ))}
      <p className="mt-2">{TYC_CIERRE}</p>
    </div>
  );
}

/** Casilla "Leí y acepto" con link que abre los términos en una ventana. */
export function AceptarTyc({ secciones, name = "tyc" }: { secciones: SeccionTyc[]; name?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [aceptado, setAceptado] = useState(false);
  return (
    <>
      <label className="flex items-center gap-2.5 text-[15px]">
        <input type="checkbox" name={name} required checked={aceptado} onChange={(e) => setAceptado(e.target.checked)}
          className="size-5 accent-petroleo" />
        <span>
          Leí y acepto los{" "}
          <button type="button" onClick={() => setAbierto(true)} className="font-bold text-petroleo underline">términos y condiciones</button>
        </span>
      </label>
      {abierto && (
        <div role="dialog" aria-modal="true" aria-label="Términos y condiciones"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/55 p-4" onClick={() => setAbierto(false)}>
          <div className="flex w-full max-w-2xl flex-col gap-4 rounded-3xl bg-crema p-6 sm:p-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="titulo text-3xl">Antes de empezar</h2>
            <p className="text-[15px]">Estas son mis pautas, por una cuestión de orden y respeto por el espacio.</p>
            <TycTexto secciones={secciones} />
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" className="btn-secundario" onClick={() => setAbierto(false)}>Volver</button>
              <button type="button" className="btn-primario" onClick={() => { setAceptado(true); setAbierto(false); }}>
                Aceptar y continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
