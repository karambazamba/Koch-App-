"use client";

// Seite /pinnwand (Tafel 69, 70): oben rechts ＋ = Mia schreibt mit, darunter
// das Mikro für Sprachnachrichten; die Nachrichten als weiße Karten –
// dauerhaft Angeheftetes zuerst. Gesten wie bei WhatsApp (SwipeRow): links
// wischen = löschen (nur eigene), rechts wischen = antworten, lange drücken =
// Reaktionen + Menü (ReactionMenu). Antworten zeigen das Zitat, Reaktionen
// stehen klein darunter („❤️ 👍 Lisa, Felix“). Aus der Kachel geöffnet
// (`?n=<id>`) springt die Seite zur Nachricht und hebt sie kurz hervor.

import { useEffect, useState } from "react";
import { Pin, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN, PAGE_PLUS } from "@/components/ui/styles";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { helperName } from "@/lib/einstellungen/profile";
import { changePins, markPinsRead, reactionLine, type PinMessage } from "@/lib/pinnwand";
import { markHintSeen, useHintSeen } from "@/lib/core/hints";
import { openQuick } from "@/lib/core/schnelleingabe";
import type { PinQuote } from "@/lib/pinnwand";
import { PinWriteSheet, pinMetaLine } from "@/components/pinnwand/PinSheets";
import { useBoard, type BoardItem } from "@/components/pinnwand/useBoard";
import { MemoItem } from "@/components/pinnwand/MemoRow";
import { MemoMic, MemoNote, RecordingRow } from "@/components/pinnwand/MemoParts";
import { useCanRecordMemo, useMemoRecorder } from "@/components/pinnwand/useMemoRecorder";
import { SwipeRow } from "@/components/pinnwand/SwipeRow";
import { ReactionMenu } from "@/components/pinnwand/ReactionMenu";
import { deleteItem, mayDelete, replyTo } from "@/components/pinnwand/boardActions";
import { MicStrip } from "@/components/ui/MicPermission";

/** Immer im Kopf (früher nur einmal, Hinweis „pinnwand-24h“) */
const PIN_SUBLINE = "Nachrichten und Sprachnachrichten verschwinden nach 24 Stunden.";

function PinBody({ pin, me }: { pin: PinMessage; me: string }) {
  const reacted = reactionLine(pin.data.reactions);
  return (
    <div className={`${CARD} flex w-full items-start gap-3 p-3.5 ${pin.data.pinned ? "border-2 border-accent-soft" : ""}`}>
      <PersonAvatar name={pin.data.author} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {pin.data.replyTo && (
          <span className="mb-1 rounded-field border-l-[3px] border-work bg-fill px-2.5 py-1.5 text-[13px] leading-snug text-muted">
            <span className="font-bold text-ink">{pin.data.replyTo.author}</span> {pin.data.replyTo.text}
          </span>
        )}
        <span className="whitespace-pre-line text-[16px] font-semibold leading-snug">{pin.data.text}</span>
        <span className="flex items-center gap-1 text-sm text-muted">
          {pin.data.pinned && <Pin className="h-[13px] w-[13px] shrink-0 text-accent" strokeWidth={2.25} aria-label="Dauerhaft angeheftet" />}
          {pinMetaLine(pin, me)}
        </span>
        {reacted && <span className="text-[13px] text-muted">{reacted}</span>}
      </span>
    </div>
  );
}

function Body({ item, me, household }: { item: BoardItem; me: string; household: string[] }) {
  return item.kind === "pin" ? (
    <PinBody pin={item.pin} me={me} />
  ) : (
    <div className={`${CARD} p-3.5`}>
      <MemoItem memo={item.memo} me={me} household={household} />
    </div>
  );
}

export function PinboardView() {
  const profile = useProfile();
  const me = profile?.persons[0]?.name.trim() || "Ich";
  const helper = helperName(profile);
  const board = useBoard(me);
  const recorder = useMemoRecorder({ me });
  const canRecord = useCanRecordMemo();
  const [writing, setWriting] = useState<{ text: string; quote: PinQuote | null } | null>(null);
  const [held, setHeld] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const gesturesSeen = useHintSeen("pinnwand-gesten");
  const list = board.items;
  const heldItem = list?.find((i) => i.id === held) ?? null;
  const write = () => openQuick({ kind: "pinnwand", me, more: (text) => setWriting({ text, quote: null }) });
  const reply = (text: string, quote: PinQuote) => setWriting({ text, quote });

  // Gelesen, sobald die Seite offen ist
  const hasList = Boolean(list?.length);
  useEffect(() => {
    if (hasList) changePins((all) => markPinsRead(all, me));
  }, [hasList, me]);

  // Aus der Kachel: zur Nachricht springen und sie kurz hervorheben
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("n");
    if (!id || !hasList) return;
    const on = setTimeout(() => {
      setFocus(id);
      document.getElementById(`n-${id}`)?.scrollIntoView({ block: "center" });
    }, 0);
    const off = setTimeout(() => setFocus(null), 2400);
    return () => (clearTimeout(on), clearTimeout(off));
  }, [hasList]);

  return (
    <>
      <PageHeader
        title="Pinnwand"
        subtitle={PIN_SUBLINE}
        backHref="/"
        action={
          <button type="button" onClick={write} aria-label="Nachricht an die Pinnwand" className={PAGE_PLUS}>
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </button>
        }
      />
      <main className={PAGE_MAIN} data-tone="pinnwand">
        <MicStrip />
        {canRecord && (
          <div className={`${CARD} flex items-center gap-3 p-3`}>
            {recorder.phase !== "idle" ? (
              <div className="min-w-0 flex-1">
                <RecordingRow recorder={recorder} />
              </div>
            ) : (
              <span className="min-w-0 flex-1 text-[15px] text-muted">Sprachnachricht an alle</span>
            )}
            {recorder.phase === "idle" && <MemoMic recorder={recorder} size={44} />}
          </div>
        )}
        <MemoNote text={recorder.note} onResend={recorder.unsent ? recorder.resend : undefined} />

        {!list ? (
          <div className={`${CARD} h-32 animate-pulse`} />
        ) : list.length === 0 ? (
          <p className="px-1 py-6 text-center text-base text-muted">Hinterlasst euch hier Nachrichten – tippt auf ＋ oder sprecht eine Sprachnachricht ein.</p>
        ) : (
          <>
            {gesturesSeen === false && (
              <button type="button" onClick={() => markHintSeen("pinnwand-gesten")} className="rounded-field bg-fill px-3 py-2 text-left text-[13px] font-semibold text-muted">
                Wischen: ← löschen · → antworten · Lange drücken: reagieren
              </button>
            )}
            <ul className="flex flex-col gap-2" aria-label="Nachrichten">
              {list.map((item) => (
                <li key={item.id} id={`n-${item.id}`}>
                  <SwipeRow
                    label={item.kind === "pin" ? `${item.pin.data.text} – ${pinMetaLine(item.pin, me)}` : `Sprachnachricht – ${pinMetaLine(item.memo, me)}`}
                    mine={mayDelete(item, me)}
                    highlight={focus === item.id}
                    onDelete={() => deleteItem(item, me)}
                    onReply={() => replyTo(item, me, reply)}
                    onHold={() => {
                      markHintSeen("pinnwand-gesten");
                      setHeld(item.id);
                    }}
                  >
                    <Body item={item} me={me} household={board.household} />
                  </SwipeRow>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="px-1 text-center text-sm text-muted">Oder sag {helper}: „Schreib an die Pinnwand: …“</p>
      </main>
      {heldItem && (
        <ReactionMenu item={heldItem} me={me} household={board.household} helper={helper} onWrite={reply} onClose={() => setHeld(null)}>
          <Body item={heldItem} me={me} household={board.household} />
        </ReactionMenu>
      )}
      {writing && <PinWriteSheet me={me} initialText={writing.text} quote={writing.quote} onClose={() => setWriting(null)} />}
    </>
  );
}
