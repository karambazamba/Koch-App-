"use client";

// PINNWAND (weiß): Zettel am Kühlschrank. Kopf "PINNWAND" (+ oranger Punkt
// bei Ungelesenem), "+" = neue Nachricht (bis 140 Zeichen, Mikrofon,
// "Anheften"). S/M/L = 1/2/4 neueste Nachrichten: Kreis mit Anfangsbuchstabe
// (feste Farbe je Person), Text, klein "Lisa · 7:48". Antippen → 👍 ❤️,
// dauerhaft anheften, Löschen (nur eigene, mit Rückgängig).

import { useEffect, useState } from "react";
import { Mic, Pin, Plus, Square, Trash2 } from "lucide-react";
import { Sheet } from "@/components/plan/Sheet";
import { CARD, INPUT_BASE, buttonClass, chipClass } from "@/components/ui/styles";
import { QuickButton } from "@/components/ui/QuickButton";
import type { TileSize } from "@/lib/core/homeLayout";
import { now, todayIso, toIsoDate } from "@/lib/core/now";
import { showDeleted } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { PIN_MAX, REACTIONS, addPin, changePins, createPin, hasUnread, markPinsRead, personTone, pinMeta, removePin, setPinPinned, toggleReaction, usePins, visiblePins, type PinMessage } from "@/lib/pinnwand";
import { useSpeechInput } from "@/lib/lotte/useSpeechInput";
import { shortClock } from "@/components/notizen/Schnellnotiz";
import { buzz } from "./actions";

const TONES = ["bg-accent", "bg-work", "bg-person-3", "bg-person-4"];

function Avatar({ name }: { name: string }) {
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white ${TONES[personTone(name)]}`} aria-hidden>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

const meta = (m: PinMessage, me: string) => pinMeta(m, me, todayIso(), shortClock, (iso) => toIsoDate(new Date(iso)));

export function PinboardTile({ size = "M", me }: { size?: TileSize; me: string }) {
  const pins = usePins();
  const [writing, setWriting] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const nowMs = now().getTime();
  const list = pins ? visiblePins(pins, nowMs) : [];
  const shown = list.slice(0, size === "S" ? 1 : size === "L" ? 4 : 2);
  const unread = pins ? hasUnread(pins, me, nowMs) : false;
  const selected = list.find((m) => m.id === open) ?? null;
  return (
    <>
      <section className={`${CARD} relative flex min-h-[92px] flex-col p-3.5`} aria-label="Pinnwand">
        <span className="flex items-center gap-1.5 pr-8 text-[11px] font-bold uppercase tracking-wider text-muted">
          <Pin className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
          Pinnwand
          {unread && <span className="h-2 w-2 rounded-full bg-accent" aria-label="Neue Nachricht" />}
        </span>
        <span className="absolute right-3.5 top-3">
          <QuickButton icon={Plus} label="Neue Nachricht an die Pinnwand" onClick={() => setWriting(true)} />
        </span>
        {shown.length ? (
          <ul className="mt-1.5 flex flex-col gap-2">
            {shown.map((m) => {
              const reacted = REACTIONS.filter((r) => (m.data.reactions[r]?.length ?? 0) > 0);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(m.id);
                      changePins((all) => markPinsRead(all, me));
                    }}
                    className="flex w-full items-start gap-2.5 text-left"
                    aria-label={`${m.data.text} – ${meta(m, me)}`}
                  >
                    <Avatar name={m.data.author} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="line-clamp-2 text-[14.5px] font-semibold leading-snug">{m.data.text}</span>
                      <span className="text-xs text-muted">
                        {meta(m, me)}
                        {m.data.pinned ? " · 📌" : ""}
                      </span>
                    </span>
                    {reacted.length > 0 && <span className="shrink-0 text-sm">{reacted.join("")}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <button type="button" onClick={() => setWriting(true)} className="hit mt-1 text-left text-[14px] text-muted">
            Kurze Nachricht an alle – z. B. „Bin um 20 Uhr da“
          </button>
        )}
      </section>
      {writing && <PinWriteSheet me={me} onClose={() => setWriting(false)} />}
      {selected && <PinSheet message={selected} me={me} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Neue Nachricht: Textfeld (max. 140) mit Mikrofon, "Anheften" */
function PinWriteSheet({ me, onClose }: { me: string; onClose: () => void }) {
  const [text, setText] = useState("");
  const speech = useSpeechInput({ onTranscript: (t) => setText(t.slice(0, PIN_MAX)), onEnd: (t) => t && setText(t.slice(0, PIN_MAX)) });
  const save = () => {
    const pin = createPin(text, me);
    if (!pin) return;
    speech.reset();
    changePins((all) => addPin(all, pin));
    buzz();
    onClose();
  };
  return (
    <Sheet title="An die Pinnwand" onClose={onClose}>
      <form
        className="flex flex-col gap-3 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="flex items-start gap-2">
          <textarea
            value={speech.listening ? speech.interim || text : text}
            onChange={(e) => setText(e.target.value.slice(0, PIN_MAX))}
            placeholder="z. B. Bin um 20 Uhr da"
            aria-label="Nachricht"
            rows={3}
            autoFocus
            maxLength={PIN_MAX}
            className={`${INPUT_BASE} min-w-0 flex-1 resize-none px-4 py-3`}
          />
          {speech.supported !== false && (
            <button
              type="button"
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              aria-label={speech.listening ? "Zuhören beenden" : "Einsprechen"}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent active:scale-95 ${speech.listening ? "animate-pulse" : ""}`}
            >
              {speech.listening ? <Square className="h-5 w-5 fill-current" strokeWidth={2} aria-hidden /> : <Mic className="h-5 w-5" strokeWidth={2.25} aria-hidden />}
            </button>
          )}
        </div>
        <span className="-mt-1 self-end text-xs text-muted">
          {text.length}/{PIN_MAX}
        </span>
        <button type="submit" disabled={!text.trim()} className={buttonClass("primary")}>
          Anheften
        </button>
      </form>
    </Sheet>
  );
}

/** Nachricht: reagieren, dauerhaft anheften, löschen (nur eigene) */
function PinSheet({ message, me, onClose }: { message: PinMessage; me: string; onClose: () => void }) {
  const stamp = () => now().toISOString();
  useEffect(() => {
    changePins((all) => markPinsRead(all, me));
  }, [me]);
  const mine = message.data.author === me;
  return (
    <Sheet title="Pinnwand" onClose={onClose}>
      <div className="flex flex-col gap-4 pb-3">
        <div className="flex items-start gap-3">
          <Avatar name={message.data.author} />
          <div className="flex min-w-0 flex-col">
            <p className="text-lg font-semibold leading-snug">{message.data.text}</p>
            <span className="text-sm text-muted">{meta(message, me)}</span>
          </div>
        </div>
        <div className="flex gap-2" role="group" aria-label="Reagieren">
          {REACTIONS.map((r) => {
            const on = message.data.reactions[r]?.includes(me) ?? false;
            const count = message.data.reactions[r]?.length ?? 0;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                aria-label={`Mit ${r} reagieren`}
                onClick={() => {
                  buzz();
                  changePins((all) => toggleReaction(all, message.id, r, me, stamp()));
                }}
                className={`${chipClass(on)} text-lg`}
              >
                {r}
                {count > 0 && <span className="text-sm">{count}</span>}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => changePins((all) => setPinPinned(all, message.id, !message.data.pinned, stamp()))}
          className={buttonClass("secondary", "sm")}
        >
          <Pin className="h-4 w-4" strokeWidth={2} aria-hidden />
          {message.data.pinned ? "Nicht mehr dauerhaft – nach 3 Tagen weg" : "Dauerhaft anheften"}
        </button>
        {mine && (
          <button
            type="button"
            onClick={() => {
              const undo = changePins((all) => removePin(all, message.id));
              showDeleted(pushUndo("das Löschen der Pinnwand-Nachricht", undo));
              onClose();
            }}
            className={`${buttonClass("ghost", "sm")} text-red-600`}
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
            Löschen
          </button>
        )}
        {!message.data.pinned && <p className="text-xs text-muted">Nachrichten verschwinden nach 3 Tagen von selbst.</p>}
      </div>
    </Sheet>
  );
}
