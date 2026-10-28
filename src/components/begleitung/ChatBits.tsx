"use client";

// Kleine Teile des Chats: Einwilligungs-Karte und Lautsprecher an Nachrichten

import { Square, Volume2 } from "lucide-react";
import Link from "next/link";
import { setEinwilligung } from "@/lib/datenschutz/einwilligung";
import { buttonClass } from "@/components/ui/styles";
import { kiOkText } from "@/lib/begleitung/kiOk";

/**
 * KI-Einwilligung (Platz 23): freiwillig, ein Satz, „Erlauben“ / „Nicht jetzt“ – ohne OK fragt die App die KI nie.
 * ElevenLabs steht nur drin, wenn die Stimme vom Server aktiv ist (`stimme`); „Nicht jetzt“ schließt nur die Karte.
 */
export function ConsentCard({ name, stimme, onLater }: { name: string; stimme: boolean; onLater: () => void }) {
  return (
    <section className="flex w-full flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-card" aria-label="Darf ich mitdenken?">
      <p className="font-bold">{name} braucht kurz dein OK.</p>
      <p className="text-sm text-muted">
        {kiOkText(stimme)}{" "}
        <Link href="/datenschutz" className="font-semibold text-accent-strong underline">
          Mehr dazu
        </Link>
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={() => setEinwilligung("ki", true)} className={buttonClass("primary")}>
          Erlauben
        </button>
        <button type="button" onClick={onLater} className={buttonClass("ghost")}>
          Nicht jetzt
        </button>
      </div>
    </section>
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
