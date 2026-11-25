import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getPerfil } from "@/lib/auth";
import { FormBienvenida } from "./FormBienvenida";
import { getConfig } from "@/lib/config";
import { tycSecciones } from "@/lib/tyc";

async function BienvenidaContenido() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/ingresar");
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-2xl flex-col gap-5">
        <Logo />
        <h1 className="font-serif font-normal text-3xl leading-tight sm:text-4xl lg:text-5xl">¡Bienvenida/o{perfil.full_name ? `, ${perfil.full_name.split(" ")[0]}` : ""}!</h1>
        <p>Creá tu contraseña y leé mis pautas antes de empezar.</p>
        <FormBienvenida nombre={perfil.full_name} tyc={tycSecciones(await getConfig())} />
      </div>
    </main>
  );
}

export default function Bienvenida() {
  return <Suspense fallback={null}><BienvenidaContenido /></Suspense>;
}
