import { connection } from "next/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { diaSemana, sumarDias, type Disponibilidad } from "@/lib/agenda";
import { hora, HORAS_ELEGIBLES, HORAS_FIN, hoyAR, msAhora, OFFSET, sumarMinutos } from "@/lib/reglas";
import { FormAccion } from "@/components/FormAccion";
import { bloquearHorario, crearClase, desbloquear, generarClasesBoton } from "@/app/actions/admin";

type Vista = "dia" | "semana" | "mes" | "lista";
const VISTAS: [Vista, string][] = [["dia", "Día"], ["semana", "Semana"], ["mes", "Mes"], ["lista", "Lista"]];
const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const ALTO_HORA = 64; // px por hora en la grilla

type Clase = {
  id: string; student_id: string; starts_at: string; duration_min: number; modality: string; status: string; zoom_join_url: string | null;
  origen: string; nota: string | null;
  profiles: { full_name: string; plan: string } | null;
};

const num = (f: string) => ({ a: Number(f.slice(0, 4)), m: Number(f.slice(5, 7)), d: Number(f.slice(8, 10)) });
const minutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const nombreDia = (f: string) => `${DIAS_LARGOS[diaSemana(f)]} ${num(f).d} de ${MESES[num(f).m - 1]}`;

export default async function Agenda({ searchParams }: PageProps<"/panel/agenda">) {
  await connection(); // la hora actual se calcula en cada visita
  const sp = await searchParams;
  const vista: Vista = VISTAS.some(([v]) => v === sp.vista) ? (sp.vista as Vista) : "semana";
  const hoy = hoyAR();
  const fecha = typeof sp.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : hoy;
  const horaElegida = typeof sp.hora === "string" && /^\d{2}:\d{2}$/.test(sp.hora) ? sp.hora : "";

  // Rango visible según la vista
  const lunes = sumarDias(fecha, -((diaSemana(fecha) + 6) % 7));
  const { a, m } = num(fecha);
  const primeroMes = `${a}-${String(m).padStart(2, "0")}-01`;
  const inicioGrillaMes = sumarDias(primeroMes, -((diaSemana(primeroMes) + 6) % 7));
  const [desde, hasta] =
    vista === "dia" ? [fecha, fecha]
    : vista === "semana" ? [lunes, sumarDias(lunes, 6)]
    : vista === "mes" ? [inicioGrillaMes, sumarDias(inicioGrillaMes, 41)]
    : [fecha, sumarDias(fecha, 13)];

  const supabase = await createClient();
  const [{ data: clasesData }, { data: dispData }, { data: feriados }, { data: bloqueos }, { data: alumnos }, { data: ausencias }, { data: extras }] = await Promise.all([
    supabase.from("lessons").select("id, student_id, starts_at, duration_min, modality, status, zoom_join_url, origen, nota, profiles(full_name, plan)")
      .in("status", ["reservada", "asistio", "perdida"]).gte("starts_at", `${desde}T00:00:00${OFFSET}`).lte("starts_at", `${hasta}T23:59:59${OFFSET}`).order("starts_at"),
    supabase.from("availability").select("*").eq("active", true),
    supabase.from("holidays").select("*").gte("date", desde).lte("date", hasta),
    supabase.from("blocked_slots").select("*").lte("starts_at", `${hasta}T23:59:59${OFFSET}`).gte("ends_at", `${desde}T00:00:00${OFFSET}`).order("starts_at"),
    supabase.from("profiles").select("id, full_name").eq("role", "alumno").eq("active", true).order("full_name"),
    supabase.from("ausencias").select("*").gte("hasta", desde).lte("desde", hasta),
    supabase.from("horarios_extra").select("fecha, start_time").gte("fecha", desde).lte("fecha", hasta),
  ]);
  const clases = (clasesData ?? []) as unknown as Clase[];
  const disp = (dispData ?? []) as Disponibilidad[];
  const feriado = new Map<string, string>((feriados ?? []).map((f) => [f.date, f.name]));
  for (const a of ausencias ?? []) for (let f = a.desde; f <= a.hasta; f = sumarDias(f, 1)) if (!feriado.has(f)) feriado.set(f, a.motivo || "Sin clases");
  const ahora = msAhora();
  const fechaDe = (iso: string) => hoyAR(new Date(iso));
  const clasesDel = (f: string) => clases.filter((c) => fechaDe(c.starts_at) === f);
  const bloqueado = (f: string, h: string) => {
    const t = Date.parse(`${f}T${h}:00${OFFSET}`);
    return (bloqueos ?? []).some((b) => Date.parse(b.starts_at) <= t && t < Date.parse(b.ends_at));
  };
  const extrasDel = (f: string) => (extras ?? []).filter((x) => x.fecha === f).map((x) => x.start_time.slice(0, 5));
  const libresDel = (f: string) => feriado.has(f) ? [] : [...new Set([...disp
    .filter((d) => d.weekday === diaSemana(f))
    .map((d) => d.start_time.slice(0, 5)), ...extrasDel(f)])]
    .filter((h) => {
      const t = Date.parse(`${f}T${h}:00${OFFSET}`);
      const pisa = clasesDel(f).some((c) => Date.parse(c.starts_at) <= t && t < Date.parse(c.starts_at) + c.duration_min * 60_000);
      return t > ahora && !bloqueado(f, h) && !pisa;
    })
    .sort();

  // Rango horario de la grilla: desde la primera hasta la última clase u horario ofrecido
  const horasUsadas = [...disp.map((d) => minutos(d.start_time)), ...(extras ?? []).map((x) => minutos(x.start_time)), ...clases.map((c) => minutos(hora(c.starts_at)))];
  const hIni = Math.floor((Math.min(...horasUsadas, 9 * 60)) / 60);
  const hFin = Math.ceil((Math.max(...horasUsadas, 19 * 60) + 60) / 60);
  const horasGrilla = Array.from({ length: hFin - hIni }, (_, i) => hIni + i);

  // Días que se muestran en la semana: lunes a viernes, y sábado/domingo solo si hay algo
  const diasSemana = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
    .filter((f, i) => i < 5 || disp.some((d) => d.weekday === diaSemana(f)) || extrasDel(f).length > 0 || clasesDel(f).length > 0);

  const href = (v: Vista, f: string) => `/panel/agenda?vista=${v}&fecha=${f}`;
  const paso = vista === "dia" ? 1 : vista === "semana" ? 7 : vista === "lista" ? 14 : 0;
  const anterior = vista === "mes" ? `${m === 1 ? a - 1 : a}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}-01` : sumarDias(fecha, -paso);
  const siguiente = vista === "mes" ? `${m === 12 ? a + 1 : a}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01` : sumarDias(fecha, paso);
  const titulo =
    vista === "dia" ? nombreDia(fecha)
    : vista === "mes" ? `${MESES[m - 1]} ${a}`
    : `${num(desde).d}${num(desde).m !== num(hasta).m ? ` de ${MESES[num(desde).m - 1]}` : ""} – ${num(hasta).d} de ${MESES[num(hasta).m - 1]}`;

  function evento(c: Clase, compacto = false, conHora = true) {
    const suelta = c.profiles?.plan === "suelta";
    const repro = c.origen === "reprogramada";
    const aviso = /reprogramar|tentativa/i.test(c.nota ?? "");
    const color = c.status === "perdida" ? "bg-arena text-ciruela/70 line-through" : aviso ? "bg-[#FBE3C8] border-[#E8892B]" : repro ? "bg-[#DCCBEA] border-lila-oscuro" : suelta ? "bg-lila-suave" : "bg-menta";
    return (
      <Link href={`/panel/clases/${c.id}`} title={`${c.profiles?.full_name} · ${hora(c.starts_at)} · tocá para editar`}
        className={`block h-full overflow-hidden rounded-lg border-l-4 px-2 py-1 text-ciruela hover:brightness-95 ${repro || aviso ? "" : "border-petroleo"} ${color}`}>
        <p className="truncate text-[13px] font-bold leading-tight">{c.profiles?.full_name}</p>
        {!compacto && <p className="truncate text-[11px] leading-tight">{conHora ? `${hora(c.starts_at)}${c.duration_min !== 60 ? `–${sumarMinutos(hora(c.starts_at), c.duration_min)}` : ""} · ` : ""}{c.modality === "online" ? "Online" : "Presencial"}{c.status === "asistio" ? " · asistió" : ""}{repro ? " · reprogramada" : ""}{c.nota ? ` · ${c.nota}` : ""}</p>}
      </Link>
    );
  }

  function grilla(dias: string[]) {
    return (
      <div className="flex">
        <div className="w-11 shrink-0 sm:w-14">
          <div className="h-12" />
          <div className="relative" style={{ height: horasGrilla.length * ALTO_HORA }}>
            {horasGrilla.map((h, i) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-ciruela/70" style={{ top: i * ALTO_HORA }}>{String(h).padStart(2, "0")}:00</span>
            ))}
          </div>
        </div>
        <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: `repeat(${dias.length}, minmax(0, 1fr))` }}>
          {dias.map((f) => (
            <div key={f} className="min-w-0 border-l border-arena">
              <Link href={href("dia", f)} className={`flex h-12 flex-col items-center justify-center text-ciruela ${f === hoy ? "font-bold" : ""}`}>
                <span className="text-[11px] uppercase tracking-wide">{DIAS_CORTOS[diaSemana(f)]}</span>
                <span className={`flex size-7 items-center justify-center rounded-full text-sm ${f === hoy ? "bg-petroleo text-white" : ""}`}>{num(f).d}</span>
              </Link>
              <div className="relative" style={{ height: horasGrilla.length * ALTO_HORA }}>
                {horasGrilla.map((h, i) => <div key={h} className="absolute inset-x-0 border-t border-arena" style={{ top: i * ALTO_HORA }} />)}
                {feriado.has(f) && <div className="absolute inset-0 flex items-start justify-center bg-arena/60 pt-3 text-xs">{feriado.get(f)}</div>}
                {libresDel(f).map((h) => (
                  <Link key={h} href={`/panel/agenda?vista=${vista}&fecha=${f}&hora=${h}#nueva`} title="Agendar una clase en este horario"
                    className="absolute inset-x-1 rounded-lg border border-dashed border-lila/70 px-2 py-1 text-[11px] text-ciruela/70 hover:bg-lila-suave"
                    style={{ top: ((minutos(h) - hIni * 60) / 60) * ALTO_HORA + 2, height: ALTO_HORA - 4 }}>
                    {h} libre
                  </Link>
                ))}
                {clasesDel(f).map((c) => (
                  <div key={c.id} className="absolute inset-x-1" style={{ top: ((minutos(hora(c.starts_at)) - hIni * 60) / 60) * ALTO_HORA + 2, height: (c.duration_min / 60) * ALTO_HORA - 4 }}>
                    {evento(c, dias.length > 5)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function lista(dias: string[]) {
    const conAlgo = dias.filter((f) => clasesDel(f).length || libresDel(f).length || feriado.has(f));
    if (!conAlgo.length) return <p className="py-6 text-center">No hay clases en estos días.</p>;
    return (
      <div className="flex flex-col divide-y divide-arena">
        {conAlgo.map((f) => (
          <section key={f} className="flex flex-col gap-2 py-4 sm:flex-row sm:gap-6">
            <Link href={href("dia", f)} className="w-40 shrink-0 text-ciruela">
              <span className={`font-bold first-letter:uppercase ${f === hoy ? "text-petroleo" : ""}`}>{nombreDia(f)}</span>
              {f === hoy && <span className="ml-2 chip bg-menta">Hoy</span>}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {feriado.has(f) && <p className="text-sm">{feriado.get(f)} · sin clase</p>}
              {[...clasesDel(f).map((c) => ({ h: hora(c.starts_at), c })), ...libresDel(f).map((h) => ({ h, c: null as Clase | null }))]
                .sort((x, y) => x.h.localeCompare(y.h))
                .map(({ h, c }) => (
                  <div key={h + (c?.id ?? "libre")} className="flex items-center gap-3">
                    <span className="w-12 shrink-0 text-sm font-bold">{h}</span>
                    {c ? <div className="min-w-0 flex-1">{evento(c, false, false)}</div>
                      : <Link href={`/panel/agenda?vista=dia&fecha=${f}&hora=${h}#nueva`} className="flex-1 rounded-lg border border-dashed border-lila/70 px-2 py-1.5 text-[13px] text-ciruela/70 hover:bg-lila-suave">Libre · agendar</Link>}
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  function dia() {
    const delDia = clasesDel(fecha);
    return (
      <div className="flex flex-col gap-3">
        {feriado.has(fecha) && <p className="rounded-xl bg-arena p-3 text-sm">{feriado.get(fecha)} · sin clase</p>}
        {!delDia.length && !libresDel(fecha).length && !feriado.has(fecha) && <p className="py-6 text-center">No hay clases este día.</p>}
        {[...delDia.map((c) => ({ h: hora(c.starts_at), c })), ...libresDel(fecha).map((h) => ({ h, c: null as Clase | null }))]
          .sort((x, y) => x.h.localeCompare(y.h))
          .map(({ h, c }) => c ? (
            <Link key={c.id} href={`/panel/clases/${c.id}`} className="flex items-center gap-3 rounded-2xl bg-crema p-3 text-ciruela hover:bg-menta sm:p-4">
              <span className="w-14 text-lg font-bold">{h}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{c.profiles?.full_name}</p>
                <p className="text-sm">{c.modality === "online" ? "Online" : "Presencial"} · {c.status === "asistio" ? "Asistió" : c.status === "perdida" ? "Perdida" : "Reservada"}{c.origen === "reprogramada" ? " · Reprogramada" : ""}{c.nota ? ` · ${c.nota}` : ""}</p>
              </div>
              <span aria-hidden="true" className="text-xl">›</span>
            </Link>
          ) : (
            <Link key={h} href={`/panel/agenda?vista=dia&fecha=${fecha}&hora=${h}#nueva`} className="flex items-center gap-3 rounded-2xl border border-dashed border-lila/70 p-3 text-ciruela hover:bg-lila-suave sm:p-4">
              <span className="w-14 text-lg font-bold">{h}</span><span className="text-sm">Libre · tocá para agendar una clase</span>
            </Link>
          ))}
      </div>
    );
  }

  function mes() {
    const celdas = Array.from({ length: 42 }, (_, i) => sumarDias(inicioGrillaMes, i));
    const semanas = celdas.slice(35).some((f) => num(f).m === m) ? 6 : 5;
    return (
      <div>
        <div className="grid grid-cols-7 border-b border-arena text-center text-[11px] uppercase tracking-wide">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {celdas.slice(0, semanas * 7).map((f) => {
            const cs = clasesDel(f);
            const fuera = num(f).m !== m;
            return (
              <Link key={f} href={href("dia", f)} className={`flex min-h-16 min-w-0 flex-col gap-1 border-b border-l border-arena p-1 text-ciruela hover:bg-crema sm:min-h-28 sm:p-1.5 ${fuera ? "opacity-40" : ""}`}>
                <span className={`flex size-6 items-center justify-center self-center rounded-full text-xs sm:self-start ${f === hoy ? "bg-petroleo font-bold text-white" : ""}`}>{num(f).d}</span>
                {feriado.has(f) && <span className="truncate text-[10px]">Feriado</span>}
                {/* En celular: puntitos y cantidad. En pantallas grandes: nombres. */}
                {cs.length > 0 && <span className="text-center text-[11px] font-bold sm:hidden">{cs.length}</span>}
                <span className="hidden flex-col gap-0.5 sm:flex">
                  {cs.slice(0, 3).map((c) => (
                    <span key={c.id} className={`truncate rounded px-1 text-[11px] ${/reprogramar|tentativa/i.test(c.nota ?? "") ? "bg-[#FBE3C8]" : c.origen === "reprogramada" ? "bg-[#DCCBEA]" : c.profiles?.plan === "suelta" ? "bg-lila-suave" : "bg-menta"}`}>{hora(c.starts_at)} {c.profiles?.full_name}</span>
                  ))}
                  {cs.length > 3 && <span className="px-1 text-[11px]">+{cs.length - 3} más</span>}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="titulo text-3xl first-letter:uppercase sm:text-4xl">{titulo}</h1>
          <a href="#nueva" className="btn-primario">+ Nueva clase</a>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Link href={href(vista, anterior)} aria-label="Anterior" className="flex size-11 items-center justify-center rounded-full text-xl hover:bg-white">‹</Link>
            <Link href={href(vista, hoy)} className="btn-secundario px-4 py-2">Hoy</Link>
            <Link href={href(vista, siguiente)} aria-label="Siguiente" className="flex size-11 items-center justify-center rounded-full text-xl hover:bg-white">›</Link>
          </div>
          <nav aria-label="Vista" className="flex rounded-xl bg-white p-1">
            {VISTAS.map(([v, t]) => (
              <Link key={v} href={href(v, fecha)} aria-current={v === vista ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm sm:px-4 ${v === vista ? "bg-ciruela text-crema" : "text-ciruela hover:bg-crema"}`}>{t}</Link>
            ))}
          </nav>
        </div>
      </header>

      <section className="tarjeta p-3 sm:p-5">
        {vista === "dia" && dia()}
        {vista === "semana" && (
          <>
            {/* En pantallas chicas la semana se ve como lista, sin deslizar de costado */}
            <div className="hidden md:block">{grilla(diasSemana)}</div>
            <div className="md:hidden">{lista(diasSemana)}</div>
          </>
        )}
        {vista === "mes" && mes()}
        {vista === "lista" && lista(Array.from({ length: 14 }, (_, i) => sumarDias(fecha, i)))}
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
          <span><span className="mr-1 inline-block size-3 rounded-sm bg-menta align-middle" />Mensual</span>
          <span><span className="mr-1 inline-block size-3 rounded-sm bg-lila-suave align-middle" />Clase suelta</span>
          <span><span className="mr-1 inline-block size-3 rounded-sm border-l-4 border-lila-oscuro bg-[#DCCBEA] align-middle" />Reprogramada</span>
          <span><span className="mr-1 inline-block size-3 rounded-sm border-l-4 border-[#E8892B] bg-[#FBE3C8] align-middle" />A reprogramar / tentativa</span>
          <span><span className="mr-1 inline-block size-3 rounded-sm border border-dashed border-lila align-middle" />Libre (se puede reservar)</span>
        </p>
      </section>

      <FormAccion action={generarClasesBoton} className="flex flex-wrap items-center gap-3 rounded-2xl bg-menta px-5 py-4">
        <p className="flex-[1_1_260px] text-sm">Las clases de horario fijo se crean hasta 6 semanas adelante. Si cambiaste horarios o sumaste alumnos, generalas de nuevo (no duplica).</p>
        <button className="btn-primario">Generar clases</button>
      </FormAccion>
      <div id="nueva" className="grid gap-6 lg:grid-cols-2">
        <FormAccion action={crearClase} className="tarjeta group grid gap-3 sm:grid-cols-2">
          <h2 className="titulo text-2xl sm:col-span-2">Nueva clase</h2>
          <label className="etiqueta sm:col-span-2">Alumno
            <select name="alumno" required defaultValue="" className="campo">
              <option value="" disabled>Elegí un alumno</option>
              <option value="nuevo">＋ Alumno nuevo…</option>
              {alumnos?.map((x) => <option key={x.id} value={x.id}>{x.full_name}</option>)}
            </select>
          </label>
          {/* Se muestra solo cuando se elige "Alumno nuevo" */}
          <fieldset className="hidden gap-3 rounded-xl bg-crema p-3 group-has-[option[value=nuevo]:checked]:grid sm:col-span-2 sm:grid-cols-2">
            <legend className="sr-only">Datos del alumno nuevo</legend>
            <label className="etiqueta sm:col-span-2">Nombre<input name="nuevo_nombre" className="campo" placeholder="Ej. Marta" /></label>
            <label className="etiqueta">WhatsApp (opcional)<input name="nuevo_telefono" type="tel" className="campo" /></label>
            <label className="etiqueta">Mail (opcional)<input name="nuevo_email" type="email" className="campo" /></label>
            <label className="etiqueta">Plan
              <select name="nuevo_plan" defaultValue="suelta" className="campo">
                <option value="suelta">Clase suelta</option><option value="mensual_2">Mensual · 2 clases</option><option value="mensual_4">Mensual · 4 clases</option>
              </select>
            </label>
            <label className="etiqueta">Modalidad
              <select name="nuevo_modalidad" className="campo"><option value="presencial">Presencial</option><option value="online">Online</option></select>
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="nuevo_fijo" className="size-5 accent-petroleo" /> Repetir todas las semanas en este día y hora</label>
            <p className="text-xs sm:col-span-2">No hace falta que use la app: vos le manejás las clases y los pagos. Si más adelante querés, le mandás la invitación desde su ficha.</p>
          </fieldset>
          <label className="etiqueta sm:col-span-2">Fecha<input type="date" name="fecha" required defaultValue={fecha} className="campo" /></label>
          <label className="etiqueta">Desde
            <select name="hora" required defaultValue={horaElegida} className="campo">
              <option value="" disabled>Elegí la hora</option>
              {HORAS_ELEGIBLES.map((h) => <option key={h}>{h}</option>)}
            </select>
          </label>
          <label className="etiqueta">Hasta
            <select name="hasta" defaultValue="" className="campo"><option value="">1 hora después</option>{HORAS_FIN.map((h) => <option key={h}>{h}</option>)}</select>
          </label>
          <button className="btn-primario sm:col-span-2">Crear clase</button>
        </FormAccion>
        <FormAccion action={bloquearHorario} className="tarjeta grid gap-3 sm:grid-cols-2">
          <h2 className="font-serif text-2xl sm:col-span-2">Bloquear horarios</h2>
          <p className="text-sm sm:col-span-2">Nadie puede reservar en ese rango. Sin horas, se bloquea el día entero.</p>
          <label className="etiqueta">Desde el día<input type="date" name="desde" required defaultValue={fecha} className="campo" /></label>
          <label className="etiqueta">Hasta el día (opcional)<input type="date" name="hasta" className="campo" /></label>
          <label className="etiqueta">Desde la hora (opcional)
            <select name="hora_desde" defaultValue="" className="campo"><option value="">Todo el día</option>{HORAS_ELEGIBLES.map((h) => <option key={h}>{h}</option>)}</select>
          </label>
          <label className="etiqueta">Hasta la hora (opcional)
            <select name="hora_hasta" defaultValue="" className="campo"><option value="">Fin del día</option>{HORAS_ELEGIBLES.map((h) => <option key={h}>{h}</option>)}</select>
          </label>
          <label className="etiqueta sm:col-span-2">Motivo<input name="motivo" className="campo" /></label>
          <button className="btn-secundario sm:col-span-2">Bloquear</button>
          {(bloqueos ?? []).length > 0 && (
            <div className="flex flex-col gap-1.5 border-t border-arena pt-3 sm:col-span-2">
              <p className="text-sm font-bold">Bloqueos en estas fechas</p>
              {(bloqueos ?? []).map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{fechaDe(b.starts_at).slice(8)}/{fechaDe(b.starts_at).slice(5, 7)} · {hora(b.starts_at)}–{hora(b.ends_at) === "00:00" ? "24:00" : hora(b.ends_at)}{b.reason ? ` · ${b.reason}` : ""}</span>
                  <button formAction={desbloquear} name="id" value={b.id} formNoValidate className="underline">Quitar</button>
                </div>
              ))}
            </div>
          )}
        </FormAccion>
      </div>
    </>
  );
}
