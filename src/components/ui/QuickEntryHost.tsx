"use client";

// Hört auf jedes „＋“ (`openQuick`) und zeigt die Schnelleingabe. Das Fenster
// selbst wird erst beim ersten „＋“ geladen.

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { onOpenQuick, type QuickRequest } from "@/lib/core/schnelleingabe";
import { holdNotifyAsk } from "@/lib/heute/mitteilungen/geraet";

const QuickEntry = dynamic(() => import("@/components/ui/QuickEntry").then((m) => m.QuickEntry), { ssr: false });

export function QuickEntryHost() {
  const [request, setRequest] = useState<(QuickRequest & { key: number }) | null>(null);
  useEffect(() => onOpenQuick((r) => setRequest({ ...r, key: Date.now() })), []);
  const close = useCallback(() => setRequest(null), []);
  // Mias Frage nach Erinnerungen erst, wenn die Schnelleingabe zu ist
  const open = request !== null;
  useEffect(() => holdNotifyAsk(open), [open]);
  return request ? <QuickEntry key={request.key} request={request} onClose={close} /> : null;
}
