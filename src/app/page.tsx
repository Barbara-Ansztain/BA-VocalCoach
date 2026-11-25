import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { FormConsulta } from "@/components/FormConsulta";
import { formatoPesos, PRECIOS } from "@/lib/reglas";

const HORARIOS = [
  ["Lunes", "14:30"], ["Martes", "11:00 · 14:30"], ["Miércoles", "17:00"], ["Jueves", "15:00 (cada 15 días)"], ["Viernes", "17:00"],
];

export default function Inicio() {
  return (
    <div>
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-8 py-6">
        <Logo />
        <nav className="flex flex-wrap items-center gap-6">
          <a href="#clases">Clases</a>
          <a href="#horarios">Horarios</a>
          <Link href="/ingresar">Ingresar</Link>
          <a href="#consulta" className="btn-primario">Quiero empezar</a>
        </nav>
      </header>

      <section className="mx-auto flex max-w-6xl flex-wrap items-center gap-12 px-8 pt-10 pb-16">
        <div className="flex flex-[1_1_420px] flex-col gap-5">
          <p className="text-sm uppercase tracking-[2px]">Barbi Ansztain · Clases de canto</p>
          <h1 className="titulo text-5xl leading-[1.05] sm:text-6xl">
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
        <div className="relative h-[520px] min-w-0 flex-[1_1_360px] overflow-hidden rounded-t-[200px] rounded-b-3xl border-8 border-menta bg-lila">
          <Image src="/barbi.jpg" alt="Barbi Ansztain, vocal coach" fill priority sizes="(max-width: 768px) 100vw, 560px"
            className="object-cover object-[50%_30%]" />
        </div>
      </section>

      <section id="clases" className="bg-ciruela text-crema">
        <div className="mx-auto grid max-w-6xl gap-6 px-8 py-14 sm:grid-cols-3">
          {[
            ["Técnica vocal", "Respiración, apoyo, registros y agudos que se organizan, no se atacan."],
            ["Interpretación", "El cuerpo y la voz al servicio de una historia. Teatro musical y audiciones."],
            ["Trabajo consciente", "Clases de 1 hora, 100% personalizadas, con objetivos claros."],
          ].map(([t, d]) => (
            <div key={t}><h3 className="titulo mb-2 text-2xl text-menta">{t}</h3><p className="leading-relaxed">{d}</p></div>
          ))}
        </div>
      </section>

      <section id="consulta" className="mx-auto flex max-w-6xl flex-wrap gap-12 px-8 py-16">
        <div id="horarios" className="flex flex-[1_1_300px] flex-col gap-3.5">
          <h2 className="titulo text-4xl">Horarios disponibles</h2>
          {HORARIOS.map(([d, h]) => (
            <p key={d} className="flex justify-between border-b border-[#D9CCE4] pb-2.5"><strong>{d}</strong><span>{h}</span></p>
          ))}
          <h3 className="titulo mt-4 text-3xl">Valores</h3>
          <div className="grid grid-cols-3 gap-2.5">
            {[["Clase suelta", PRECIOS.suelta], ["2 clases/mes", PRECIOS.mensual_2], ["4 clases/mes", PRECIOS.mensual_4]].map(([n, p], i) => (
              <div key={n} className={`rounded-2xl p-3.5 ${i === 2 ? "bg-menta" : "bg-white"}`}>
                <p className="text-[13px]">{n}</p><p className="mt-1 text-lg font-bold">{formatoPesos(p as number)}</p>
              </div>
            ))}
          </div>
          <p className="text-[13px]">Cuota mensual del 1 al 10 · después, 10% de recargo</p>
        </div>
        <FormConsulta />
      </section>

      <footer className="px-8 py-10 text-center text-sm">
        <a href="https://instagram.com/bavocalcoach" target="_blank" rel="noreferrer">@bavocalcoach</a> · Palermo, CABA · Presencial y online
      </footer>
    </div>
  );
}
