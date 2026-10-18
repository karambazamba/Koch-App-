"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowUp, Mic, MicOff, Sparkles, Square, Volume2, VolumeX, X } from "lucide-react";
import { helperName } from "@/lib/profile";
import { HelperAvatar } from "./HelperAvatar";
import {
  askAssistant,
  loadVoicePreference,
  saveVoicePreference,
  speak,
  stopSpeaking,
  useAssistantStatus,
  voiceSupported,
} from "@/lib/assistant/client";
import type { AssistantData, ChangeOp } from "@/lib/assistant/ops";
import type { ChatTurn } from "@/lib/assistant/protocol";
import { useKeyboardInset } from "@/lib/useMobileKeyboard";
import { useSpeechInput } from "@/lib/useSpeechInput";
import { DEFAULT_SHOPPING_DAY, toIsoDate, useToday, weekStartFor } from "@/lib/weekPlan";
import { ICON_BUTTON, INPUT_BASE, NOTE, chipClass } from "@/components/ui/styles";
import { ProposalCard } from "./ProposalCard";

export type ChatTurnView = ChatTurn & {
  /** Fehlermeldung – wird nicht an die KI geschickt */
  error?: boolean;
  /** Nur in der App erzeugt ("Übernommen ✓") – wird nicht an die KI geschickt */
  local?: boolean;
};

export type Proposal = { ops: ChangeOp[]; selected: Set<string> };
export type ChatState = { turns: ChatTurnView[]; proposal: Proposal | null };

const EXAMPLES = [
  "Donnerstag und Freitag gibt es meine Rezepte, der Rest vegetarisch",
  "Tausch Dienstag und Mittwoch",
  "Setz Milch und Haferflocken auf die Einkaufsliste",
];

type Props = {
  data: AssistantData | null | undefined;
  chat: ChatState;
  setChat: Dispatch<SetStateAction<ChatState>>;
  onApply: (selected: Set<string>) => void;
  onClose: () => void;
};

/** Panel von unten: Chatverlauf, Vorschlag, großes Mikrofon und Textfeld */
export function HelperPanel({ data, chat, setChat, onApply, onClose }: Props) {
  const status = useAssistantStatus(true);
  const today = useToday();
  const inset = useKeyboardInset();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [voiceOn, setVoiceOn] = useState(loadVoicePreference);
  const [dictationHint, setDictationHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const collected = useRef("");

  const ready = Boolean(status?.configured && data && today);
  const name = helperName(data?.profile);
  const voice = data?.profile.helper.voice ?? "weiblich";

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || busy || !data || !today) return;
    const history: ChatTurn[] = [
      ...chat.turns.filter((t) => !t.error && !t.local).map(({ role, text: t }) => ({ role, text: t })),
      { role: "user", text: question },
    ];
    setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: question }] }));
    setInput("");
    setAdjusting(false);
    setBusy(true);
    try {
      const shoppingDay = data.profile.shoppingDay || DEFAULT_SHOPPING_DAY;
      const result = await askAssistant(history, chat.proposal?.ops ?? [], data, toIsoDate(today), weekStartFor(today, shoppingDay));
      setChat((c) => {
        // Bisher abgewählte Punkte bleiben abgewählt, neue sind ausgewählt
        const previous = new Set(c.proposal?.ops.map((op) => op.id));
        const selected = new Set(
          result.ops.filter((op) => !previous.has(op.id) || c.proposal?.selected.has(op.id)).map((op) => op.id),
        );
        return {
          turns: [...c.turns, { role: "assistant", text: result.reply }],
          proposal: result.ops.length > 0 ? { ops: result.ops, selected } : null,
        };
      });
      if (voiceOn) speak(result.reply, voice);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Da ist etwas schiefgelaufen.";
      setChat((c) => ({ ...c, turns: [...c.turns, { role: "assistant", text: message, error: true }] }));
    } finally {
      setBusy(false);
    }
  };

  // Panel geschlossen → eine noch laufende Aufnahme nicht mehr abschicken
  // (vor useSpeechInput, damit dieses Aufräumen zuerst läuft)
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Gesprochenes sammeln; wenn die Aufnahme endet, wird es abgeschickt
  const speech = useSpeechInput({
    onFinal: (t) => {
      collected.current = `${collected.current} ${t}`.trim();
      setInput(collected.current);
    },
    onEnd: () => {
      const t = collected.current;
      collected.current = "";
      if (t && mounted.current) void ask(t);
    },
  });

  const toggleMic = () => {
    if (speech.supported === false) {
      // Fallback: Diktat über die Tastatur
      setDictationHint(true);
      inputRef.current?.focus();
      return;
    }
    if (speech.listening) {
      speech.stop();
    } else {
      stopSpeaking();
      collected.current = "";
      setInput("");
      speech.start();
    }
  };

  // Escape schließt, Seite dahinter scrollt nicht mit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      stopSpeaking();
    };
  }, [onClose]);

  // Neue Nachrichten sichtbar machen
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.turns.length, busy, chat.proposal]);

  const toggleVoice = () => {
    const on = !voiceOn;
    setVoiceOn(on);
    saveVoicePreference(on);
    if (!on) stopSpeaking();
  };

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal aria-label={`${name} – Küchenhelfer`}>
      <button type="button" aria-label="Küchenhelfer schließen" onClick={onClose} className="absolute inset-0 bg-black/25" />
      <section
        className="absolute inset-x-0 mx-auto flex w-full max-w-lg flex-col rounded-t-3xl bg-background shadow-sheet"
        style={{
          bottom: inset,
          height: `min(88dvh, calc(100dvh - ${inset}px - env(safe-area-inset-top) - 0.5rem))`,
        }}
      >
        <header className="flex flex-col gap-2 px-4 pt-2">
          <span className="mx-auto h-1 w-10 rounded-full bg-stone-300" aria-hidden />
          <div className="flex items-center gap-3">
            <HelperAvatar size={44} variant="badge" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-2xl font-extrabold leading-tight tracking-tight">
                {name}
                {status?.mock && (
                  <span className="ml-2 align-middle rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">Testmodus</span>
                )}
              </h2>
              <p className="text-sm text-muted">dein Küchenhelfer</p>
            </div>
            {voiceSupported() && (
              <button
                type="button"
                onClick={toggleVoice}
                aria-pressed={voiceOn}
                aria-label="Antworten vorlesen"
                className={ICON_BUTTON}
              >
                {voiceOn ? (
                  <Volume2 className="h-5 w-5 text-accent" strokeWidth={2.25} aria-hidden />
                ) : (
                  <VolumeX className="h-5 w-5 text-muted" strokeWidth={2.25} aria-hidden />
                )}
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Schließen" className={ICON_BUTTON}>
              <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
          {status === undefined || data === undefined ? (
            <div className="h-20 animate-pulse rounded-card bg-surface" />
          ) : !status.configured ? (
            <p className={NOTE} role="note">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden />
              <span>
                <span className="font-bold">KI noch nicht eingerichtet.</span> Sobald der API-Schlüssel hinterlegt ist, plant der
                Küchenhelfer mit dir per Sprache – Vorschläge kommen immer erst als Vorschau.
              </span>
            </p>
          ) : data === null ? (
            <p className={NOTE} role="note">
              <span>
                Leg zuerst euer{" "}
                <Link href="/profil" onClick={onClose} className="font-bold text-accent-strong underline">
                  Haushaltsprofil
                </Link>{" "}
                an – dann weiß der Küchenhelfer, für wen er plant.
              </span>
            </p>
          ) : (
            <p className="max-w-[85%] self-start rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-2.5 text-base leading-snug text-ink">
              Hi, ich bin {name} – was steht an?
            </p>
          )}
          {ready && chat.turns.length === 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col items-start gap-2">
                {EXAMPLES.map((example) => (
                  <button key={example} type="button" onClick={() => void ask(example)} className={`${chipClass(false)} text-left`}>
                    „{example}“
                  </button>
                ))}
              </div>
            </div>
          )}

          {chat.turns.map((turn, i) => (
            <p
              key={i}
              className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-base leading-snug ${
                turn.role === "user"
                  ? "self-end rounded-br-md bg-accent text-white"
                  : turn.error
                    ? "self-start rounded-bl-md border border-red-200 bg-red-50 text-red-700"
                    : "self-start rounded-bl-md border border-line bg-surface text-ink"
              }`}
            >
              {turn.text}
            </p>
          ))}

          {busy && (
            <p className="self-start rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-2.5 text-muted" role="status">
              <span className="animate-pulse">Ich plane …</span>
            </p>
          )}

          {chat.proposal && data && !busy && (
            <ProposalCard
              data={data}
              proposal={chat.proposal}
              adjusting={adjusting}
              onToggle={(id) =>
                setChat((c) => {
                  if (!c.proposal) return c;
                  const selected = new Set(c.proposal.selected);
                  if (selected.has(id)) selected.delete(id);
                  else selected.add(id);
                  return { ...c, proposal: { ...c.proposal, selected } };
                })
              }
              onApply={() => chat.proposal && onApply(chat.proposal.selected)}
              onAdjust={() => {
                setAdjusting(true);
                inputRef.current?.focus();
              }}
              onDiscard={() => {
                setAdjusting(false);
                setChat((c) => ({ turns: [...c.turns, { role: "assistant", text: "Okay, verworfen.", local: true }], proposal: null }));
              }}
            />
          )}
        </div>

        <footer className="safe-bottom flex flex-col gap-2 border-t border-line px-4 pt-3">
          {(speech.error || dictationHint) && (
            <p className="text-sm text-muted" role="note">
              {speech.error ||
                "Spracheingabe gibt es in diesem Browser nicht – tipp aufs Mikrofon deiner Tastatur und diktiere einfach."}
            </p>
          )}
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
          >
            <button
              type="button"
              onClick={toggleMic}
              disabled={!ready || busy}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? "Zuhören beenden" : "Frage einsprechen"}
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
              disabled={!ready}
              enterKeyHint="send"
              aria-label="Nachricht an den Küchenhelfer"
              placeholder={
                speech.listening
                  ? speech.interim || "Ich höre zu …"
                  : adjusting
                    ? "Was soll anders sein?"
                    : `Frag ${name} …`
              }
              className={`${INPUT_BASE} h-12 flex-1 px-4`}
            />
            <button
              type="submit"
              disabled={!ready || busy || !input.trim()}
              aria-label="Senden"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-sm transition active:scale-95 disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </button>
          </form>
        </footer>
      </section>
    </div>
  );
}
