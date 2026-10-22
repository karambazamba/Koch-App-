"use client";

// Bearbeiten-Modus der Startseite (`TodayPage`): öffnen, schließen, Zurück
// und Danebentippen – siehe Kommentar am Hook.

import { useEffect, useRef, useState } from "react";
import { onHomeEditRequest } from "@/lib/core/homeLayout";
import { buzz } from "@/components/heute/actions";
import { showToast } from "@/lib/core/toast";

/**
 * Bearbeiten-Modus: öffnen (lange drücken, Link, Einstellungen/Lotte über
 * `requestHomeEdit`), schließen ("Fertig", Zurück, Danebentippen). Zurück
 * (Pfeil/Geste) schließt nur den Modus – dafür ein eigener Verlaufseintrag.
 * Danebentippen zentral: ein echter Klick (kein Wisch – nach dem Scrollen
 * schickt der Browser keinen) auf jede freie Fläche beendet; ein kurzer Tipp
 * auf eine Kachel ebenso (das erkennt `HomeBoard`). Knöpfe, Links, Felder,
 * Fenster und die Fertig-Leiste nicht. Beim Beenden kurz „✓ Gespeichert“. Der Seiten-Schalter
 * wechselt wie gewohnt und beendet dabei den Modus.
 */
export function useHomeEditing() {
  const [on, setOn] = useState(false);
  const pushed = useRef(false);
  const open = () => {
    if (pushed.current) return;
    buzz();
    openedAt.current = performance.now();
    setOn(true);
    window.scrollTo({ top: 0 });
    try {
      window.history.pushState({ ...(window.history.state ?? {}), homeEdit: true }, "");
      pushed.current = true;
    } catch {
      pushed.current = false;
    }
  };
  const openedAt = useRef(0);
  const close = () => {
    setOn(false);
    showToast({ text: "✓ Gespeichert", small: true, seconds: 1.5 });
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    }
  };
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });
  useEffect(() => onHomeEditRequest(() => openRef.current()), []);
  useEffect(() => {
    if (!on) return;
    const onPop = () => {
      // Ein Fenster im Bearbeiten-Modus (z. B. das Kachel-Menü) wurde geschlossen – der Modus bleibt
      if ((window.history.state as { homeEdit?: boolean } | null)?.homeEdit) return;
      pushed.current = false;
      setOn(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [on]);
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!on) return;
    const onClick = (e: MouseEvent) => {
      // Der Klick, der den Modus geöffnet hat (langes Drücken, Link), zählt nicht
      if (performance.now() - openedAt.current < 600) return;
      const t = e.target instanceof Element ? e.target : null;
      if (!t || !t.isConnected) return;
      if (t.closest('[role="tab"]')) {
        // Seite wechselt (router.replace) – den Modus still beenden, ohne Zurück
        pushed.current = false;
        setOn(false);
        return;
      }
      if (t.closest('[role="dialog"], [role="alertdialog"], [data-unit], [data-begleitung-leiste], [data-keep-edit], button, a, input, textarea, select, label')) return;
      closeRef.current();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [on]);
  return { on, open, close };
}
