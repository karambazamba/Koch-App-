"use client";

// Im Layout (klein): steht der Zugangscode-Bildschirm? Nach Hallo (mit Zustimmung) und „Für wen“,
// wenn die KI einen Code braucht, er fehlt und nicht „Später“ gewählt ist –
// oder wenn jemand ihn anfordert (KI-Versuch nach „Später“, „Zugangscode
// ändern“). Der Bildschirm selbst wird erst dann geladen.

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { codeScreenNoetig, useCodeScreenState } from "@/lib/begleitung/codeAbfrage";
import { fetchStatus, onCodeChange } from "@/lib/begleitung/zugang";
import type { AssistantStatus } from "@/lib/begleitung/protocol";
import { useEinwilligungen } from "@/lib/datenschutz/einwilligung";
import { zustimmungNoetig } from "@/lib/datenschutz/zustimmung";
import { useProfile } from "@/lib/einstellungen/useProfile";

const CodeScreen = dynamic(() => import("@/components/begleitung/CodeScreen").then((m) => m.CodeScreen));

/** Seiten ohne Abfrage (Rechtstexte, Anmelden, Einladung) */
const FREI = ["/datenschutz", "/impressum", "/nutzungsbedingungen", "/anmelden", "/beitreten"];

export function CodeGate() {
  const path = usePathname();
  const profile = useProfile();
  const { erteilt } = useEinwilligungen();
  const state = useCodeScreenState();
  const ready = Boolean(profile) && !zustimmungNoetig(path, erteilt("bedingungen")) && !FREI.includes(path) && !path.startsWith("/e/");
  const [status, setStatus] = useState<AssistantStatus>();
  const [version, setVersion] = useState(0);
  useEffect(() => onCodeChange(() => setVersion((v) => v + 1)), []);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    void fetchStatus().then((s) => active && setStatus(s));
    return () => {
      active = false;
    };
  }, [ready, version, state.open]);
  const needs = Boolean(status?.configured && status.needsCode);
  // Der Code selbst geht nur an unseren Server (keine KI) – die KI-Einwilligung kommt danach wie gehabt
  const askCode = needs && status?.access !== "ok";
  if (!codeScreenNoetig({ askCode, later: state.later, requested: state.open && needs, ready })) return null;
  return <CodeScreen change={state.change} />;
}
