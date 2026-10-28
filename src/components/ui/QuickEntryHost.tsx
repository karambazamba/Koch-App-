"use client";

// Hört auf jedes „＋“ (`openQuick`) und zeigt die Schnelleingabe. Termine und
// Aufgaben haben je EIN Fenster (Tafel 114): `TerminFenster` bzw.
// `AufgabeFenster` – für jeden Einstieg und auch zum Ändern. Die Fenster
// werden erst beim ersten „＋“ geladen.

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { onOpenQuick, type QuickRequest } from "@/lib/core/schnelleingabe";
import { holdNotifyAsk } from "@/lib/heute/mitteilungen/geraet";
import type { Aufgabe, Termin } from "@/lib/kalender/model";

const QuickEntry = dynamic(() => import("@/components/ui/QuickEntry").then((m) => m.QuickEntry), { ssr: false });
const AufgabeFenster = dynamic(() => import("@/components/kalender/eintragen/AufgabeFenster").then((m) => m.AufgabeFenster), { ssr: false });
const TerminFenster = dynamic(() => import("@/components/kalender/eintragen/TerminFenster").then((m) => m.TerminFenster), { ssr: false });

export function QuickEntryHost() {
  const [request, setRequest] = useState<(QuickRequest & { key: number }) | null>(null);
  useEffect(() => onOpenQuick((r) => setRequest({ ...r, key: Date.now() })), []);
  const close = useCallback(() => setRequest(null), []);
  // Mias Frage nach Erinnerungen erst, wenn die Schnelleingabe zu ist
  const open = request !== null;
  useEffect(() => holdNotifyAsk(open), [open]);
  if (!request) return null;
  if (request.kind === "aufgabe") return <AufgabeFenster key={request.key} entry={request.entry as Aufgabe | undefined} date={request.date} onClose={close} />;
  if (request.kind === "termin") return <TerminFenster key={request.key} entry={request.entry as Termin | undefined} date={request.date} onClose={close} />;
  return <QuickEntry key={request.key} request={request} onClose={close} />;
}
