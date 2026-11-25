import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { FormConsulta } from "@/components/FormConsulta";
import { Suspense } from "react";
import { connection } from "next/server";
import { formatoPesos, hoyAR } from "@/lib/reglas";
import { getConfig, getPeriodosPrecio } from "@/lib/config";
import { profePrincipal } from "@/lib/profe";
import { tycSecciones } from "@/lib/tyc";
import { createAdminClient } from "@/lib/supabase/server";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Horarios y valores salen de Configuración (los edita Barbi desde el panel).
async function Consulta() {
  await connection();
  const db = createAdminClient();
  const profe = await profePrincipal();
  const [cfg, periodos, { data: disp }] = await Promise.all([
    getConfig(profe),
    getPeriodosPrecio(profe),
    db.from("availability").select("weekday, start_time, biweekly").eq("profe_id", profe).eq("active", true).order("weekday").order("start_time"),
  ]);
  const porDia = Map.groupBy(disp ?? [], (d) => d.weekday);
  return (
    <section id="consulta" className="mx-auto flex max-w-6xl flex-wrap gap-12 px-5 sm:px-8 py-16">
      <div id="horarios" className="flex flex-[1_1_300px] flex-col gap-3.5">
        <h2 className="titulo text-4xl">Horarios de clase</h2>
        {[...porDia].map(([d, hs]) => (
          <p key={d} className="flex justify-between gap-4 border-b border-[#D9CCE4] pb-2.5">
            <strong>{DIAS[d]}</strong><span className="text-right">{hs.map((h) => h.start_time.slice(0, 5)).join(" · ")}</span>
          </p>
        ))}
        <p className="text-[13px]">Consultá disponibilidad: muchos horarios ya están tomados por alumnos fijos.</p>
        <h3 className="titulo mt-4 text-3xl">Valores</h3>
        <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-3">
          {([["Clase suelta", cfg.precios.suelta], ["2 clases/mes", cfg.precios.mensual_2], ["4 clases/mes", cfg.precios.mensual_4]] as const).map(([n, p], i) => (
            <div key={n} className={`rounded-2xl p-3.5 ${i === 2 ? "bg-menta" : "bg-white"}`}>
              <p className="text-[13px]">{n}</p><p className="mt-1 whitespace-nowrap text-lg font-bold">{formatoPesos(p)}</p>
            </div>
          ))}
        </div>
        <p className="text-[13px]">Cuota mensual del 1 al {cfg.diaVencimiento} · después, {cfg.recargoPct}% de recargo</p>
        {periodos.filter((p) => p.desde > hoyAR()).map((p) => (
          <p key={p.desde} className="rounded-xl bg-white px-3 py-2 text-[13px]">
            Desde {["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][Number(p.desde.slice(5, 7)) - 1]}:
            {" "}suelta {formatoPesos(p.precios.suelta)} · 2 clases {formatoPesos(p.precios.mensual_2)} · 4 clases {formatoPesos(p.precios.mensual_4)}
          </p>
        ))}
      </div>
      <FormConsulta tyc={tycSecciones(cfg)} />
    </section>
  );
}

export default function Inicio() {
  return (
    <div>
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 sm:px-8 py-6">
        <Logo />
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px]">
          <a href="#clases">Clases</a>
          <a href="#horarios">Horarios</a>
          <Link href="/ingresar">Ingresar</Link>
          <a href="#consulta" className="btn-primario">Quiero empezar</a>
        </nav>
      </header>

      <section className="mx-auto flex max-w-6xl flex-wrap items-center gap-10 px-5 pt-6 pb-14 sm:px-8 sm:pt-10 sm:pb-16">
        <div className="flex flex-[1_1_340px] flex-col gap-5">
          <p className="text-sm uppercase tracking-[2px]">Barbi Ansztain · Clases de canto</p>
          <h1 className="titulo text-[2.6rem] leading-[1.05] sm:text-6xl">
            Te ayudo a encontrar <em className="text-lila-oscuro">tu voz</em>
          </h1>
          <p className="max-w-[480px] text-lg leading-relaxed">
            Clases personalizadas para entender y desarrollar tu voz, sin fuerza ni tensión. No hace falta saber cantar para empezar:
            arrancamos desde donde estés.
          </p>
          <div className="flex flex-wrap gap-2.5 text-sm">
            <span className="rounded-full bg-menta px-3.5 py-2">Palermo, CABA</span>
            <span className="rounded-full bg-menta px-3.5 py-2">Online</span>
            <span className="rounded-full bg-lila-suave px-3.5 py-2">Egresada del Conservatorio</span>
          </div>
        </div>
        <div className="relative h-[400px] min-w-0 flex-[1_1_300px] sm:h-[520px] overflow-hidden rounded-t-[200px] rounded-b-3xl border-8 border-menta bg-lila">
          <Image src="/barbi.jpg" alt="Barbi Ansztain, vocal coach" fill priority sizes="(max-width: 768px) 100vw, 560px"
            className="object-cover object-[50%_30%]" />
        </div>
      </section>

      <section id="clases" className="bg-ciruela text-crema">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 sm:px-8 py-14 sm:grid-cols-3">
          {[
            ["Técnica vocal", "Respiración, apoyo, registros y agudos que se organizan, no se atacan."],
            ["Interpretación", "El cuerpo y la voz al servicio de una historia. Teatro musical y audiciones."],
            ["Trabajo consciente", "Clases de 1 hora, 100% personalizadas, con objetivos claros."],
          ].map(([t, d]) => (
            <div key={t}><h3 className="titulo mb-2 text-2xl text-menta">{t}</h3><p className="leading-relaxed">{d}</p></div>
          ))}
        </div>
      </section>

      <Suspense fallback={<section id="consulta" className="min-h-[600px]" />}>
        <Consulta />
      </Suspense>

      <footer className="px-5 sm:px-8 py-10 text-center text-sm">
        <a href="https://instagram.com/bavocalcoach" target="_blank" rel="noreferrer">@bavocalcoach</a> · Palermo, CABA · Presencial y online
      </footer>
    </div>
  );
}
