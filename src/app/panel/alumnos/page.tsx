import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NOMBRE_PLAN, type Plan } from "@/lib/reglas";

export default async function Alumnos() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("role", "alumno").order("active", { ascending: false }).order("full_name");
  return (
    <>
      <h1 className="titulo text-4xl">Alumnos</h1>
      <p className="text-sm">Los alumnos nuevos entran desde <Link href="/panel/consultas" className="font-bold">Consultas</Link> con “Dar acceso”.</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {data?.map((a) => (
          <Link key={a.id} href={`/panel/alumnos/${a.id}`} className={`tarjeta flex items-center gap-4 text-ciruela hover:bg-menta ${a.active ? "" : "opacity-60"}`}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-lila font-serif text-xl text-white">{a.full_name.charAt(0) || "?"}</span>
            <div className="min-w-0">
              <p className="truncate font-bold">{a.full_name || a.email}</p>
              <p className="text-sm">{NOMBRE_PLAN[a.plan as Plan]} · {a.modality}</p>
              {!a.tyc_accepted_at && <p className="text-xs">Todavía no activó su cuenta</p>}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
