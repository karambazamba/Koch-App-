/** Kleines oranges "!" vor dringenden Aufgaben – kein Rot, kein Wort "dringend" in der Liste */
export function UrgentMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-extrabold leading-none text-accent-strong ${className}`}
      aria-label="dringend"
      role="img"
    >
      !
    </span>
  );
}
