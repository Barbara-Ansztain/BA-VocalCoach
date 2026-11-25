import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { conceptoPago, fechaHora, formatoPesos, horarioFijo, HORAS_ELEGIBLES, HORAS_FIN, hoyAR, NOMBRE_PLAN, periodoActual, type HorarioFijo, type Plan } from "@/lib/reglas";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
import { FormAccion } from "@/components/FormAccion";
import { Estado } from "@/components/Estado";
import { Recordatorios } from "@/components/Recordatorios";
import { estadoAlumno, PuntoEstado } from "@/components/PuntoEstado";
import { agregarHorarioAlumno, agregarNota, comentarGrabacion, guardarAlumno, invitarAlumno, pausarAlumno, quitarHorarioAlumno, quitarPausa } from "@/app/actions/admin";

export default async function Ficha({ params }: PageProps<"/panel/alumnos/[id]">) {
  await connection(); // la hora actual se calcula en cada visita
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: a }, { data: clases }, { data: pagos }, { data: notas }, { data: grabaciones }, { data: material }, { data: recordatorios }] = await Promise.all([
    supabase.from("profiles").select("*, student_slots(*), pausas(*)").eq("id", id).single(),
    supabase.from("lessons").select("*").eq("student_id", id).lte("starts_at", new Date(Date.parse(hoyAR()) + 14 * 86_400_000).toISOString()).order("starts_at", { ascending: false }).limit(12),
    supabase.from("payments").select("*").eq("student_id", id).neq("status", "anulado").order("created_at", { ascending: false }).limit(8),
    supabase.from("lesson_notes").select("*").eq("student_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("recordings").select("*").eq("student_id", id).order("created_at", { ascending: false }).limit(5),
    supabase.from("material_assignments").select("materials(title)").eq("student_id", id),
    supabase.from("recordatorios").select("*").eq("student_id", id).order("hecho").order("created_at", { ascending: false }).limit(10),
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
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-lila font-serif text-2xl text-white sm:size-[72px] sm:text-3xl">{a.full_name.charAt(0)}</span>
          <div>
            <h1 className="font-serif font-normal text-3xl leading-tight sm:text-4xl lg:text-5xl">{a.full_name}</h1>
            <PuntoEstado estado={estadoAlumno(a, hoyAR())} conTexto />
            <p className="break-words text-sm">{a.email ?? "Sin mail"}{a.phone ? ` · ${a.phone}` : ""}{a.notes ? ` · ${a.notes}` : ""}</p>
            {(a.pagador || a.credito > 0) && (
              <p className="mt-1 flex flex-wrap gap-2 text-sm">
                {a.pagador && <span className="chip bg-menta">Paga: {a.pagador}</span>}
                {a.credito > 0 && <span className="chip bg-lila-suave">Saldo a favor: {formatoPesos(a.credito)}</span>}
              </p>
            )}
          </div>
        </div>
        {a.phone && <a href={`https://wa.me/549${a.phone.replace(/\D/g, "").replace(/^0/, "")}`} target="_blank" rel="noreferrer" className="btn-secundario">WhatsApp</a>}
      </header>
      <section className="grid grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-5">
        <div className="tarjeta p-4"><p className="text-[13px]">Plan</p><p className="mt-1 font-bold">{NOMBRE_PLAN[a.plan as Plan]}</p></div>
        <div className="tarjeta p-4"><p className="text-[13px]">Horario fijo</p><p className="mt-1 font-bold">{horarioFijo(a.student_slots)} · {a.modality}</p></div>
        <div className={`rounded-2xl p-4 ${debe ? "bg-lila-suave" : "bg-white"}`}><p className="text-[13px]">Pagos pendientes</p><p className="mt-1 font-bold">{debe}</p></div>
        <div className={`rounded-2xl p-4 ${reprogMes >= 3 ? "bg-lila-suave" : "bg-white"}`}><p className="text-[13px]">Cancelaciones del mes</p><p className="mt-1 font-bold">{reprogMes}</p></div>
        <div className="rounded-2xl bg-menta p-4"><p className="text-[13px]">Cuenta</p><p className="mt-1 font-bold">{a.tyc_accepted_at ? `Activa · TyC aceptados el ${new Date(a.tyc_accepted_at).toLocaleDateString("es-AR")}` : a.user_id ? "Invitado, falta que entre" : "Sin cuenta"}</p>
          {!a.user_id && (
            <FormAccion action={invitarAlumno} className="mt-2 flex flex-col gap-1">
              <input type="hidden" name="id" value={a.id} />
              <button className="text-left text-sm font-bold text-petroleo underline">{a.email ? "Mandar invitación" : "Cargá su mail para invitarlo"}</button>
            </FormAccion>
          )}
        </div>
      </section>
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex flex-[2_1_420px] flex-col gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <section className="tarjeta flex flex-col gap-3">
              <h2 className="font-serif text-xl sm:text-2xl">Horarios fijos</h2>
              {!a.student_slots?.length && <p className="text-sm">Sin horario fijo: sus clases las agendás vos.</p>}
              {[...(a.student_slots ?? [])].sort((x: HorarioFijo, y: HorarioFijo) => x.weekday - y.weekday).map((h: HorarioFijo) => (
                <form key={h.id} action={quitarHorarioAlumno} className="flex items-center justify-between gap-2 rounded-xl bg-crema px-3 py-2">
                  <input type="hidden" name="id" value={h.id} />
                  <span className="text-sm font-bold">{horarioFijo([h])}</span>
                  <button className="text-sm underline">Quitar</button>
                </form>
              ))}
              <FormAccion action={agregarHorarioAlumno} className="group grid grid-cols-2 gap-2">
                <input type="hidden" name="id" value={a.id} />
                <select name="dia" defaultValue="" aria-label="Día" className="campo"><option value="" disabled>Día</option>{DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
                <select name="hora" defaultValue="" aria-label="Desde" className="campo"><option value="" disabled>Desde</option>{HORAS_ELEGIBLES.map((x) => <option key={x}>{x}</option>)}</select>
                <select name="hasta" defaultValue="" aria-label="Hasta" className="campo col-span-2"><option value="">Hasta: 1 hora después</option>{HORAS_FIN.map((x) => <option key={x} value={x}>Hasta las {x}</option>)}</select>
                <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" name="quincenal" className="size-5 accent-petroleo" /> Cada 15 días</label>
                <label className="etiqueta col-span-2 hidden group-has-[input[name=quincenal]:checked]:flex">Primera clase<input type="date" name="desde" className="campo" /></label>
                <button className="btn-secundario col-span-2">＋ Agregar horario</button>
              </FormAccion>
            </section>
            <section className="tarjeta flex flex-col gap-3">
              <h2 className="font-serif text-xl sm:text-2xl">Inactividad</h2>
              <p className="text-sm">Si no viene por un tiempo (descanso, vacaciones, no viene este mes). Podés poner solo «desde» si no sabés cuándo vuelve. Sus clases de esos días se liberan y no se le cobra cuota del mes entero inactivo.</p>
              {(a.pausas ?? []).filter((p: { hasta: string | null }) => !p.hasta || p.hasta >= hoyAR()).map((p: { id: string; desde: string; hasta: string | null; motivo: string }) => (
                <form key={p.id} action={quitarPausa} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-lila-suave px-3 py-2">
                  <input type="hidden" name="id" value={p.id} />
                  <span className="text-sm"><strong>{p.motivo}</strong> · desde el {p.desde.slice(8)}/{p.desde.slice(5, 7)}{p.hasta ? ` al ${p.hasta.slice(8)}/${p.hasta.slice(5, 7)}` : ", sin fecha de vuelta"}</span>
                  <button className="text-sm underline">Reactivar</button>
                </form>
              ))}
              <FormAccion action={pausarAlumno} className="grid grid-cols-2 gap-2">
                <input type="hidden" name="id" value={a.id} />
                <select name="motivo" aria-label="Motivo" className="campo col-span-2">
                  <option>Descanso</option><option>Vacaciones</option><option>No viene este mes</option><option>Otro</option>
                </select>
                <label className="etiqueta">Desde<input type="date" name="desde" required defaultValue={hoyAR()} className="campo" /></label>
                <label className="etiqueta">Hasta (opcional)<input type="date" name="hasta" className="campo" /></label>
                <button className="btn-secundario col-span-2">Marcar inactivo</button>
              </FormAccion>
            </section>
          </div>
          <section className="tarjeta flex flex-col gap-3">
            <h2 className="font-serif text-xl sm:text-2xl">Notas de clase <span className="font-sans text-[13px]">· solo las ves vos</span></h2>
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
                <span className="text-sm first-letter:uppercase">{fechaHora(c.starts_at)}{c.origen === "reprogramada" ? " · reprogramada" : ""}{c.nota ? ` · ${c.nota}` : ""}</span><Estado valor={c.status} />
              </div>
            ))}
          </section>
          <FormAccion action={guardarAlumno} className="tarjeta grid gap-3 sm:grid-cols-2">
            <h2 className="titulo text-2xl sm:col-span-2">Editar ficha</h2>
            <input type="hidden" name="id" value={a.id} />
            <label className="etiqueta">Nombre<input name="nombre" defaultValue={a.full_name} className="campo" /></label>
            <label className="etiqueta">Mail<input name="email" type="email" defaultValue={a.email ?? ""} className="campo" /></label>
            <label className="etiqueta">WhatsApp<input name="telefono" defaultValue={a.phone ?? ""} className="campo" /></label>
            <label className="etiqueta">Plan
              <select name="plan" defaultValue={a.plan} className="campo">{Object.entries(NOMBRE_PLAN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </label>
            <label className="etiqueta">Modalidad
              <select name="modalidad" defaultValue={a.modality} className="campo"><option value="presencial">Presencial</option><option value="online">Online</option></select>
            </label>
            <label className="etiqueta">Quién paga (si no es el alumno)<input name="pagador" defaultValue={a.pagador ?? ""} placeholder="Ej. Lisa (mamá)" className="campo" /></label>
            <label className="etiqueta">Saldo a favor ($)<input name="credito" inputMode="numeric" defaultValue={a.credito ?? 0} className="campo" /></label>
            <label className="etiqueta sm:col-span-2">Notas<input name="notas" defaultValue={a.notes ?? ""} className="campo" /></label>
            <label className="flex items-center gap-2"><input type="checkbox" name="activo" defaultChecked={a.active} className="size-5 accent-petroleo" /> Alumno activo</label>
            <button className="btn-primario sm:col-span-2">Guardar</button>
          </FormAccion>
        </div>
        <div className="flex flex-[1_1_280px] flex-col gap-6">
          <Recordatorios items={recordatorios ?? []} alumnoFijo={a.id} />
          <section className="tarjeta flex flex-col gap-2.5">
            <h2 className="font-serif text-xl sm:text-2xl">Pagos</h2>
            {pagos?.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{conceptoPago(p)} · {formatoPesos(p.amount + p.surcharge)}</span><Estado valor={p.status} />
              </div>
            ))}
          </section>
          <section className="tarjeta flex flex-col gap-2">
            <div className="flex items-center justify-between"><h2 className="font-serif text-xl sm:text-2xl">Material</h2><Link href="/panel/material" className="text-sm font-bold">+ Asignar</Link></div>
            {material?.map((m, i) => <p key={i} className="text-sm">{(m.materials as unknown as { title: string })?.title}</p>)}
          </section>
          <section className="flex flex-col gap-3 rounded-2xl bg-menta p-6">
            <h2 className="font-serif text-xl sm:text-2xl">Grabaciones</h2>
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
