"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

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
  const [pantalla, setPantalla] = useState({ ancho: 1024, alto: 768 });
  const [altoTarjeta, setAltoTarjeta] = useState(230);
  const tarjeta = useRef<HTMLDivElement>(null);
  const paso = pasos[i];

  const medir = useCallback(() => {
    // Solo actualiza si algo cambió (se llama en cada cuadro)
    const igual = <T extends object>(a: T | null, b: T | null) => JSON.stringify(a) === JSON.stringify(b);
    const p = { ancho: window.innerWidth, alto: window.innerHeight };
    setPantalla((ant) => (igual(ant, p) ? ant : p));
    const h = tarjeta.current?.offsetHeight;
    if (h) setAltoTarjeta((ant) => (ant === h ? ant : h));
    const el = paso?.destino ? buscar(paso.destino) : null;
    const r = el?.getBoundingClientRect();
    const nueva = r ? { top: Math.round(r.top - 8), left: Math.round(r.left - 8), width: Math.round(r.width + 16), height: Math.round(r.height + 16) } : null;
    setCaja((ant) => (igual(ant, nueva) ? ant : nueva));
  }, [paso]);

  useLayoutEffect(() => {
    if (!abierto) return;
    const el = paso?.destino ? buscar(paso.destino) : null;
    // Solo se mueve la página si el elemento no se ve entero y entra en la pantalla
    const r = el?.getBoundingClientRect();
    if (el && r && r.height < window.innerHeight && (r.top < 0 || r.bottom > window.innerHeight)) el.scrollIntoView({ block: "center", behavior: "smooth" });
    const raf = requestAnimationFrame(medir);
    const t = setTimeout(medir, 350);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [abierto, paso, medir]);

  useEffect(() => {
    if (!abierto) return;
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    // Re-mide en cada cuadro: así el resaltado acompaña el scroll y los cambios de la página sin quedarse atrás
    let cuadro = 0;
    const seguir = () => { medir(); cuadro = requestAnimationFrame(seguir); };
    cuadro = requestAnimationFrame(seguir);
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") void cerrar(); };
    window.addEventListener("keydown", tecla);
    return () => { cancelAnimationFrame(cuadro); window.removeEventListener("resize", medir); window.removeEventListener("scroll", medir, true); window.removeEventListener("keydown", tecla); };
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
  const estiloTarjeta = posicionTarjeta(caja, pantalla, altoTarjeta);

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={paso.titulo}>
      {/* Fondo oscuro con un "agujero" sobre el elemento resaltado */}
      {caja ? (
        <div className="pointer-events-none fixed rounded-2xl ring-4 ring-menta"
          style={{ ...caja, boxShadow: "0 0 0 9999px rgba(47, 31, 51, 0.72)" }} />
      ) : (
        <div className="fixed inset-0 bg-[#2f1f33]/72" />
      )}
      <div ref={tarjeta} className="fixed flex max-h-[calc(100dvh-32px)] flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-5 text-ciruela shadow-2xl" style={estiloTarjeta}>
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

const MARGEN = 16;
const SEPARACION = 12;

/** Ubica la tarjeta donde haya lugar: abajo, arriba, a la derecha o a la izquierda del elemento.
 *  Si no entra en ningún lado (ej. el menú lateral, que ocupa todo el alto), queda dentro de la pantalla igual. */
function posicionTarjeta(caja: Caja | null, pantalla: { ancho: number; alto: number }, alto: number): React.CSSProperties {
  const ancho = Math.min(360, pantalla.ancho - MARGEN * 2);
  const entreX = (x: number) => Math.max(MARGEN, Math.min(x, pantalla.ancho - ancho - MARGEN));
  const entreY = (y: number) => Math.max(MARGEN, Math.min(y, pantalla.alto - alto - MARGEN));
  if (!caja) return { width: ancho, left: (pantalla.ancho - ancho) / 2, top: entreY((pantalla.alto - alto) / 2) };
  const abajo = caja.top + caja.height + SEPARACION;
  const arriba = caja.top - SEPARACION - alto;
  const derecha = caja.left + caja.width + SEPARACION;
  const izquierda = caja.left - SEPARACION - ancho;
  if (abajo + alto <= pantalla.alto - MARGEN) return { width: ancho, left: entreX(caja.left), top: abajo };
  if (arriba >= MARGEN) return { width: ancho, left: entreX(caja.left), top: arriba };
  if (derecha + ancho <= pantalla.ancho - MARGEN) return { width: ancho, left: derecha, top: entreY(caja.top + caja.height / 2 - alto / 2) };
  if (izquierda >= MARGEN) return { width: ancho, left: izquierda, top: entreY(caja.top + caja.height / 2 - alto / 2) };
  return { width: ancho, left: entreX((pantalla.ancho - ancho) / 2), top: pantalla.alto - alto - MARGEN };
}

export function BotonTutorial({ className = "" }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event("abrir-tutorial"))}>
      Ver tutorial
    </button>
  );
}
