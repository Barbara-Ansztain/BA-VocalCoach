import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { FormIngresar } from "./FormIngresar";

async function IngresarContenido({ searchParams }: Pick<PageProps<"/ingresar">, "searchParams">) {
  const sp = await searchParams;
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Link href="/"><Logo /></Link>
        <h1 className="titulo text-4xl">Ingresar</h1>
        {sp.error === "link" && <p className="rounded-xl bg-lila-suave p-3 text-sm">El link venció o ya se usó. Pedí uno nuevo.</p>}
        <FormIngresar next={typeof sp.next === "string" ? sp.next : ""} />
        <p className="text-sm">¿Todavía no tenés cuenta? <Link href="/#consulta" className="font-bold">Escribime</Link> y te doy acceso.</p>
      </div>
    </main>
  );
}

export default function Ingresar({ searchParams }: PageProps<"/ingresar">) {
  return <Suspense fallback={null}><IngresarContenido searchParams={searchParams} /></Suspense>;
}
