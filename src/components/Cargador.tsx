/** Loader musical: pentagrama con cuatro notas que saltan en cascada, como una melodía. */
const NOTAS = [
  { x: 34, color: "#9B7BB5" }, // lila
  { x: 70, color: "#286B68" }, // petróleo
  { x: 106, color: "#7A5A96" }, // lila oscuro
  { x: 142, color: "#49304F" }, // ciruela
];

export function Cargador({ texto = "Afinando…" }: { texto?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] flex-1 flex-col items-center justify-center gap-3 text-ciruela">
      <svg viewBox="0 0 176 92" width="176" height="92" aria-hidden="true" className="overflow-visible">
        {/* Pentagrama */}
        <g stroke="#49304F" strokeOpacity="0.16" strokeWidth="1.2">
          {[26, 38, 50, 62, 74].map((y) => <line key={y} x1="6" x2="170" y1={y} y2={y} />)}
        </g>
        {/* Notas (corcheas) */}
        {NOTAS.map((n, i) => (
          <g key={n.x} className="nota-salto" style={{ animationDelay: `${i * 0.18}s` }}>
            <g transform={`translate(${n.x} 62)`}>
              <ellipse rx="7.2" ry="5.2" transform="rotate(-22)" fill={n.color} />
              <line x1="6.4" y1="-1.5" x2="6.4" y2="-34" stroke={n.color} strokeWidth="2.2" strokeLinecap="round" />
              <path d="M6.4 -34 q 10 5 9 17" fill="none" stroke={n.color} strokeWidth="2.2" strokeLinecap="round" />
            </g>
          </g>
        ))}
      </svg>
      <p className="font-serif text-lg italic">{texto}</p>
      <span className="sr-only">Cargando</span>
    </div>
  );
}
