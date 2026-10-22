"use client";

// Seite /pinnwand: oben das Feld „Nachricht an alle …“ (Mias Diktat-Mikro
// orange) und daneben das rosé Mikro für Sprachnachrichten (gedrückt halten),
// darunter Nachrichten und Sprachnachrichten als weiße Karten – dauerhaft
// Angeheftetes zuerst, hellorange umrandet. Antippen = reagieren, anheften,
// eigene löschen; beim eigenen Memo „Gehört von“.

import { useState } from "react";
import { ArrowUp, Mic, Square } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN } from "@/components/ui/styles";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { helperName } from "@/lib/einstellungen/profile";
import {
  PIN_MAX,
  REACTIONS,
  addPin,
  changePins,
  createPin,
  markPinsRead,
} from "@/lib/pinnwand";
import { useSpeechInput } from "@/lib/begleitung/useSpeechInput";
import { buzz } from "@/components/heute/actions";
import { PinSheet, pinMetaLine } from "@/components/pinnwand/PinSheets";
import { useBoard } from "@/components/pinnwand/useBoard";
import { MemoItem, MemoSheet } from "@/components/pinnwand/MemoRow";
import { MemoMic, MemoNote, RecordingRow } from "@/components/pinnwand/MemoParts";
import { useCanRecordMemo, useMemoRecorder } from "@/components/pinnwand/useMemoRecorder";

export function PinboardView() {
  const profile = useProfile();
  const me = profile?.persons[0]?.name.trim() || "Ich";
  const board = useBoard(me);
  const recorder = useMemoRecorder({ me });
  const canRecord = useCanRecordMemo();
  const [text, setText] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const speech = useSpeechInput({
    onTranscript: (t) => setText(t.slice(0, PIN_MAX)),
    onEnd: (t) => t && setText(t.slice(0, PIN_MAX)),
  });
  // Reihenfolge (angeheftet → neueste) kommt aus useBoard (Regel `PINS`)
  const list = board.items;
  const sorted = list;
  const selected = list?.find((m) => m.id === open) ?? null;
  const send = () => {
    const pin = createPin(text, me);
    if (!pin) return;
    speech.reset();
    changePins((all) => addPin(all, pin));
    setText("");
    buzz();
  };
  return (
    <>
      <PageHeader title="Pinnwand" backHref="/" />
      <main className={PAGE_MAIN} data-tone="pinnwand">
        <div className="flex items-center gap-2.5">
          <form
            className={`${CARD} flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-4 pr-1.5`}
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              value={speech.listening ? speech.interim || text : text}
              onChange={(e) => setText(e.target.value.slice(0, PIN_MAX))}
              placeholder="Nachricht an alle …"
              aria-label="Nachricht an alle"
              maxLength={PIN_MAX}
              enterKeyHint="send"
              className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint"
            />
            {text.trim() ? (
              <button
                type="submit"
                aria-label="Anheften"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent active:scale-95"
              >
                <ArrowUp className="h-5 w-5" strokeWidth={2.5} aria-hidden />
              </button>
            ) : (
              speech.supported !== false && (
                <button
                  type="button"
                  onClick={() =>
                    speech.listening ? speech.stop() : speech.start()
                  }
                  aria-label={
                    speech.listening ? "Zuhören beenden" : "Einsprechen"
                  }
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent active:scale-95 ${speech.listening ? "animate-pulse" : ""}`}
                >
                  {speech.listening ? (
                    <Square
                      className="h-4 w-4 fill-current"
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : (
                    <Mic className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                  )}
                </button>
              )
            )}
          </form>
          {canRecord && (
            <MemoMic recorder={recorder} size={44} />
          )}
        </div>
        {recorder.phase !== "idle" ? (
          <div className={`${CARD} p-3`}>
            <RecordingRow recorder={recorder} />
          </div>
        ) : (
          canRecord &&
          !recorder.note && (
            <p className="-mt-1 px-1 text-[13px] text-muted">
              Rosa Mikro antippen = Sprachnachricht an alle
            </p>
          )
        )}
        <MemoNote text={recorder.note} />

        {!sorted ? (
          <div className={`${CARD} h-32 animate-pulse`} />
        ) : sorted.length === 0 ? (
          <p className="px-1 py-6 text-center text-base text-muted">
            Hier hinterlasst ihr euch kleine Nachrichten – z. B. „Bin um 20 Uhr
            da“ – oder sprecht sie einfach ein. Sie verschwinden nach ein paar
            Tagen von selbst.
          </p>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="Nachrichten">
            {sorted.map((item) => {
              if (item.kind === "memo") {
                return (
                  <li key={item.id} className={`${CARD} p-3.5`}>
                    <MemoItem
                      memo={item.memo}
                      me={me}
                      household={board.household}
                      onOpen={() => setOpen(item.id)}
                    />
                  </li>
                );
              }
              const m = item.pin;
              const reacted = REACTIONS.filter(
                (r) => (m.data.reactions[r]?.length ?? 0) > 0,
              );
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(m.id);
                      changePins((all) => markPinsRead(all, me));
                    }}
                    className={`${CARD} flex w-full items-start gap-3 p-3.5 text-left ${m.data.pinned ? "border-2 border-accent-soft" : ""}`}
                    aria-label={`${m.data.text} – ${pinMetaLine(m, me)}${m.data.pinned ? " – angeheftet" : ""}`}
                  >
                    <PersonAvatar name={m.data.author} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[16px] font-semibold leading-snug">
                        {m.data.text}
                      </span>
                      <span className="text-sm text-muted">
                        {pinMetaLine(m, me)}
                        {m.data.pinned ? " · angeheftet" : ""}
                      </span>
                    </span>
                    {reacted.length > 0 && (
                      <span className="shrink-0 text-sm">
                        {reacted.join("")}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="px-1 text-center text-sm text-muted">
          Oder sag {helperName(profile)}: „Schreib an die Pinnwand: …“
        </p>
      </main>
      {selected?.kind === "pin" && (
        <PinSheet
          message={selected.pin}
          me={me}
          onClose={() => setOpen(null)}
        />
      )}
      {selected?.kind === "memo" && (
        <MemoSheet
          memo={selected.memo}
          me={me}
          household={board.household}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
