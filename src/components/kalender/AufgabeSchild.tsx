// Die einzigen Schilder an einer Aufgabe (Tafel 103/104): „Arbeit“ (klein,
// blau, Token bg-work) und auf der Aufgaben-Seite „neu“ (heute angelegt, am
// nächsten Tag weg). Familie hat kein Kennzeichen, kein Punkt pro Zeile.

const SCHILD = "shrink-0 rounded-full px-1.5 py-px font-bold leading-snug";

export function ArbeitSchild({ klein = false }: { klein?: boolean }) {
  return <span className={`${SCHILD} bg-work text-on-accent ${klein ? "text-[10.5px]" : "text-[11px]"}`}>Arbeit</span>;
}

export function NeuSchild() {
  return <span className={`${SCHILD} bg-accent-soft text-[11px] text-accent-strong`}>neu</span>;
}
