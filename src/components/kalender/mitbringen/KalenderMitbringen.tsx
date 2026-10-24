"use client";

// „Kalender mitbringen“: ruhige Karte oben im Kalender („Termine schon
// woanders? Hol sie rein.“ – Apple · Google · Outlook · Später) und die
// geführten Schritte (ein Schritt pro Bildschirm, Weiter/Zurück am Ende).
// Zum Schluss Link einfügen – aus der Zwischenablage erkannt („Diesen Link
// verwenden?“) – und verbinden. Erfolg: Mia freut sich, „Steht drin. 23
// Termine in den nächsten 4 Wochen.“, „Noch einen hinzufügen“.

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ClipboardPaste, Copy, FileUp, Info, Link2, Mail, Monitor, Settings2, Share2, ToggleRight, type LucideIcon } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { CARD, INPUT, NOTE, buttonClass } from "@/components/ui/styles";
import { APP_NAME } from "@/lib/core/app";
import { unlockFeature } from "@/lib/core/features";
import { todayIso } from "@/lib/core/now";
import { triggerAvatar } from "@/lib/core/avatarState";
import { loadAboEntries, useAbos } from "@/lib/kalender/abo/store";
import {
  ANBIETER,
  HINWEIS_GEHEIM,
  HINWEIS_RICHTUNG,
  SCHRITTE,
  angebotFuer,
  changeAngebot,
  erfolgsSatz,
  kalenderLink,
  laterAngebot,
  mailAnMich,
  onOpenMitbringen,
  termineIn4Wochen,
  useAngebot,
  type Anbieter,
  type Schritt,
} from "@/lib/kalender/mitbringen/angebot";

const ICONS: Record<Schritt["icon"], LucideIcon> = { einstellungen: Settings2, kalender: CalendarDays, info: Info, schalter: ToggleRight, teilen: Share2, kopieren: Copy, computer: Monitor, link: Link2 };

/** Karte oben im Kalender (nur solange etwas zu bringen ist) */
export function MitbringenKarte({ today, ownTermine }: { today: string; ownTermine: number }) {
  const state = useAngebot();
  const abos = useAbos();
  const [open, setOpen] = useState<Anbieter | null>(null);
  useEffect(() => onOpenMitbringen(setOpen), []);
  const kind = state && abos ? angebotFuer(state, { today, ownTermine, abos: abos.length }) : null;
  return (
    <>
      {kind && (
        <section className={`${CARD} flex flex-col gap-3 ${kind === "gross" ? "p-4" : "px-4 py-3"}`} aria-label="Kalender mitbringen">
          <p className={kind === "gross" ? "text-[17px] font-bold" : "text-[15px] font-semibold"}>Termine schon woanders? Hol sie rein.</p>
          <div className="flex flex-wrap gap-2">
            {ANBIETER.map((a) => (
              <button key={a.id} type="button" onClick={() => setOpen(a.id)} className={buttonClass("secondary", "sm")}>
                {a.name}
              </button>
            ))}
            <button type="button" onClick={() => changeAngebot((s) => laterAngebot(s, today))} className={`${buttonClass("ghost", "sm")} text-muted`}>
              Später
            </button>
          </div>
        </section>
      )}
      {open && <MitbringenSheet anbieter={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Nur zum Öffnen per Mia (z. B. auf Einstellungen → Kalender) */
export function MitbringenHost() {
  const [open, setOpen] = useState<Anbieter | null>(null);
  useEffect(() => onOpenMitbringen(setOpen), []);
  return open ? <MitbringenSheet anbieter={open} onClose={() => setOpen(null)} /> : null;
}

function MitbringenSheet({ anbieter, onClose }: { anbieter: Anbieter; onClose: () => void }) {
  const steps = SCHRITTE[anbieter];
  const name = ANBIETER.find((a) => a.id === anbieter)!.name;
  const [step, setStep] = useState(0);
  const [url, setUrl] = useState("");
  const [found, setFound] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const last = step >= steps.length;

  const paste = async () => {
    setError("");
    try {
      const link = kalenderLink(await navigator.clipboard.readText());
      if (link) setFound(link);
      else setError("In der Zwischenablage ist gerade kein Kalender-Link.");
    } catch {
      setError("Die Zwischenablage darf ich gerade nicht lesen – füg den Link einfach ins Feld ein.");
    }
  };

  const connect = async (link: string) => {
    setBusy(true);
    setError("");
    unlockFeature("kalender");
    const { addAbo } = await import("@/lib/kalender/abo/sync");
    const result = await addAbo({ url: link, name: "", raum: "familie", fallback: name });
    setBusy(false);
    if ("error" in result) return setError(result.error);
    changeAngebot((s) => ({ ...s, done: true }));
    triggerAvatar("freuen");
    setDone(erfolgsSatz(termineIn4Wochen(loadAboEntries(), todayIso())));
  };

  if (done) {
    return (
      <Sheet title={`${name} verbunden`} onClose={onClose}>
        <div className="flex flex-col gap-4 pb-3">
          <p className="text-[17px] font-bold">{done}</p>
          <p className={NOTE}>{HINWEIS_RICHTUNG}</p>
          <button type="button" onClick={onClose} className={buttonClass("primary", "md")}>
            Fertig
          </button>
          <button
            type="button"
            onClick={() => {
              setDone(null);
              setStep(steps.length);
              setUrl("");
              setFound(null);
            }}
            className={buttonClass("ghost", "md")}
          >
            Noch einen hinzufügen
          </button>
        </div>
      </Sheet>
    );
  }

  const Icon = last ? Link2 : ICONS[steps[step].icon];
  return (
    <Sheet title={`${name}-Kalender holen`} onClose={onClose}>
      <div className="flex flex-col gap-4 pb-3">
        <p className="text-sm font-semibold text-muted">{last ? "Zum Schluss" : `Schritt ${step + 1} von ${steps.length}`}</p>
        <span className="flex h-20 w-20 items-center justify-center self-center rounded-full bg-accent-soft text-accent-strong">
          <Icon className="h-10 w-10" strokeWidth={2} aria-hidden />
        </span>
        {!last ? (
          <>
            <p className="text-center text-[17px] leading-snug">{steps[step].text}</p>
            {anbieter === "google" && step === 0 && (
              <a href={mailAnMich("google", APP_NAME)} className={`${buttonClass("ghost", "md")} self-center`}>
                <Mail className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                Anleitung per Mail an mich schicken
              </a>
            )}
          </>
        ) : found ? (
          <div className="flex flex-col gap-3">
            <p className="text-center text-[17px] font-bold">Diesen Link verwenden?</p>
            <p className="break-all rounded-field bg-fill px-3 py-2 text-sm text-muted">{found}</p>
            <button type="button" disabled={busy} onClick={() => void connect(found)} className={buttonClass("primary", "md")}>
              {busy ? "Ich hole die Termine …" : "Ja, verbinden"}
            </button>
            <button type="button" onClick={() => setFound(null)} className={buttonClass("ghost", "md")}>
              Nein
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => void paste()} className={buttonClass("secondary", "md")}>
              <ClipboardPaste className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              Link aus der Zwischenablage holen
            </button>
            <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="oder hier einfügen" aria-label="Kalender-Link" className={INPUT} />
            <button type="button" disabled={busy || !url.trim()} onClick={() => void connect(kalenderLink(url) ?? url.trim())} className={buttonClass("primary", "md")}>
              {busy ? "Ich hole die Termine …" : "Verbinden"}
            </button>
          </div>
        )}
        {error && (
          <p className="rounded-field bg-warn-soft px-3 py-2 text-sm font-semibold text-warn-ink" role="status">
            {error}
          </p>
        )}
        {anbieter === "apple" && last && <p className={NOTE}>{HINWEIS_GEHEIM}</p>}
        <div className="flex items-center justify-between gap-2">
          <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className={`${buttonClass("ghost", "md")} disabled:invisible`}>
            Zurück
          </button>
          {!last && (
            <button type="button" onClick={() => setStep((s) => s + 1)} className={buttonClass("primary", "md")}>
              Weiter
            </button>
          )}
        </div>
        <Link href="/profil/kalender" onClick={onClose} className="hit inline-flex items-center gap-2 self-center text-sm font-semibold text-muted underline">
          <FileUp className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          Lieber eine .ics-Datei einlesen
        </Link>
      </div>
    </Sheet>
  );
}
