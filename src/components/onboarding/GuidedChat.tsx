"use client";

// Geführtes Gespräch (Kennenlernen bzw. neue Person beim Küchenhelfer):
// Nachrichten, Antwort-Chips, Namensbestätigung und Eingabe per Sprache oder
// Tippen. Der Ablauf selbst steckt in src/lib/onboarding/engine.ts.

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Mic, MicOff, Pencil, Square, Trash2 } from "lucide-react";
import {
  aiKindFor,
  answer,
  chipsFor,
  placeholderFor,
  removeName,
  renameName,
  revisit,
  skip,
  type OnboardingState,
} from "@/lib/onboarding/engine";
import { nameVariants } from "@/lib/onboarding/names";
import { cleanSpeech } from "@/lib/onboarding/recognize";
import { recognizeAnswer } from "@/lib/onboarding/recognizer";
import { personLabel } from "@/lib/profile";
import { useSpeechInput } from "@/lib/useSpeechInput";
import { INPUT_BASE, buttonClass, chipClass } from "@/components/ui/styles";

type Props = {
  state: OnboardingState;
  onChange: (state: OnboardingState) => void;
  /** Chip im letzten Schritt ("plan", "look", "fertig") */
  onFinish: (choice: string) => void;
};

const BUBBLE = "max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-base leading-snug";

export function GuidedChat({ state, onChange, onFinish }: Props) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ index: number; value: string } | null>(null);
  const [dictationHint, setDictationHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const collected = useRef("");
  // Immer mit dem neuesten Stand antworten (auch nach der Spracheingabe)
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });

  const done = state.step === "done";
  const chips = chipsFor(state);

  const send = async (raw: string) => {
    const text = cleanSpeech(raw);
    if (!text || busy) return;
    setInput("");
    const current = latest.current;
    const kind = aiKindFor(current.step);
    let recognized;
    if (kind) {
      setBusy(true);
      const names = current.draft.persons.map((p) => p.name).filter(Boolean);
      const person = current.draft.persons.find((p) => p.id === current.personId);
      recognized = await recognizeAnswer(kind, text, names, person ? personLabel(person, current.draft.persons) : undefined);
      setBusy(false);
    }
    onChange(answer(latest.current, { text, recognized }));
  };

  const pick = (value: string) => {
    if (busy) return;
    if (done) return onFinish(value);
    setEditing(null);
    onChange(answer(state, { chip: value }));
  };

  const speech = useSpeechInput({
    onFinal: (t) => {
      collected.current = `${collected.current} ${t}`.trim();
      setInput(collected.current);
    },
    onEnd: () => {
      const t = collected.current;
      collected.current = "";
      if (t) void send(t);
    },
  });

  const toggleMic = () => {
    if (speech.supported === false) {
      setDictationHint(true);
      inputRef.current?.focus();
      return;
    }
    if (speech.listening) speech.stop();
    else {
      collected.current = "";
      setInput("");
      speech.start();
    }
  };

  // Neue Nachrichten sichtbar machen
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [state.messages.length, busy, state.names.length, editing]);

  const saveEdit = () => {
    if (!editing) return;
    onChange(renameName(state, editing.index, editing.value));
    setEditing(null);
  };

  return (
    <>
      <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {state.messages.map((m) =>
          m.from === "user" ? (
            <p key={m.id} className={`${BUBBLE} self-end rounded-br-md bg-accent text-white`}>
              {m.text}
            </p>
          ) : m.target && !(done && state.mode === "addPerson") ? (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(revisit(state, m.target!))}
              aria-label={`${m.text} – antippen zum Ändern`}
              className={`${BUBBLE} self-start rounded-bl-md border border-line bg-surface text-left text-ink`}
            >
              {m.text}
              <Pencil className="ml-1.5 inline h-3.5 w-3.5 align-baseline text-muted" strokeWidth={2} aria-hidden />
            </button>
          ) : (
            <p key={m.id} className={`${BUBBLE} self-start rounded-bl-md border border-line bg-surface text-ink`}>
              {m.text}
            </p>
          ),
        )}

        {state.step === "confirmNames" && (
          <div className="flex flex-wrap gap-2" data-no-swipe>
            {state.names.map((n, i) =>
              editing?.index === i ? (
                <form
                  key={i}
                  className="flex w-full flex-col gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveEdit();
                  }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={editing.value}
                      onChange={(e) => setEditing({ index: i, value: e.target.value })}
                      maxLength={30}
                      aria-label={`Name ${n.name} korrigieren`}
                      className={`${INPUT_BASE} h-11 flex-1 px-3`}
                    />
                    <button type="submit" aria-label="Name speichern" className={buttonClass("primary", "sm")}>
                      <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`${n.name} entfernen`}
                      onClick={() => {
                        onChange(removeName(state, i));
                        setEditing(null);
                      }}
                      className={buttonClass("danger", "sm")}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                </form>
              ) : (
                <div key={i} className="contents">
                  <button
                    type="button"
                    onClick={() => setEditing({ index: i, value: n.name })}
                    aria-label={`${n.name} – antippen zum Korrigieren`}
                    className={chipClass(true)}
                  >
                    {n.name}
                    <Pencil className="ml-1 h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  </button>
                  {nameVariants(n.name).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => onChange(renameName(state, i, v))}
                      aria-label={`Lieber ${v} schreiben`}
                      className={chipClass(false, "muted")}
                    >
                      {v}?
                    </button>
                  ))}
                </div>
              ),
            )}
          </div>
        )}

        {busy && (
          <p className={`${BUBBLE} self-start rounded-bl-md border border-line bg-surface text-muted`} role="status">
            <span className="animate-pulse">Moment …</span>
          </p>
        )}
      </div>

      <footer className="safe-bottom flex flex-col gap-3 border-t border-line px-4 pt-3">
        {(chips.length > 0 || !done) && (
          <div className="flex flex-wrap gap-2" data-no-swipe>
            {chips.map((c) =>
              done ? (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => pick(c.value)}
                  className={`${buttonClass(c.primary ? "primary" : "secondary", "lg")} w-full`}
                >
                  {c.label}
                </button>
              ) : (
                <button key={c.value} type="button" onClick={() => pick(c.value)} disabled={busy} className={chipClass(Boolean(c.primary))}>
                  {c.label}
                </button>
              ),
            )}
            {!done && state.step !== "household" && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  onChange(skip(state));
                }}
                disabled={busy}
                className={chipClass(false, "muted")}
              >
                Überspringen
              </button>
            )}
          </div>
        )}

        {!done && (
          <>
            {(speech.error || dictationHint) && (
              <p className="text-sm text-muted" role="note">
                {speech.error || "Spracheingabe gibt es in diesem Browser nicht – tipp aufs Mikrofon deiner Tastatur und diktiere einfach."}
              </p>
            )}
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <button
                type="button"
                onClick={toggleMic}
                disabled={busy}
                aria-pressed={speech.listening}
                aria-label={speech.listening ? "Zuhören beenden" : "Antwort einsprechen"}
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-md transition active:scale-95 disabled:opacity-40 ${
                  speech.listening ? "animate-pulse ring-4 ring-accent/25" : ""
                }`}
              >
                {speech.listening ? (
                  <Square className="h-6 w-6 fill-current" strokeWidth={2} aria-hidden />
                ) : speech.supported === false ? (
                  <MicOff className="h-6 w-6" strokeWidth={2} aria-hidden />
                ) : (
                  <Mic className="h-7 w-7" strokeWidth={2} aria-hidden />
                )}
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                enterKeyHint="send"
                maxLength={600}
                aria-label="Deine Antwort"
                placeholder={speech.listening ? speech.interim || "Ich höre zu …" : placeholderFor(state)}
                className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-4`}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Senden"
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-sm transition active:scale-95 disabled:opacity-40"
              >
                <ArrowUp className="h-5 w-5" strokeWidth={2.5} aria-hidden />
              </button>
            </form>
          </>
        )}
      </footer>
    </>
  );
}
