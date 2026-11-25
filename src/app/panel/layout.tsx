import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { salir } from "@/app/actions/auth";

const LINKS = [
  ["/panel", "Hoy"], ["/panel/agenda", "Agenda"], ["/panel/alumnos", "Alumnos"], ["/panel/consultas", "Consultas"],
  ["/panel/pagos", "Pagos"], ["/panel/material", "Material"], ["/panel/configuracion", "Configuración"],
];

export default function LayoutPanel({ children }: LayoutProps<"/panel">) {
  return (
    <Suspense fallback={<p className="p-10 text-center">Cargando…</p>}>
      <Contenido>{children}</Contenido>
    </Suspense>
  );
}

async function Contenido({ children }: { children: ReactNode }) {
  await requireAdmin();
  const supabase = await createClient();
  const { count } = await supabase.from("consultations").select("id", { count: "exact", head: true }).eq("status", "nueva");
  return (
    <div className="flex min-h-screen flex-wrap">
      <nav className="flex max-w-[260px] flex-[1_1_220px] flex-col gap-1.5 bg-ciruela px-5 py-8 text-crema max-sm:max-w-none">
        <div className="px-3 pb-7"><Logo claro /></div>
        {LINKS.map(([href, texto]) => (
          <Link key={href} href={href} className="flex justify-between rounded-xl p-3 hover:bg-white/10">
            {texto}
            {texto === "Consultas" && !!count && <span className="rounded-full bg-lila px-2 text-sm text-white">{count}</span>}
          </Link>
        ))}
        <form action={salir} className="mt-auto pt-6"><button className="p-3 text-sm opacity-80 hover:opacity-100">Salir</button></form>
      </nav>
      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-7 p-6 sm:p-10">{children}</main>
    </div>
  );
}
