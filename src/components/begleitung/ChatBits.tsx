"use client";

// Kleine Teile des Chats: Zugangscode-Karte und Lautsprecher an Nachrichten

import { useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { saveAccessCode } from "@/lib/begleitung/client";
import { INPUT_BASE, buttonClass } from "@/components/ui/styles";

/** Einmal den Zugangscode der Familie eingeben – danach versteht Lotte ganze Sätze */
export function AccessCodeCard({ onLater }: { onLater: () => void }) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "falsch" | "offline">("idle");
  const unlock = async () => {
    setState("busy");
    const ok = await saveAccessCode(code);
    setState(ok ? "idle" : ok === null ? "offline" : "falsch");
  };
  return (
    <form
      className="flex w-full flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-card"
      aria-label="Zugangscode"
      onSubmit={(e) => {
        e.preventDefault();
        void unlock();
      }}
    >
      <p className="font-bold">Damit ich ganze Sätze verstehe, brauch ich einmal euren Zugangscode.</p>
      <p className="text-sm text-muted">Ich merke ihn mir auf diesem Gerät. Ohne Code helfe ich trotzdem – nur etwas einfacher.</p>
      <input
        type="password"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoComplete="off"
        aria-label="Zugangscode"
        placeholder="Zugangscode"
        className={`${INPUT_BASE} h-12 px-4`}
      />
      {state === "falsch" && <p className="text-sm text-muted" role="status">Der Code passt noch nicht – schau nochmal nach.</p>}
      {state === "offline" && <p className="text-sm text-muted" role="status">Gerade komme ich nicht durch – probier es gleich nochmal.</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={!code.trim() || state === "busy"} className={buttonClass("primary", "sm")}>
          Freischalten
        </button>
        <button type="button" onClick={onLater} className={buttonClass("ghost", "sm")}>
          Später
        </button>
      </div>
    </form>
  );
}

/** Klein unter Lottes Antwort: "Vorlesen" (nochmal Tippen stoppt) */
export function SpeakButton({ speaking, onClick }: { speaking: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={speaking}
      aria-label={speaking ? "Vorlesen stoppen" : "Vorlesen"}
      className={`hit inline-flex h-7 items-center gap-1 px-1 text-[13px] font-semibold transition active:opacity-60 ${speaking ? "text-accent-strong" : "text-muted"}`}
    >
      {speaking ? <Square className="h-3 w-3 fill-current" strokeWidth={2} aria-hidden /> : <Volume2 className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />}
      {speaking ? "Stopp" : "Vorlesen"}
    </button>
  );
}
