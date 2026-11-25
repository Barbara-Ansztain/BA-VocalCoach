import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { requireAlumno } from "@/lib/auth";
import { salir } from "@/app/actions/auth";

const LINKS = [["/alumno", "Inicio"], ["/alumno/reservar", "Reservar"], ["/alumno/pagos", "Pagos"], ["/alumno/material", "Material"], ["/alumno/grabaciones", "Grabaciones"]];

export default function LayoutAlumno({ children }: LayoutProps<"/alumno">) {
  return (
    <Suspense fallback={<p className="p-10 text-center">Cargando…</p>}>
      <Contenido>{children}</Contenido>
    </Suspense>
  );
}

async function Contenido({ children }: { children: ReactNode }) {
  const alumno = await requireAlumno();
  return (
    <div className="flex flex-1 flex-col pb-20 sm:pb-0">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-5 py-5">
        <Link href="/alumno"><Logo chico /></Link>
        <nav className="hidden gap-5 sm:flex">{LINKS.map(([h, t]) => <Link key={h} href={h}>{t}</Link>)}</nav>
        <form action={salir}>
          <button className="flex size-10 items-center justify-center rounded-full bg-menta font-bold" aria-label="Salir" title="Salir">
            {alumno.full_name.charAt(0).toUpperCase() || "?"}
          </button>
        </form>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-5 pb-10">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 flex justify-around bg-white px-2 pt-3 pb-5 text-xs sm:hidden">
        {LINKS.slice(0, 4).map(([h, t]) => <Link key={h} href={h} className="p-2">{t}</Link>)}
      </nav>
    </div>
  );
}
