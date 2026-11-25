/** Puntito de estado del alumno: verde = usa la app, naranja = lo maneja Barbi (sin cuenta), gris = inactivo. */
export type EstadoAlumno = "activo" | "manual" | "inactivo";

const ESTILO: Record<EstadoAlumno, [string, string]> = {
  activo: ["bg-[#2E9E6B]", "Activo · usa la app"],
  manual: ["bg-[#E8892B]", "Activo · lo manejás vos"],
  inactivo: ["bg-[#A8A1AB]", "Inactivo"],
};

export function estadoAlumno(a: { active: boolean; user_id: string | null; pausas?: { desde: string; hasta: string | null }[] }, hoy: string): EstadoAlumno {
  const pausado = (a.pausas ?? []).some((p) => p.desde <= hoy && (!p.hasta || p.hasta >= hoy));
  if (!a.active || pausado) return "inactivo";
  return a.user_id ? "activo" : "manual";
}

export function PuntoEstado({ estado, conTexto = false }: { estado: EstadoAlumno; conTexto?: boolean }) {
  const [color, texto] = ESTILO[estado];
  return (
    <span className="inline-flex items-center gap-1.5" title={texto}>
      <span className={`inline-block size-2.5 shrink-0 rounded-full ${color}`} aria-hidden="true" />
      {conTexto ? <span className="text-xs">{texto}</span> : <span className="sr-only">{texto}</span>}
    </span>
  );
}
