"use client";

// Mia liest vor (Bühne): neue Antworten vorlesen, den ersten Satz schon
// während des Streamens, den Rest nahtlos danach; bei > 1,2 s ohne Antwort
// einmal „Mhm.“ (nie beim Sofort-Weg). Solange Mia zuhört (Fortsetzung nach
// einer Denkpause), wartet das Vorlesen. Regeln rein in `begleitung/satzweise.ts`.

import { useEffect, useRef, useState } from "react";
import type { HelperVoice } from "@/lib/einstellungen/profile";
import { speak } from "@/lib/begleitung/speech";
import { ersterSatz, MHM, MHM_AB_MS, mhmFaellig, nochZuSagen } from "@/lib/begleitung/satzweise";
import { tempoMarke } from "@/lib/begleitung/tempo";
import type { ChatTurnView } from "@/components/begleitung/chatTypes";

type Options = {
  turns: ChatTurnView[];
  readingOn: boolean;
  voice: HelperVoice;
  busy: boolean;
  streaming: string | null;
  /** Mia hört gerade zu – Vorlesen wartet */
  hoert: boolean;
  /** Diese Antwort kam über den Sofort-Weg (kein „Mhm.“) */
  sofort: boolean;
  /** Was von einer Antwort vorgelesen wird (z. B. ohne Karten) */
  speechFor: (t: ChatTurnView) => string;
};

/** Liefert, wie oft schon vorgelesen wurde (für das Angebot einer schöneren Stimme) */
export function useMiaSprechen({ turns, readingOn, voice, busy, streaming, hoert, sofort, speechFor }: Options): number {
  const speechRef = useRef(speechFor);
  useEffect(() => {
    speechRef.current = speechFor;
  });
  const [readCount, setReadCount] = useState(0);
  /** Schon gesagter Anfang der laufenden Antwort */
  const gesagt = useRef("");
  const mhmGesagt = useRef(false);
  const seit = useRef(0);
  /** Wartet aufs Vorlesen, solange Mia zuhört */
  const wartet = useRef<{ text: string; id: string } | null>(null);
  const opts = (id: string) => ({ id, gender: voice, beginnt: () => tempoMarke("satz") });

  // Neue Frage: von vorn
  useEffect(() => {
    if (!busy) return;
    gesagt.current = "";
    mhmGesagt.current = false;
    seit.current = performance.now();
  }, [busy]);

  // „Mhm.“: einmal, wenn nach 1,2 s noch nichts da ist
  const hatText = Boolean(streaming);
  useEffect(() => {
    if (!busy || hatText) return;
    const t = window.setTimeout(() => {
      if (!mhmFaellig({ seitMs: performance.now() - seit.current, hatText: false, schonGesagt: mhmGesagt.current || Boolean(gesagt.current), sofort, liest: readingOn, hoert })) return;
      mhmGesagt.current = true;
      speak(MHM, { id: "mhm", gender: voice });
    }, Math.max(0, MHM_AB_MS - (performance.now() - seit.current)));
    return () => window.clearTimeout(t);
  }, [busy, hatText, sofort, readingOn, hoert, voice]);

  // Erster vollständiger Satz, sobald er gestreamt da ist
  useEffect(() => {
    if (!busy || !readingOn || hoert || !streaming || gesagt.current) return;
    const satz = ersterSatz(streaming);
    if (!satz) return;
    gesagt.current = satz;
    speak(satz, opts(`turn-${turns.length}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, readingOn, hoert, streaming]);

  // Fertige Antworten: der Rest (bzw. alles) – nicht, was beim Öffnen schon dastand
  const spokenUpTo = useRef(turns.length);
  useEffect(() => {
    const from = spokenUpTo.current;
    spokenUpTo.current = turns.length;
    // Frage zurückgezogen (Fortsetzung nach Denkpause): ihre Antwort nicht mehr vorlesen
    if (turns.length < from) wartet.current = null;
    if (turns.length <= from || !readingOn) return;
    const fresh = turns.map((t, i) => ({ t, i })).slice(from).filter(({ t }) => t.role === "assistant");
    if (!fresh.length) return;
    const ganz = fresh.map(({ t }) => speechRef.current(t)).join(" ");
    const id = `turn-${fresh[fresh.length - 1].i}`;
    const rest = nochZuSagen(gesagt.current, ganz);
    gesagt.current = "";
    if (hoert && !rest.anhaengen) wartet.current = { text: rest.text, id };
    else if (rest.text) speak(rest.text, { ...opts(id), anhaengen: rest.anhaengen });
    // Nach dem ersten Vorlesen: schönere Stimme anbieten (nur, wenn nötig – VoiceOffer)
    setReadCount((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns, readingOn, voice]);

  // Zuhören vorbei (keine Fortsetzung): jetzt vorlesen
  useEffect(() => {
    if (hoert || !wartet.current) return;
    const w = wartet.current;
    wartet.current = null;
    speak(w.text, opts(w.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoert]);

  return readCount;
}
