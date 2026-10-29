"use client";

// Treibt eine laufende Übung an (A-051): Stoppuhr (`laufUhr`), Ablauf
// (`Lauf`), Anleitung je Ereignis (Stimme, Klang, Vibration nach Art), Pause
// und Weiter, Bildschirm dunkel nach 3 s (Handy-Pause sofort), Antippen = kurz
// hell. Beim Schließen alles still.

import { useEffect, useRef, useState } from "react";
import { Lauf, standBei, type Stand } from "@/lib/durchatmen/ablauf";
import { anleiten, anleitungStill, audioListeLaden } from "@/lib/durchatmen/anleitung";
import { tonAus } from "@/lib/durchatmen/klang";
import { stopSpeaking } from "@/lib/begleitung/speech";
import { laufUhr } from "@/lib/durchatmen/uhr";
import type { Art } from "@/lib/durchatmen/store";
import type { Uebung } from "@/lib/durchatmen/uebungen";

/** Nach so vielen Sekunden wird es dunkel (Handy kann weg) */
const DUNKEL_NACH_MS = 3000;
/** Antippen macht so lange hell */
const HELL_MS = 5000;
const TICK_MS = 100;

export function useUebungLauf(u: Uebung, o: { aktiv: boolean; art: Art; zaehlen: boolean; onEnde: () => void }) {
  const [stand, setStand] = useState<Stand>(() => standBei(u, 0));
  const [pausiert, setPausiert] = useState(false);
  const [dunkel, setDunkel] = useState(false);
  const lauf = useRef<Lauf | null>(null);
  const optionen = useRef(o);
  const hellBis = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    optionen.current = o;
  });

  // Art gewechselt: was nicht mehr passt, sofort still
  useEffect(() => {
    if (o.art !== "stimme") stopSpeaking();
    if (o.art === "still") tonAus();
  }, [o.art]);

  useEffect(() => {
    if (!o.aktiv) return;
    void audioListeLaden();
    let erstes = true;
    const l = new Lauf(u, laufUhr(), (e) => {
      const { art, zaehlen } = optionen.current;
      anleiten(e, u, { art, zaehlen, erstes });
    });
    lauf.current = l;
    setStand(l.start());
    erstes = false;
    const tick = setInterval(() => {
      if (!l.laeuft) return;
      const s = l.tick();
      setStand(s);
      if (s.fertig) {
        clearInterval(tick);
        setTimeout(() => optionen.current.onEnde(), 900);
      }
    }, TICK_MS);
    // Handy weglegen: nach 3 s dunkel, Handy-Pause sofort
    const dunkelTimer = setTimeout(() => setDunkel(true), u.id === "handy-pause" ? 0 : DUNKEL_NACH_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(dunkelTimer);
      if (hellBis.current) clearTimeout(hellBis.current);
      anleitungStill();
      lauf.current = null;
    };
  }, [o.aktiv, u]);

  const pause = () => {
    lauf.current?.pause();
    anleitungStill();
    setPausiert(true);
    setDunkel(false);
  };
  const weiter = () => {
    lauf.current?.weiter();
    setPausiert(false);
    setDunkel(true);
  };
  /** Antippen im Dunkeln: kurz hell, dann wieder dunkel */
  const hell = () => {
    setDunkel(false);
    if (hellBis.current) clearTimeout(hellBis.current);
    hellBis.current = setTimeout(() => !lauf.current?.fertig && lauf.current?.laeuft && setDunkel(true), HELL_MS);
  };
  return { stand, pausiert, dunkel: dunkel && !pausiert && !stand.fertig, pause, weiter, hell };
}
