import { createClient } from "@/lib/supabase/server";
import { NOMBRE_PLAN } from "@/lib/reglas";
import { Estado } from "@/components/Estado";
import { darAcceso, estadoConsulta } from "@/app/actions/admin";

export default async function Consultas() {
  const supabase = await createClient();
  const { data } = await supabase.from("consultations").select("*").order("created_at", { ascending: false }).limit(50);
  return (
    <>
      <h1 className="font-serif font-normal text-3xl leading-tight sm:text-4xl lg:text-5xl">Consultas</h1>
      <p className="text-sm">Llegan desde el formulario de la página (con los términos aceptados). “Dar acceso” le manda un mail para que cree su contraseña.</p>
      {!data?.length && <p className="tarjeta">Todavía no hay consultas.</p>}
      {data?.map((c) => (
        <section key={c.id} className="tarjeta flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{c.name}</h2><Estado valor={c.status} />
          </div>
          <p className="text-sm">{c.email}{c.phone ? ` · ${c.phone}` : ""} · {c.modality} · {c.experience} · {new Date(c.created_at).toLocaleDateString("es-AR")}</p>
          {c.message && <p className="rounded-xl bg-crema p-3">{c.message}</p>}
          {c.status !== "alumno" && (
            <div className="flex flex-wrap items-end gap-3">
              {c.phone && <a href={`https://wa.me/549${c.phone.replace(/\D/g, "").replace(/^0/, "")}`} target="_blank" rel="noreferrer" className="btn-secundario">WhatsApp</a>}
              <form action={estadoConsulta} className="flex gap-2">
                <input type="hidden" name="id" value={c.id} />
                {c.status === "nueva" && <button name="estado" value="contactada" className="btn-secundario">Marcar contactada</button>}
                <button name="estado" value="descartada" className="px-2 text-sm underline">Descartar</button>
              </form>
              <form action={darAcceso} className="ml-auto flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={c.id} />
                <label className="etiqueta">Plan
                  <select name="plan" className="campo py-2.5">{Object.entries(NOMBRE_PLAN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                </label>
                <button className="btn-primario">Dar acceso</button>
              </form>
            </div>
          )}
        </section>
      ))}
    </>
  );
}
