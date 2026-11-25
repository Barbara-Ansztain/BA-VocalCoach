import { createClient } from "@/lib/supabase/server";
import { FormAccion } from "@/components/FormAccion";
import { asignarMaterial, subirMaterial } from "@/app/actions/admin";

export default async function Material() {
  const supabase = await createClient();
  const [{ data: materiales }, { data: alumnos }] = await Promise.all([
    supabase.from("materials").select("*, material_assignments(count)").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("role", "alumno").eq("active", true).order("full_name"),
  ]);
  return (
    <>
      <h1 className="titulo text-4xl">Material</h1>
      <div className="flex flex-wrap items-start gap-6">
        <FormAccion action={subirMaterial} className="tarjeta flex flex-[1_1_340px] flex-col gap-3">
          <h2 className="titulo text-2xl">Agregar material</h2>
          <label className="etiqueta">Título<input name="titulo" required className="campo" placeholder="4 vocalizaciones · rutina diaria" /></label>
          <label className="etiqueta">Tipo
            <select name="tipo" className="campo"><option value="vocalizacion">Vocalización</option><option value="partitura">Partitura</option><option value="pista">Pista</option><option value="audio">Audio</option><option value="otro">Otro</option></select>
          </label>
          <label className="etiqueta">Archivo<input type="file" name="archivo" className="campo py-2" /></label>
          <label className="etiqueta">O un link (YouTube, Drive...)<input name="url" type="url" className="campo" /></label>
          <button className="btn-primario">Agregar</button>
        </FormAccion>
        <FormAccion action={asignarMaterial} className="tarjeta flex flex-[1_1_340px] flex-col gap-3">
          <h2 className="titulo text-2xl">Asignar a alumnos</h2>
          <label className="etiqueta">Material
            <select name="material" required className="campo">{materiales?.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select>
          </label>
          <fieldset className="flex max-h-56 flex-col gap-2 overflow-y-auto">
            {alumnos?.map((a) => <label key={a.id} className="flex items-center gap-2"><input type="checkbox" name="alumnos" value={a.id} className="size-5 accent-petroleo" />{a.full_name}</label>)}
          </fieldset>
          <button className="btn-primario">Asignar</button>
        </FormAccion>
      </div>
      <section className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
        {materiales?.map((m) => (
          <div key={m.id} className="tarjeta flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[1.5px] text-petroleo">{m.kind}</span>
            <span className="font-bold">{m.title}</span>
            <span className="text-sm">Asignado a {m.material_assignments?.[0]?.count ?? 0} alumnos</span>
          </div>
        ))}
      </section>
    </>
  );
}
