"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

export type Paso = {
  /** Valor de data-tour del elemento a resaltar. Sin destino: el paso se muestra centrado. */
  destino?: string;
  titulo: string;
  texto: string;
};

type Caja = { top: number; left: number; width: number; height: number };

/** El primer elemento visible con ese data-tour (puede haber uno para celular y otro para compu). */
function buscar(destino: string) {
  return [...document.querySelectorAll<HTMLElement>(`[data-tour="${destino}"]`)].find((el) => el.offsetParent !== null || el.getClientRects().length > 0) ?? null;
}

/**
 * Tutorial paso a paso: oscurece la pantalla y deja iluminado solo lo que hay que tocar.
 * Se muestra la primera vez que alguien entra; al terminar o saltearlo se avisa con onTerminar.
 */
export function Tutorial({ pasos, abierto: abiertoInicial, onTerminar }: { pasos: Paso[]; abierto: boolean; onTerminar: () => Promise<void> }) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const [i, setI] = useState(0);
  const [caja, setCaja] = useState<Caja | null>(null);
  const paso = pasos[i];

  const medir = useCallback(() => {
    if (!paso?.destino) return setCaja(null);
    const el = buscar(paso.destino);
    if (!el) return setCaja(null);
    const r = el.getBoundingClientRect();
    setCaja({ top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 });
  }, [paso]);

  useLayoutEffect(() => {
    if (!abierto || !paso?.destino) return;
    const el = buscar(paso.destino);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setTimeout(medir, 350);
    return () => clearTimeout(t);
  }, [abierto, paso, medir]);

  useEffect(() => {
    if (!abierto) return;
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") void cerrar(); };
    window.addEventListener("keydown", tecla);
    return () => { window.removeEventListener("resize", medir); window.removeEventListener("scroll", medir, true); window.removeEventListener("keydown", tecla); };
  });

  // Permite volver a abrirlo desde el botón "Ver tutorial"
  useEffect(() => {
    const abrir = () => { setI(0); setAbierto(true); };
    window.addEventListener("abrir-tutorial", abrir);
    return () => window.removeEventListener("abrir-tutorial", abrir);
  }, []);

  async function cerrar() {
    setAbierto(false);
    await onTerminar();
  }

  if (!abierto || !paso) return null;
  const ultimo = i === pasos.length - 1;
  const ancho = typeof window === "undefined" ? 360 : Math.min(360, window.innerWidth - 32);
  const alto = typeof window === "undefined" ? 800 : window.innerHeight;
  const abajo = caja ? caja.top + caja.height + 220 < alto : false;
  const estiloTarjeta: React.CSSProperties = caja
    ? {
        width: ancho,
        left: Math.max(16, Math.min(caja.left, (typeof window === "undefined" ? 400 : window.innerWidth) - ancho - 16)),
        ...(abajo ? { top: caja.top + caja.height + 12 } : { bottom: alto - caja.top + 12 }),
      }
    : { width: ancho, left: "50%", top: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={paso.titulo}>
      {/* Fondo oscuro con un "agujero" sobre el elemento resaltado */}
      {caja ? (
        <div className="pointer-events-none fixed rounded-2xl ring-4 ring-menta transition-all duration-300 motion-reduce:transition-none"
          style={{ ...caja, boxShadow: "0 0 0 9999px rgba(47, 31, 51, 0.72)" }} />
      ) : (
        <div className="fixed inset-0 bg-[#2f1f33]/72" />
      )}
      <div className="fixed flex flex-col gap-3 rounded-2xl bg-white p-5 text-ciruela shadow-2xl" style={estiloTarjeta}>
        <p className="text-xs font-bold uppercase tracking-wide text-petroleo">Paso {i + 1} de {pasos.length}</p>
        <h2 className="font-serif text-2xl leading-tight">{paso.titulo}</h2>
        <p className="text-[16px] leading-relaxed">{paso.texto}</p>
        <div className="mt-1 flex items-center gap-2">
          <button type="button" onClick={() => void cerrar()} className="mr-auto px-1 py-2 text-sm underline">Saltear</button>
          {i > 0 && <button type="button" onClick={() => setI(i - 1)} className="btn-secundario px-4 py-2">Atrás</button>}
          <button type="button" autoFocus onClick={() => (ultimo ? void cerrar() : setI(i + 1))} className="btn-primario px-5 py-2">
            {ultimo ? "¡Listo!" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BotonTutorial({ className = "" }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event("abrir-tutorial"))}>
      Ver tutorial
    </button>
  );
}
