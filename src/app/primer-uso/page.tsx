import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { hayAdmin } from "@/app/actions/primer-uso";
import { FormPrimerUso } from "./FormPrimerUso";

// Solo funciona una vez: crea la cuenta de Barbi como administradora. Después redirige a /ingresar.
async function Contenido() {
  await connection(); // no prerender en build (necesita Supabase en runtime)
  if (await hayAdmin()) redirect("/ingresar");
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-5">
        <Logo />
        <h1 className="font-serif font-normal text-3xl leading-tight sm:text-4xl lg:text-5xl">Crear tu cuenta de administración</h1>
        <p className="text-sm">Esta pantalla aparece una sola vez. Con esta cuenta entrás al panel para manejar alumnos, agenda, pagos y precios.</p>
        <FormPrimerUso />
      </div>
    </main>
  );
}

export default function PrimerUso() {
  return <Suspense fallback={null}><Contenido /></Suspense>;
}
