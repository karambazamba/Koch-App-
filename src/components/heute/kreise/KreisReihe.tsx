"use client";

// Mini-Kreise oben auf der Startseite (A-050, Tafel 143): direkt unter der
// Kopfzeile bzw. der Jetzt-Karte, über allen Kacheln. Bis zu 5 Kreise gleich
// verteilt über die ganze Breite (5 = 56 px, sonst 64 px), je EIN Wort
// darunter. Nicht wischbar: die Reihe scrollt nie seitlich – Wischen
// wechselt weiter die Seite (Kalender · Heute · Essen). Antippen = Fenster
// von unten (ui/Sheet), der Kreis bekommt solange einen orangen Rand; man
// bleibt auf der Startseite. Lange drücken = Startseite bearbeiten (über die
// ganze Seite, `Pressable` in TodayPage). Einziges Zeichen: Sport-Ring und
// die Restzeit des laufenden Timers (der dann vorn steht).

import { demoSportRing } from "@/lib/core/demo";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Flag, Timer as TimerIcon, Wind } from "lucide-react";
import { useFeature } from "@/lib/core/features";
import { useKreise } from "@/lib/core/homeLayout";
import { useNowMs } from "@/lib/core/useNowMs";
import { now } from "@/lib/core/now";
import { STANDARD_KREISE, kreisMasse, kreisMeta, sichtbareKreise, sportRing, timerImKreis, type KreisId } from "@/lib/heute/kreise";
import { useWasLosSichtbar } from "@/lib/region/client";
import type { KachelFarbe } from "@/lib/heute/kachelFarben";
import type { CalendarEntry } from "@/lib/kalender/model";
import { nextTraining, useSport } from "@/lib/sport";
import { sportOfTitle } from "@/lib/sport/plan";
import { stempelkarte } from "@/lib/sport/stempel";
import { isRunning } from "@/lib/timer/model";
import { useTimers } from "@/lib/timer/store";
import { leftWords } from "@/lib/timer/model";
import { sportSymbol } from "@/components/sport/SportIcon";
import { KreisKnopf, SportRing } from "@/components/heute/kreise/KreisKnopf";
import { oeffneDurchatmen, useDurchatmenZustand } from "@/lib/durchatmen/oeffnen";

// Fenster erst beim Öffnen laden (hält die Startseite klein)
const SportFenster = dynamic(() => import("@/components/sport/SportFenster").then((m) => m.SportFenster));
const TimerFenster = dynamic(() => import("@/components/timer/TimerFenster").then((m) => m.TimerFenster));
const WasLosFenster = dynamic(() => import("@/components/region/WasLosFenster").then((m) => m.WasLosFenster));


type Props = { entries: CalendarEntry[]; today: string; minutes: number; me: string | null; sportFarbe?: KachelFarbe; beispiel?: boolean };

export function KreisReihe({ entries, today, minutes, me, sportFarbe, beispiel = false }: Props) {
  const kreise = useKreise() ?? STANDARD_KREISE;
  const sportOn = useFeature("sport");
  const pauseOn = useFeature("durchatmen");
  // Pause öffnet das Durchatmen-Fenster über seinen Gastgeber (im Layout) – der Kreis leuchtet, solange es offen ist
  const atem = useDurchatmenZustand();
  // „Was los?“ (A-055, A-063): Quelle an und Baustein an – auch ohne Einträge (dann sagt das Fenster es)
  const wasLos = useWasLosSichtbar();
  const sport = useSport();
  const timers = useTimers();
  const [offen, setOffen] = useState<KreisId | null>(null);
  const timerAktiv = Boolean(timers?.timers.some((t) => isRunning(t, now().getTime())));
  const nowMs = useNowMs(timerAktiv, 1000);
  const timer = timers && nowMs ? timerImKreis(timers.timers, nowMs) : null;
  const ids = sichtbareKreise(kreise, { sport: Boolean(sportOn), pause: Boolean(pauseOn), waslos: wasLos, timerLaeuft: Boolean(timer) });
  if (!ids.length) return null;
  const masse = kreisMasse(ids.length);

  const karte = sport ? stempelkarte(sport, entries, today, minutes, me) : null;
  const eigene = karte ? karte.felder.filter((f) => f.art === "stempel").length + karte.bonus.length : 0;
  const zeigeBeispiel = beispiel && sport !== undefined && !sport.trainings.length && eigene === 0;
  // Beispiel-Tag: der Ring passt zum Wochentag (Tafel 150) – nie in echten Speichern
  const beispielRing = demoSportRing(today);
  const ring = zeigeBeispiel ? sportRing(beispielRing.trainings, beispielRing.ziel) : sportRing(eigene, karte?.ziel ?? null);
  const naechstes = nextTraining(entries, today, minutes, me);

  const knopf = (id: KreisId) => {
    const meta = kreisMeta(id);
    const gemeinsam = { id, wort: meta.wort, tone: meta.tone, masse, offen: id === "pause" ? atem.fenster : offen === id, onOpen: () => (id === "pause" ? oeffneDurchatmen() : setOffen(id)) };
    switch (id) {
      case "sport":
        return (
          <KreisKnopf
            key={id}
            {...gemeinsam}
            farbe={sportFarbe}
            icon={sportSymbol(naechstes ? sportOfTitle(naechstes.title) : null)}
            label={ring.geschafft ? "Sport: Woche geschafft" : `Sport: ${ring.voll} von ${ring.stuecke} diese Woche`}
            ring={<SportRing groesse={masse.kreis} {...ring} />}
          />
        );
      case "timer":
        return <KreisKnopf key={id} {...gemeinsam} icon={TimerIcon} label={timer ? `Timer: ${timer.name}, noch ${leftWords(timer.leftMs)}` : "Timer"} timer={timer} />;
      case "pause":
        return <KreisKnopf key={id} {...gemeinsam} icon={Wind} label="Pause: kurz durchatmen" />;
      case "waslos":
        return <KreisKnopf key={id} {...gemeinsam} icon={Flag} label="Was los?" />;
    }
  };

  const zu = () => setOffen(null);
  return (
    <>
      <nav aria-label="Kreise" className={`-mx-0.5 flex items-start ${ids.length >= 4 ? "justify-between" : "justify-start gap-7"}`} data-kreise={ids.length} data-kreis-groesse={masse.kreis}>
        {ids.map(knopf)}
      </nav>
      {offen === "sport" && <SportFenster entries={entries} today={today} minutes={minutes} me={me} farbe={sportFarbe} onClose={zu} />}
      {offen === "timer" && <TimerFenster onClose={zu} />}
      {offen === "waslos" && <WasLosFenster onClose={zu} />}
    </>
  );
}
