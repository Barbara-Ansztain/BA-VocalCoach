"use client";

import { useRef, type ReactNode } from "react";

/** Menú desplegable del celular: se cierra al elegir una opción. */
export function MenuDesplegable({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details
      ref={ref}
      className={className}
      onClick={(e) => {
        const tocado = (e.target as HTMLElement).closest("a, button");
        if (tocado && ref.current) ref.current.open = false;
      }}
    >
      {children}
    </details>
  );
}
