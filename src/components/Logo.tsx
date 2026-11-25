export function Logo({ claro = false, chico = false }: { claro?: boolean; chico?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className={`font-serif leading-none ${chico ? "text-3xl" : "text-4xl"} ${claro ? "text-[#CFB8E0]" : "text-lila"}`}>BA</span>
      <span className={`font-serif italic leading-none ${chico ? "text-lg" : "text-xl"} ${claro ? "text-crema" : "text-ciruela"}`}>Vocal Coach</span>
    </span>
  );
}
