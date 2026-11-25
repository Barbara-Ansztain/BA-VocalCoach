const ESTILOS: Record<string, [string, string]> = {
  reservada: ["Reservada", "bg-arena"], asistio: ["Asistió", "bg-menta"], perdida: ["Perdida", "bg-lila-suave"],
  cancelada: ["Cancelada a tiempo", "bg-arena"], reprogramada: ["Reprogramada", "bg-arena"],
  pendiente: ["Pendiente", "bg-lila-suave"], en_revision: ["Comprobante a revisar", "bg-lila-suave"], pagado: ["Pagado", "bg-menta"], anulado: ["Anulado", "bg-arena"],
  nueva: ["Nueva", "bg-lila-suave"], contactada: ["Contactada", "bg-arena"], alumno: ["Ya es alumno", "bg-menta"], descartada: ["Descartada", "bg-arena"],
};
export function Estado({ valor }: { valor: string }) {
  const [t, c] = ESTILOS[valor] ?? [valor, "bg-arena"];
  return <span className={`chip ${c}`}>{t}</span>;
}
