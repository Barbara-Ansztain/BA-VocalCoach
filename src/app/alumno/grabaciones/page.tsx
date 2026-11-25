import { requireAlumno } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { FormAccion } from "@/components/FormAccion";
import { subirGrabacion } from "@/app/actions/alumno";

export default async function Grabaciones() {
  await requireAlumno();
  const supabase = await createClient();
  const { data } = await supabase.from("recordings").select("*").order("created_at", { ascending: false });
  const admin = createAdminClient();
  const items = await Promise.all((data ?? []).map(async (g) => ({
    ...g, url: (await admin.storage.from("grabaciones").createSignedUrl(g.file_path, 3600)).data?.signedUrl,
  })));
  return (
    <>
      <h1 className="titulo text-4xl">Grabaciones</h1>
      <FormAccion action={subirGrabacion} className="tarjeta flex flex-wrap items-end gap-3 bg-menta">
        <label className="etiqueta flex-[1_1_200px]">Título (opcional)<input name="titulo" className="campo" placeholder="Ej. ejercicio de sirena" /></label>
        <label className="etiqueta flex-[1_1_200px]">Audio<input type="file" name="archivo" accept="audio/*" required className="campo py-2" /></label>
        <button className="btn-primario">Subir grabación</button>
      </FormAccion>
      {items.map((g) => (
        <section key={g.id} className="tarjeta flex flex-col gap-3">
          <p className="font-bold">{g.title || "Grabación"} · {new Date(g.created_at).toLocaleDateString("es-AR")}</p>
          {g.url && <audio controls src={g.url} className="w-full" />}
          {g.comment
            ? <p className="rounded-xl bg-lila-suave p-3 text-sm"><strong>Barbi:</strong> {g.comment}</p>
            : <p className="text-sm">Todavía sin comentarios.</p>}
        </section>
      ))}
    </>
  );
}
