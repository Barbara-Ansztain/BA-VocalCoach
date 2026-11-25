import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { Logo } from "@/components/Logo";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { salir } from "@/app/actions/auth";
import { TutorialPanel } from "@/components/TutorialPanel";
import { BotonTutorial } from "@/components/Tutorial";
import { Cargador } from "@/components/Cargador";
import { MenuDesplegable } from "@/components/MenuDesplegable";

const LINKS = [
  ["/panel", "Hoy"], ["/panel/agenda", "Agenda"], ["/panel/alumnos", "Alumnos"], ["/panel/consultas", "Consultas"],
  ["/panel/pagos", "Pagos"], ["/panel/material", "Material"], ["/panel/configuracion", "Configuración"],
];

export default function LayoutPanel({ children }: LayoutProps<"/panel">) {
  // El menú se dibuja al instante (es fijo); solo el contenido espera los datos.
  const enlaces = LINKS.map(([href, texto]) => (
    <Link key={href} href={href} className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-white/10">
      {texto}
      {texto === "Consultas" && <Suspense fallback={null}><ConsultasNuevas /></Suspense>}
    </Link>
  ));
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Celular y tablet: barra arriba con menú desplegable */}
      <MenuDesplegable className="group sticky top-0 z-30 bg-ciruela text-crema lg:hidden">
        <summary data-tour="menu" className="flex cursor-pointer list-none items-center justify-between px-5 py-3 [&::-webkit-details-marker]:hidden">
          <Logo claro chico />
          <span className="flex size-11 items-center justify-center rounded-xl hover:bg-white/10" aria-label="Menú">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path className="group-open:hidden" d="M4 7h16M4 12h16M4 17h16" />
              <path className="hidden group-open:block" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </span>
        </summary>
        <nav className="flex flex-col gap-1 px-3 pb-4">
          {enlaces}
          <BotonTutorial className="px-3 py-3 text-left text-sm opacity-80" />
          <form action={salir}><button className="px-3 py-3 text-sm opacity-80">Salir</button></form>
        </nav>
      </MenuDesplegable>
      {/* Escritorio: menú lateral fijo */}
      <nav data-tour="menu" className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 bg-ciruela px-4 py-8 text-crema lg:flex">
        <div className="px-3 pb-7"><Logo claro /></div>
        {enlaces}
        <BotonTutorial className="mt-auto px-3 py-3 text-left text-sm opacity-80 hover:opacity-100" />
        <form action={salir}><button className="px-3 py-3 text-sm opacity-80 hover:opacity-100">Salir</button></form>
      </nav>
      <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
        <Suspense fallback={<Cargador />}><SoloAdmin>{children}</SoloAdmin></Suspense>
      </main>
    </div>
  );
}

async function SoloAdmin({ children }: { children: ReactNode }) {
  await connection(); // la sesión se valida en cada pedido
  const perfil = await requireAdmin();
  return <>{children}<TutorialPanel abierto={!perfil.tour_completed_at} /></>;
}

async function ConsultasNuevas() {
  await connection();
  await requireAdmin();
  const supabase = await createClient();
  const { count } = await supabase.from("consultations").select("id", { count: "exact", head: true }).eq("status", "nueva");
  return count ? <span className="rounded-full bg-lila px-2 text-sm text-white">{count}</span> : null;
}
