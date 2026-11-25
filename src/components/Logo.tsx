export function Logo({ claro = false, chico = false }: { claro?: boolean; chico?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-2.5">
      <span className={`font-serif leading-none ${chico ? "text-3xl" : "text-4xl"} ${claro ? "text-[#CFB8E0]" : "text-lila"}`}>BA</span>
      <span className={`text-[11px] uppercase tracking-[3px] ${claro ? "text-crema" : ""}`}>Vocal Coach</span>
    </span>
  );
}
