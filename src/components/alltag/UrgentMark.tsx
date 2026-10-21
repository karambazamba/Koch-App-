/** Kleines rotes "!" vor dringenden Aufgaben – kein Wort "dringend" in der Liste */
export function UrgentMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex w-2 shrink-0 justify-center text-[13px] font-extrabold leading-none text-danger ${className}`} aria-label="dringend" role="img">
      !
    </span>
  );
}
