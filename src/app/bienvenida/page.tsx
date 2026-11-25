import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getPerfil } from "@/lib/auth";
import { FormBienvenida } from "./FormBienvenida";

async function BienvenidaContenido() {
  const perfil = await getPerfil();
  if (!perfil) redirect("/ingresar");
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-2xl flex-col gap-5">
        <Logo />
        <h1 className="titulo text-4xl">¡Bienvenida/o{perfil.full_name ? `, ${perfil.full_name.split(" ")[0]}` : ""}!</h1>
        <p>Creá tu contraseña y leé mis pautas antes de empezar.</p>
        <FormBienvenida nombre={perfil.full_name} />
      </div>
    </main>
  );
}

export default function Bienvenida() {
  return <Suspense fallback={null}><BienvenidaContenido /></Suspense>;
}
