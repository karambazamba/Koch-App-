"use client";

// Wochenziel Sport erreicht → genau EINMAL je Woche eine Pokal-Karte ("Stark,
// Felix! Dein Wochenziel ist geschafft."), ein
// paar Konfetti-Emojis, 2 Sekunden, Antippen schließt. Beobachtet die Zahl der
// Trainings dieser Woche – egal, ob per "+", Lotte oder abgehaktem
// Sport-Termin. Beim Öffnen der App wird nicht nachträglich gefeiert.

import { useEffect, useRef } from "react";
import { useEntries } from "@/lib/aufgaben/store";
import { celebrate, endCelebration, useCelebration } from "@/lib/core/celebrate";
import { todayIso } from "@/lib/core/now";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { celebrationText, changeSport, useSport, weekStatus } from "@/lib/sport";

const CONFETTI = ["🎉", "✨", "🎊", "💪", "✨"];

export function SportCelebration() {
  const sport = useSport();
  const entries = useEntries();
  const profile = useProfile();
  const shown = useCelebration();
  const prev = useRef<{ week: string; count: number } | null>(null);
  const me = profile?.persons[0]?.id ?? null;
  const today = sport && entries ? todayIso() : "";
  const status = sport && entries ? weekStatus(sport, entries, today, me) : null;

  useEffect(() => {
    if (!status || !sport || !entries) return;
    const p = prev.current;
    prev.current = { week: status.monday, count: status.count };
    if (!p || p.week !== status.monday) return;
    if (status.count > p.count && status.count === status.goal && !sport.celebrated.includes(status.monday)) {
      changeSport((s) => ({ ...s, celebrated: [...s.celebrated, status.monday] }));
      celebrate(celebrationText(profile?.persons[0]?.name.trim() ?? ""));
    }
  }, [status?.monday, status?.count, status?.goal]); // eslint-disable-line react-hooks/exhaustive-deps -- nur bei neuem Training/Ziel prüfen; Profil und Speicher ändern sich auch beim Feiern selbst

  useEffect(() => {
    if (!shown) return;
    const t = window.setTimeout(endCelebration, 2000);
    return () => window.clearTimeout(t);
  }, [shown]);

  if (!shown) return null;
  return (
    <button type="button" onClick={endCelebration} className="fixed inset-0 z-[70] flex items-center justify-center bg-scrim px-6" aria-label="Feier schließen">
      <span className="relative flex max-w-sm flex-col items-center gap-2 rounded-card bg-surface px-6 py-6 text-center shadow-lg" role="status" style={{ animation: "trophy-pop 0.4s ease-out" }}>
        {CONFETTI.map((c, i) => (
          <span key={i} className="pointer-events-none absolute text-xl" style={{ left: `${10 + i * 16}%`, top: -6, animation: `confetti-fall 1.6s ease-in ${i * 0.12}s both` }} aria-hidden>
            {c}
          </span>
        ))}
        <span className="text-5xl" aria-hidden>
          🏆
        </span>
        <span className="text-lg font-extrabold leading-snug">{shown.text}</span>
      </span>
    </button>
  );
}
