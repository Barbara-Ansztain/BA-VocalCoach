import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { fechaHora, formatoPesos, NOMBRE_PLAN, periodoActual, type Plan } from "@/lib/reglas";
import { FormAccion } from "@/components/FormAccion";
import { Estado } from "@/components/Estado";
import { agregarNota, comentarGrabacion, guardarAlumno } from "@/app/actions/admin";

export default async function Ficha({ params }: PageProps<"/panel/alumnos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: a }, { data: clases }, { data: pagos }, { data: notas }, { data: grabaciones }, { data: material }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("lessons").select("*").eq("student_id", id).order("starts_at", { ascending: false }).limit(12),
    supabase.from("payments").select("*").eq("student_id", id).neq("status", "anulado").order("created_at", { ascending: false }).limit(8),
    supabase.from("lesson_notes").select("*").eq("student_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("recordings").select("*").eq("student_id", id).order("created_at", { ascending: false }).limit(5),
    supabase.from("material_assignments").select("materials(title)").eq("student_id", id),
  ]);
  if (!a) notFound();
  const mes = periodoActual();
  const reprogMes = (clases ?? []).filter((c) => ["reprogramada", "cancelada", "perdida"].includes(c.status) && c.cancelled_at?.startsWith(mes)).length;
  const debe = (pagos ?? []).filter((p) => p.status === "pendiente").length;
  const admin = createAdminClient();
  const audios = await Promise.all((grabaciones ?? []).map(async (g) => ({ ...g, url: (await admin.storage.from("grabaciones").createSignedUrl(g.file_path, 3600)).data?.signedUrl })));

  return (
    <>
      <Link href="/panel/alumnos" className="text-sm">← Alumnos</Link>
      <header className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <span className="flex size-[72px] items-center justify-center rounded-full bg-lila font-serif text-3xl text-white">{a.full_name.charAt(0)}</span>
          <div>
            <h1 className="titulo text-4xl">{a.full_name}</h1>
            <p className="text-sm">{a.email}{a.phone ? ` · ${a.phone}` : ""}</p>
          </div>
        </div>
        {a.phone && <a href={`https://wa.me/549${a.phone.replace(/\D/g, "").replace(/^0/, "")}`} target="_blank" rel="noreferrer" className="btn-secundario">WhatsApp</a>}
      </header>
      <section className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
        <div className="tarjeta p-4"><p className="text-[13px]">Plan</p><p className="mt-1 font-bold">{NOMBRE_PLAN[a.plan as Plan]}</p></div>
        <div className="tarjeta p-4"><p className="text-[13px]">Horario habitual</p><p className="mt-1 font-bold">{a.usual_slot || "—"} · {a.modality}</p></div>
        <div className={`rounded-2xl p-4 ${debe ? "bg-lila-suave" : "bg-white"}`}><p className="text-[13px]">Pagos pendientes</p><p className="mt-1 font-bold">{debe}</p></div>
        <div className={`rounded-2xl p-4 ${reprogMes >= 3 ? "bg-lila-suave" : "bg-white"}`}><p className="text-[13px]">Cancelaciones del mes</p><p className="mt-1 font-bold">{reprogMes}</p></div>
        <div className="rounded-2xl bg-menta p-4"><p className="text-[13px]">Términos y condiciones</p><p className="mt-1 font-bold">{a.tyc_accepted_at ? `Aceptados el ${new Date(a.tyc_accepted_at).toLocaleDateString("es-AR")}` : "Pendiente"}</p></div>
      </section>
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex flex-[2_1_420px] flex-col gap-6">
          <section className="tarjeta flex flex-col gap-3">
            <h2 className="titulo text-2xl">Notas de clase <span className="font-sans text-[13px]">· solo las ves vos</span></h2>
            {notas?.map((n) => <p key={n.id} className="rounded-xl bg-crema p-3 text-sm"><strong>{new Date(n.created_at).toLocaleDateString("es-AR")}</strong> · {n.body}</p>)}
            <FormAccion action={agregarNota} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={a.id} />
              <textarea name="nota" rows={2} className="campo" placeholder="Qué trabajaron, qué tiene que practicar..." />
              <button className="btn-secundario self-end">Guardar nota</button>
            </FormAccion>
          </section>
          <section className="tarjeta flex flex-col">
            <h2 className="titulo mb-2 text-2xl">Clases</h2>
            {clases?.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-arena py-2.5">
                <span className="text-sm first-letter:uppercase">{fechaHora(c.starts_at)}</span><Estado valor={c.status} />
              </div>
            ))}
          </section>
          <FormAccion action={guardarAlumno} className="tarjeta grid gap-3 sm:grid-cols-2">
            <h2 className="titulo text-2xl sm:col-span-2">Editar ficha</h2>
            <input type="hidden" name="id" value={a.id} />
            <label className="etiqueta">Nombre<input name="nombre" defaultValue={a.full_name} className="campo" /></label>
            <label className="etiqueta">WhatsApp<input name="telefono" defaultValue={a.phone ?? ""} className="campo" /></label>
            <label className="etiqueta">Plan
              <select name="plan" defaultValue={a.plan} className="campo">{Object.entries(NOMBRE_PLAN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </label>
            <label className="etiqueta">Modalidad
              <select name="modalidad" defaultValue={a.modality} className="campo"><option value="presencial">Presencial</option><option value="online">Online</option></select>
            </label>
            <label className="etiqueta">Horario habitual<input name="horario" defaultValue={a.usual_slot ?? ""} placeholder="Jueves 16:00" className="campo" /></label>
            <label className="flex items-center gap-2 self-end pb-3"><input type="checkbox" name="activo" defaultChecked={a.active} className="size-5 accent-petroleo" /> Alumno activo</label>
            <button className="btn-primario sm:col-span-2">Guardar</button>
          </FormAccion>
        </div>
        <div className="flex flex-[1_1_280px] flex-col gap-6">
          <section className="tarjeta flex flex-col gap-2.5">
            <h2 className="titulo text-2xl">Pagos</h2>
            {pagos?.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{p.kind === "mensual" ? `Cuota ${p.period}` : "Suelta"} · {formatoPesos(p.amount + p.surcharge)}</span><Estado valor={p.status} />
              </div>
            ))}
          </section>
          <section className="tarjeta flex flex-col gap-2">
            <div className="flex items-center justify-between"><h2 className="titulo text-2xl">Material</h2><Link href="/panel/material" className="text-sm font-bold">+ Asignar</Link></div>
            {material?.map((m, i) => <p key={i} className="text-sm">{(m.materials as unknown as { title: string })?.title}</p>)}
          </section>
          <section className="flex flex-col gap-3 rounded-2xl bg-menta p-6">
            <h2 className="titulo text-2xl">Grabaciones</h2>
            {!audios.length && <p className="text-sm">Todavía no subió audios.</p>}
            {audios.map((g) => (
              <div key={g.id} className="flex flex-col gap-2">
                <p className="text-sm font-bold">{g.title || "Grabación"} · {new Date(g.created_at).toLocaleDateString("es-AR")}</p>
                {g.url && <audio controls src={g.url} className="w-full" />}
                <FormAccion action={comentarGrabacion} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={g.id} />
                  <textarea name="comentario" rows={2} defaultValue={g.comment ?? ""} className="campo" placeholder="Tu devolución" />
                  <button className="btn-secundario self-end bg-white">Enviar comentario</button>
                </FormAccion>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
