"use client";

// Erster Start: kurzes Kennenlernen im Chat (Vollbild, max. 4 Abschnitte,
// jederzeit "Überspringen"). Antworten per Chip, Text oder Sprache; mit KI
// werden freie Antworten (Namen) besser verstanden, ohne KI greifen Regeln.
// Danach erscheint die Startseite passend zu den Antworten.

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUp, Check, Mic, Square } from "lucide-react";
import { LotteAvatar } from "@/components/LotteAvatar";
import { HELPER_NAME_MAX } from "@/lib/einstellungen/profile";
import { answer, chipsFor, examplesFor, initialWelcome, sectionOf, skipWelcome, type WelcomeChip, type WelcomeState } from "@/lib/einstellungen/welcome";
import { finishWelcome, loadWelcomeState, saveWelcomeState } from "@/lib/einstellungen/welcomeStore";
import { recognizeAnswer } from "@/lib/einstellungen/onboarding/recognizer";
import { expectReplace } from "@/lib/core/navigation";
import { now } from "@/lib/core/now";
import { openHelper } from "@/lib/lotte/open";
import { useSpeechInput } from "@/lib/lotte/useSpeechInput";

const BUBBLE = "max-w-[85%] whitespace-pre-line rounded-3xl px-4 py-3 text-base leading-snug";

function chipClass(chip: WelcomeChip) {
  if (chip.kind === "primary") return "bg-bar text-on-bar border-bar";
  if (chip.selected) return "bg-accent-soft text-accent-strong border-accent";
  return "bg-surface text-ink border-line";
}

export function WelcomeChat() {
  const router = useRouter();
  const pathname = usePathname();
  // Zwischenstand aus dem Speicher (erst im Browser) – sonst von vorn
  const [state, setState] = useState<WelcomeState | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- einmalig den gespeicherten Stand laden (localStorage gibt es erst im Browser)
    setState(loadWelcomeState() ?? initialWelcome());
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    if (state?.step === "eigener") inputRef.current?.focus();
  }, [state?.turns.length, state?.step]);

  const update = (next: WelcomeState) => {
    setState(next);
    saveWelcomeState(next);
  };

  /** Fertig → Startseite (auf /profil weiterleiten), evtl. gleich einen Satz an die Assistentin */
  const finish = (current: WelcomeState, ask?: string) => {
    finishWelcome(current);
    if (pathname !== "/") {
      expectReplace();
      router.replace("/");
    }
    if (ask) setTimeout(() => openHelper(undefined, ask), 400);
  };

  const speech = useSpeechInput({
    onTranscript: (t) => setInput(t),
    onEnd: (t) => {
      setInput("");
      if (t) void send({ text: t });
    },
  });

  const send = async (input: { chip?: string; text?: string }) => {
    if (!state || busy) return;
    if (state.step === "fertig") {
      const text = input.chip ?? input.text;
      if (text === "start") return finish(state);
      if (text) return finish(state, text);
      return;
    }
    let names;
    // Mit KI: Namen und Kind/erwachsen aus freier Antwort verstehen (sonst Regeln)
    if (input.text && (state.step === "wer" || state.step === "bestaetigen")) {
      setBusy(true);
      names = (await recognizeAnswer("names", input.text, []))?.names;
      setBusy(false);
    }
    update(answer(state, { ...input, names }));
  };

  const submitText = () => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    void send({ text: state?.step === "eigener" ? t.slice(0, HELPER_NAME_MAX) : t });
  };

  if (!state) return <div className="min-h-dvh bg-background" />;
  const chips = chipsFor(state);
  const section = sectionOf(state.step);
  const examples = state.step === "fertig" ? examplesFor(state, now().getHours()) : [];
  const lastAssistant = state.turns.map((t) => t.from).lastIndexOf("assistent");

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background" role="dialog" aria-label="Kennenlernen">
      <header className="relative z-10 mx-auto flex w-full max-w-lg shrink-0 flex-col gap-3 bg-background px-4 pb-1 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="flex items-center gap-3">
          <LotteAvatar size={44} />
          <h1 className="min-w-0 flex-1 truncate text-2xl font-extrabold tracking-tight">{state.helper.name}</h1>
          {state.step !== "fertig" && (
            <button type="button" onClick={() => update(skipWelcome(state))} className="h-10 rounded-full px-3 text-sm font-bold text-muted active:bg-stone-100">
              Überspringen
            </button>
          )}
        </div>
        <div className="flex gap-1.5" role="progressbar" aria-label="Fortschritt" aria-valuemin={1} aria-valuemax={4} aria-valuenow={section}>
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= section ? "bg-accent" : "bg-segment"}`} />
          ))}
        </div>
      </header>

      <div ref={listRef} className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col gap-3 overflow-y-auto px-4 pt-4 pb-4" aria-live="polite">
        {state.turns.map((turn, i) =>
          turn.from === "assistent" ? (
            <div key={i} className="flex items-end gap-2">
              <LotteAvatar size={28} />
              <div className={`${BUBBLE} rounded-bl-lg border border-line bg-surface shadow-card`}>
                {turn.text}
                {turn.lines && (
                  <ul className="mt-2 flex flex-col gap-1 text-[15px]">
                    {turn.lines.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div key={i} className={`${BUBBLE} self-end rounded-br-lg bg-accent text-on-accent`}>
              {turn.text}
            </div>
          ),
        )}
        {busy && <p className="pl-9 text-sm text-muted">…</p>}
        {(chips.length > 0 || examples.length > 0) && lastAssistant >= 0 && (
          <div className="flex flex-wrap gap-2 pl-9" aria-label="Antworten">
            {chips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                aria-pressed={chip.kind === "select" ? Boolean(chip.selected) : undefined}
                onClick={() => void send({ chip: chip.value })}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[15px] font-semibold transition active:scale-95 ${chipClass(chip)}`}
              >
                {chip.selected && chip.kind === "select" && <Check className="h-4 w-4" strokeWidth={2.75} aria-hidden />}
                {chip.label}
              </button>
            ))}
            {examples.map((ex) => (
              <button key={ex} type="button" onClick={() => void send({ text: ex })} className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-[15px] font-semibold active:scale-95">
                „{ex}“
              </button>
            ))}
            {state.step === "fertig" && (
              <button type="button" onClick={() => void send({ chip: "start" })} className="inline-flex min-h-11 items-center rounded-full border border-bar bg-bar px-4 text-[15px] font-semibold text-on-bar active:scale-95">
                Zur Startseite
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-lg shrink-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {state.step === "fertig" && <p className="mb-2 text-center text-sm text-muted">Tipp: Halte das Mikrofon gedrückt und sprich los.</p>}
        <form
          className="flex h-16 items-center gap-2 rounded-full bg-bar pl-5 pr-2 shadow-lg"
          onSubmit={(e) => {
            e.preventDefault();
            submitText();
          }}
        >
          <input
            ref={inputRef}
            value={speech.listening ? speech.interim || input : input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={state.step === "eigener" ? HELPER_NAME_MAX : 300}
            enterKeyHint="send"
            aria-label="Antwort"
            placeholder={speech.listening ? "Ich höre zu …" : "Antworten oder einsprechen …"}
            className="h-full min-w-0 flex-1 bg-transparent text-base text-on-bar placeholder:text-on-bar/60 focus:outline-none"
          />
          {input.trim() && !speech.listening ? (
            <button type="submit" aria-label="Senden" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent active:scale-95">
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              aria-label={speech.listening ? "Zuhören beenden" : "Gedrückt halten und sprechen"}
              aria-pressed={speech.listening}
              onPointerDown={(e) => {
                if (speech.supported === false) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                if (!speech.listening) speech.start();
              }}
              onPointerUp={() => speech.listening && speech.stop()}
              onClick={() => {
                if (speech.supported === false) inputRef.current?.focus();
              }}
              className={`flex h-12 w-12 shrink-0 touch-none items-center justify-center rounded-full bg-accent text-on-accent transition active:scale-95 ${speech.listening ? "animate-pulse ring-4 ring-accent/30" : ""}`}
            >
              {speech.listening ? <Square className="h-5 w-5 fill-current" strokeWidth={2} aria-hidden /> : <Mic className="h-6 w-6" strokeWidth={2.25} aria-hidden />}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
