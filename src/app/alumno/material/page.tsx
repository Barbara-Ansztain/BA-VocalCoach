import { requireAlumno } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export default async function MaterialAlumno() {
  await requireAlumno();
  const supabase = await createClient();
  const { data } = await supabase.from("material_assignments").select("assigned_at, materials(id, title, kind, file_path, url)").order("assigned_at", { ascending: false });
  const admin = createAdminClient();
  const items = await Promise.all((data ?? []).map(async (a) => {
    const m = a.materials as unknown as { id: string; title: string; kind: string; file_path: string | null; url: string | null };
    const link = m.file_path ? (await admin.storage.from("material").createSignedUrl(m.file_path, 3600)).data?.signedUrl : m.url;
    return { ...m, link };
  }));
  return (
    <>
      <h1 className="titulo text-4xl">Tu material</h1>
      {items.length === 0 && <p className="tarjeta">Barbi todavía no te asignó material.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((m) => (
          <a key={m.id} href={m.link ?? "#"} target="_blank" rel="noreferrer" className="tarjeta flex flex-col gap-1 hover:bg-menta">
            <span className="text-xs uppercase tracking-[1.5px] text-petroleo">{m.kind}</span>
            <span className="font-bold">{m.title}</span>
          </a>
        ))}
      </div>
    </>
  );
}
