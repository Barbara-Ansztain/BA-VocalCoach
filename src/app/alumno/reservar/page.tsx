import { connection } from "next/server";
import { requireAlumno } from "@/lib/auth";
import { horariosLibres } from "@/lib/agenda";
import { hora as horaDe, ZONA } from "@/lib/reglas";
import { FormAccion } from "@/components/FormAccion";
import { reprogramar, reservar } from "@/app/actions/alumno";

const dia = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" });

export default async function Reservar({ searchParams }: PageProps<"/alumno/reservar">) {
  await connection(); // la hora actual se calcula en cada visita
  await requireAlumno();
  const sp = await searchParams;
  const reprogramarId = typeof sp.reprogramar === "string" ? sp.reprogramar : null;
  const libres = await horariosLibres();
  const porDia = Map.groupBy(libres, (l) => dia.format(new Date(l)));

  return (
    <>
      <h1 className="font-serif font-normal text-3xl leading-tight sm:text-4xl lg:text-5xl">{reprogramarId ? "Elegí el nuevo horario" : "Reservar clase"}</h1>
      <p className="text-sm">Clases de 1 hora. Al confirmar te llega un mail; si es online, con el link de Zoom.</p>
      {libres.length === 0 && <p className="tarjeta">No hay horarios libres en las próximas semanas. Escribile a Barbi.</p>}
      {[...porDia].map(([d, horas]) => (
        <section key={d} className="tarjeta flex flex-col gap-3">
          <h2 className="font-bold first-letter:uppercase">{d}</h2>
          <div className="flex flex-wrap gap-2.5">
            {horas.map((h) => (
              <FormAccion key={h} action={reprogramarId ? reprogramar : reservar} className="flex flex-wrap gap-2">
                <input type="hidden" name="inicio" value={h} />
                {reprogramarId && <input type="hidden" name="id" value={reprogramarId} />}
                <button className="btn-secundario">{horaDe(h)}</button>
              </FormAccion>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
