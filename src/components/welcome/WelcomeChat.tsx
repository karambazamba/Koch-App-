"use client";

// Erster Start: kurzes Kennenlernen (max. 4 Abschnitte, jederzeit
// "Überspringen"). Schritt 1 ist eine ruhige Begrüßung im Vollbild, danach
// geht es im Chat weiter. Jeder Schritt steht genau einmal da (aus dem
// Zustand gebaut); Antippen einer Antwort öffnet ihn wieder. "Wer gehört
// dazu?" ist ein kleines Formular im Chat, das Gesagtes selbst ausfüllt.

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUp, Check, Mic, Plus, Square, X } from "lucide-react";
import { LotteAvatar } from "@/components/LotteAvatar";
import { HELPER_NAME_MAX } from "@/lib/einstellungen/profile";
import {
  addMember,
  answer,
  asksFamily,
  assistantNoun,
  chipsFor,
  editStep,
  examplesFor,
  initialWelcome,
  removeMember,
  sectionOf,
  setMember,
  skipWelcome,
  transcript,
  WELCOME_TILES,
  type WelcomeChip,
  type WelcomeState,
} from "@/lib/einstellungen/welcome";
import { finishWelcome, loadWelcomeState, saveWelcomeState } from "@/lib/einstellungen/welcomeStore";
import { recognizeAnswer } from "@/lib/einstellungen/onboarding/recognizer";
import { expectReplace } from "@/lib/core/navigation";
import { now } from "@/lib/core/now";
import { openHelper } from "@/lib/lotte/open";
import { useSpeechInput } from "@/lib/lotte/useSpeechInput";

const BUBBLE = "max-w-[85%] whitespace-pre-line rounded-3xl px-4 py-3 text-base leading-snug";
const SKIP = "h-10 rounded-full px-3 text-sm font-bold text-muted active:bg-stone-100";

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
    if (state?.custom) inputRef.current?.focus();
  }, [state?.step, state?.custom, state?.answered.length]);

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
    if (input.text && state.step === "wer") {
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
    void send({ text: state?.step === "name" && state.custom ? t.slice(0, HELPER_NAME_MAX) : t });
  };

  if (!state) return <div className="min-h-dvh bg-background" />;

  // --- Schritt 1: Begrüßung im Vollbild --------------------------------------
  if (state.step === "hallo") {
    return (
      <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background" role="dialog" aria-label="Kennenlernen">
        <div className="mx-auto flex w-full max-w-lg justify-end px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <button type="button" onClick={() => update(skipWelcome(state))} className={SKIP}>
            Überspringen
          </button>
        </div>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-5 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center">
          <div className="relative">
            <LotteAvatar size={120} />
            <span className="absolute -right-2 -top-1 origin-bottom-right text-[34px]" style={{ animation: "wave 1.6s ease-in-out 0.3s 2" }} aria-hidden>
              👋
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-[32px] font-extrabold leading-tight tracking-tight">Hi, ich bin {state.helper.name}.</h1>
            <p className="text-base leading-snug text-muted">{assistantNoun(state.helper)} für den Alltag – ich behalte den Überblick, du lebst.</p>
          </div>
          <ul className="grid w-full grid-cols-3 gap-2" aria-label="Was ich kann">
            {WELCOME_TILES.map((t) => (
              <li key={t.label} className="flex flex-col items-center gap-1.5 rounded-card border border-line bg-surface px-2 py-3 shadow-card">
                <span className="text-2xl" aria-hidden>
                  {t.emoji}
                </span>
                <span className="text-[13px] font-semibold leading-tight">{t.label}</span>
              </li>
            ))}
          </ul>
          <p className="w-full rounded-2xl bg-accent-soft px-4 py-3 text-[15px] font-medium text-accent-strong">🎙 Sprich einfach mit mir – ich verstehe eine Menge.</p>
          <button type="button" onClick={() => void send({ chip: "los" })} className="mt-2 h-14 w-full rounded-full bg-bar text-lg font-bold text-on-bar shadow-lg active:scale-[0.98]">
            Los geht&apos;s
          </button>
          <button type="button" onClick={() => void send({ chip: "anders" })} className="h-11 text-base font-semibold text-muted underline">
            Lieber anders nennen
          </button>
        </div>
      </div>
    );
  }

  // --- Ab Schritt 2: im Chat -------------------------------------------------
  const chips = chipsFor(state);
  const section = sectionOf(state.step);
  const examples = state.step === "fertig" ? examplesFor(state, now().getHours()) : [];
  const turns = transcript(state);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background" role="dialog" aria-label="Kennenlernen">
      <header className="relative z-10 mx-auto flex w-full max-w-lg shrink-0 flex-col gap-3 bg-background px-4 pb-1 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="flex items-center gap-3">
          <LotteAvatar size={44} />
          <h1 className="min-w-0 flex-1 truncate text-2xl font-extrabold tracking-tight">{state.helper.name}</h1>
          {state.step !== "fertig" && (
            <button type="button" onClick={() => update(skipWelcome(state))} className={SKIP}>
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
        {turns.map((turn) => (
          <div key={turn.step} className="flex flex-col gap-3" data-step={turn.step}>
            <div className="flex items-end gap-2">
              <LotteAvatar size={28} />
              <div className={`${BUBBLE} rounded-bl-lg border border-line bg-surface shadow-card`}>{turn.question}</div>
            </div>
            {turn.answer !== null && (
              <button type="button" onClick={() => update(editStep(state, turn.step))} className={`${BUBBLE} self-end rounded-br-lg bg-accent text-left text-on-accent active:scale-[0.98]`} aria-label={`${turn.answer} – ändern`}>
                {turn.answer}
              </button>
            )}
            {turn.current && turn.step === "wer" && <WhoForm state={state} onChange={update} />}
            {turn.current && turn.step === "name" && state.custom && <p className="pl-9 text-sm text-muted">Tipp den Namen unten ein (bis {HELPER_NAME_MAX} Zeichen).</p>}
            {turn.current && chips.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-9" aria-label="Antworten">
                {chips.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    disabled={chip.disabled}
                    aria-pressed={chip.kind === "select" ? Boolean(chip.selected) : undefined}
                    onClick={() => void send({ chip: chip.value })}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[15px] font-semibold transition active:scale-95 disabled:opacity-40 ${chipClass(chip)}`}
                  >
                    {chip.selected && chip.kind === "select" && <Check className="h-4 w-4" strokeWidth={2.75} aria-hidden />}
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
            {turn.current && turn.step === "wer" && asksFamily(state) && <p className="pl-9 text-sm text-muted">Tipp: „Ich bin Felix, dazu Lisa und die Kinder …“ – ich fülle das aus.</p>}
            {turn.current && turn.step === "fertig" && (
              <>
                <div className="flex flex-wrap gap-2 pl-9" aria-label="Beispiele">
                  {examples.map((ex) => (
                    <button key={ex} type="button" onClick={() => void send({ text: ex })} className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-[15px] font-semibold active:scale-95">
                      „{ex}“
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <LotteAvatar size={28} />
                  <div className={`${BUBBLE} rounded-bl-lg border border-line bg-surface shadow-card`}>Alles, was du hier eingestellt hast, kannst du jederzeit ändern – sag&apos;s mir oder schau in die Einstellungen.</div>
                </div>
                <div className="pl-9">
                  <button type="button" onClick={() => void send({ chip: "start" })} className="inline-flex min-h-11 items-center rounded-full border border-bar bg-bar px-4 text-[15px] font-semibold text-on-bar active:scale-95">
                    Zur Startseite
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {busy && <p className="pl-9 text-sm text-muted">…</p>}
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
            maxLength={state.step === "name" && state.custom ? HELPER_NAME_MAX : 300}
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

const FIELD = "min-w-0 flex-1 bg-transparent py-3 text-base font-semibold placeholder:font-normal placeholder:text-muted/70 focus:outline-none";

/** "Wer gehört dazu?": eigener Name (Pflicht) und – bei Familie – die anderen mit Erwachsen | Kind */
function WhoForm({ state, onChange }: { state: WelcomeState; onChange: (s: WelcomeState) => void }) {
  const [focusLast, setFocusLast] = useState(false);
  const family = asksFamily(state);
  const me = state.members[0] ?? { name: "", kid: false };
  return (
    <section className="ml-9 flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card" aria-label="Wer gehört dazu?">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">Dein Name</span>
        <div className="flex items-center gap-2 border-b border-line">
          <input value={me.name} onChange={(e) => onChange(setMember(state, 0, { name: e.target.value.slice(0, 40) }))} placeholder="Wie heißt du?" aria-label="Dein Name" autoComplete="given-name" className={FIELD} />
          <span className="shrink-0 text-sm text-muted">Erwachsen</span>
        </div>
      </div>
      {family && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Familie</span>
          <ul className="flex flex-col" aria-label="Familie">
            {state.members.slice(1).map((m, j) => {
              const i = j + 1;
              const last = i === state.members.length - 1;
              return (
                <li key={i} className="flex items-center gap-1.5 border-b border-line">
                  <input
                    value={m.name}
                    onChange={(e) => onChange(setMember(state, i, { name: e.target.value.slice(0, 40) }))}
                    placeholder="Name"
                    aria-label={`Person ${i}`}
                    autoFocus={focusLast && last}
                    className={FIELD}
                  />
                  <div className="flex shrink-0 rounded-lg bg-segment p-0.5" role="radiogroup" aria-label={`${m.name || `Person ${i}`}: erwachsen oder Kind`}>
                    {([false, true] as const).map((kid) => (
                      <button
                        key={String(kid)}
                        type="button"
                        role="radio"
                        aria-checked={m.kid === kid}
                        onClick={() => onChange(setMember(state, i, { kid }))}
                        className={`h-8 rounded-md px-2 text-[13px] font-bold ${m.kid === kid ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
                      >
                        {kid ? "Kind" : "Erwachsen"}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => onChange(removeMember(state, i))} aria-label={`${m.name || `Person ${i}`} entfernen`} className="flex h-11 w-9 shrink-0 items-center justify-center text-muted">
                    <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => {
              setFocusLast(true);
              onChange(addMember(state));
            }}
            className="flex h-11 items-center gap-1.5 self-start text-[15px] font-bold text-accent-strong"
          >
            <Plus className="h-4 w-4" strokeWidth={2.75} aria-hidden />
            Person hinzufügen
          </button>
        </div>
      )}
    </section>
  );
}
