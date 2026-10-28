"use client";

// Seite /pinnwand als Kühlschranktür (Tafel 106/1): Kopf „‹ Heute“, rechts
// das orange ＋ (= „Neuer Zettel“), großer Titel. Darunter die Tür (heller
// Verlauf, feiner Rand, Griff rechts) mit den Zetteln in zwei Spalten –
// „Bleibt hängen“ oben links, sonst neueste zuerst. Antippen oder lange
// drücken = Menü, Haken-Kreis = Erledigt (Häkchen orange, 1 s stehen, dann
// weich ins Archiv). Unter der Tür „Ältere · n ›“ (Archiv, nach 30 Tagen still weg).
// Sieht ein eigener Zettel nach Notiz aus, fragt Mia einmal. Aus der Kachel
// geöffnet (`?n=<id>`) springt die Seite zum Zettel und hebt ihn kurz hervor.

import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN, PAGE_PLUS, buttonClass } from "@/components/ui/styles";
import { Sheet } from "@/components/ui/Sheet";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { PINNWAND_TIPP, changePins, guessHeight, markPinsRead, papierFor, twoColumns, usePins } from "@/lib/pinnwand";
import { NOTIZ_FRAGE, markNoteAsked, noteQuestionFor } from "@/lib/pinnwand/notizBruecke";
import { quoteOf } from "@/lib/pinnwand/schreiben";
import { now, todayIso } from "@/lib/core/now";
import { clearDemoTile, demoTiles, useDemo } from "@/lib/core/demo";
import { demoBoard } from "@/lib/pinnwand/beispiel";
import { helperName } from "@/lib/einstellungen/profile";
import { useBoard, type BoardItem } from "@/components/pinnwand/useBoard";
import { Zettel } from "@/components/pinnwand/Zettel";
import { NeuerZettel, type ZettelArt } from "@/components/pinnwand/NeuerZettel";
import { ReactionMenu } from "@/components/pinnwand/ReactionMenu";
import { moveToNotes, toggleDone } from "@/components/pinnwand/boardActions";
import { MicStrip } from "@/components/ui/MicPermission";
import type { PinQuote } from "@/lib/pinnwand";

const heightOf = (i: BoardItem) => (i.kind === "memo" ? guessHeight("memo") : guessHeight(i.pin.data.papier, i.pin.data.text));

function Spalten({ items, render }: { items: BoardItem[]; render: (i: BoardItem) => ReactNode }) {
  const [left, right] = twoColumns(items, heightOf);
  return (
    <div className="grid grid-cols-2 gap-x-3.5">
      {[left, right].map((col, c) => (
        <ul key={c} className="flex min-w-0 flex-col gap-5 pt-3" aria-label={c === 0 ? "Zettel links" : "Zettel rechts"}>
          {col.map((i) => (
            <li key={i.id}>{render(i)}</li>
          ))}
        </ul>
      ))}
    </div>
  );
}

export function PinboardView() {
  const profile = useProfile();
  const me = profile?.persons[0]?.name.trim() || "Ich";
  const board = useBoard(me);
  const pins = usePins();
  const karo = papierFor(me, profile?.persons) === "karo";
  const [writing, setWriting] = useState<{ quote: PinQuote | null; art: ZettelArt } | null>(null);
  const [held, setHeld] = useState<{ id: string; archived: boolean } | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [older, setOlder] = useState(false);
  const list = board.items;
  const heldItem = held ? ((held.archived ? board.archived : list)?.find((i) => i.id === held.id) ?? null) : null;
  const question = pins ? noteQuestionFor(pins, me, board.nowMs) : null;
  // Beispiel-Tag: die Beispiele hängen auch hier, bis der erste echte Zettel kommt
  const demoState = useDemo();
  const demoOn = Boolean(list) && demoTiles(demoState, todayIso()).includes("pinnwand");
  const hasOwn = board.hasOwn;
  useEffect(() => {
    if (demoOn && hasOwn) clearDemoTile("pinnwand");
  }, [demoOn, hasOwn]);
  const demo = demoOn && !hasOwn ? demoBoard(helperName(profile)) : null;

  // Gelesen, sobald die Seite offen ist
  const hasList = Boolean(list?.length);
  useEffect(() => {
    if (hasList) changePins((all) => markPinsRead(all, me));
  }, [hasList, me]);

  // Aus der Kachel: zum Zettel springen und ihn kurz hervorheben
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

  const reply = (item: BoardItem) => setWriting({ quote: quoteOf(item.kind === "pin" ? item.pin : { id: item.id, data: { author: item.memo.data.author } }), art: "zettel" });
  const answer = (yes: boolean) => {
    if (!question) return;
    const item: BoardItem = { kind: "pin", id: question.id, at: question.erstellt, pinned: question.data.pinned, pin: question };
    changePins((all) => markNoteAsked(all, question.id, now().toISOString()));
    if (yes) moveToNotes(item);
  };

  return (
    <>
      <PageHeader
        title="Pinnwand"
        backHref="/"
        action={
          <button type="button" onClick={() => setWriting({ quote: null, art: "zettel" })} aria-label="Neuer Zettel" className={PAGE_PLUS}>
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </button>
        }
      />
      <main className={PAGE_MAIN} data-tone="pinnwand">
        <MicStrip />
        {question && (
          <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Frage">
            <p className="text-[16px] font-semibold">{NOTIZ_FRAGE}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => answer(true)} className={`${buttonClass("primary", "sm")} flex-1`}>
                Ja
              </button>
              <button type="button" onClick={() => answer(false)} className={`${buttonClass("secondary", "sm")} flex-1`}>
                Bleibt hier
              </button>
            </div>
          </section>
        )}
        <section className="kuehlschrank min-h-[220px] py-3 pl-3 pr-5" aria-label="Kühlschranktür">
          {!list ? (
            <div className="h-40 animate-pulse" />
          ) : demo ? (
            <>
              <span className="absolute right-6 top-2 z-10 rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-muted">Beispiel</span>
              <Spalten
                items={[
                  { kind: "pin", id: demo.pins[0].id, at: demo.pins[0].erstellt, pinned: false, pin: demo.pins[0] },
                  { kind: "memo", id: demo.memos[0].id, at: demo.memos[0].erstellt, memo: demo.memos[0] },
                  { kind: "pin", id: demo.pins[1].id, at: demo.pins[1].erstellt, pinned: false, pin: demo.pins[1] },
                ]}
                render={(item) => <Zettel item={item} me={me} household={board.household} demo tone={item.id === demo.mia ? "mia" : undefined} onOpen={() => setWriting({ quote: null, art: "zettel" })} />}
              />
            </>
          ) : list.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 px-4 text-center">
              <p className="text-[16px] font-semibold text-muted">{PINNWAND_TIPP}</p>
              <button type="button" onClick={() => setWriting({ quote: null, art: "zettel" })} className={buttonClass("soft", "sm")}>
                Erster Zettel
              </button>
            </div>
          ) : (
            <Spalten
              items={list}
              render={(item) => <Zettel item={item} me={me} household={board.household} highlight={focus === item.id} onOpen={() => setHeld({ id: item.id, archived: false })} onDone={() => toggleDone(item, me)} />}
            />
          )}
        </section>
        {board.archived.length > 0 && (
          <button type="button" onClick={() => setOlder(true)} className={`${CARD} flex min-h-12 items-center gap-1 px-4 text-left text-[16px] font-semibold`}>
            Ältere · {board.archived.length}
            <ChevronRight className="h-4 w-4 text-muted" strokeWidth={2.5} aria-hidden />
          </button>
        )}
      </main>
      {older && (
        <Sheet title="Ältere Zettel" onClose={() => setOlder(false)} tall>
          <div className="kuehlschrank mb-4 py-2 pl-3 pr-5">
            <Spalten items={board.archived} render={(item) => <Zettel item={item} me={me} household={board.household} onOpen={() => setHeld({ id: item.id, archived: true })} />} />
          </div>
        </Sheet>
      )}
      {heldItem && held && (
        <ReactionMenu item={heldItem} me={me} household={board.household} archived={held.archived} onReply={() => reply(heldItem)} onClose={() => setHeld(null)}>
          <Zettel item={heldItem} me={me} household={board.household} onOpen={() => setHeld(null)} />
        </ReactionMenu>
      )}
      {writing && <NeuerZettel me={me} household={board.household} karo={karo} quote={writing.quote} art={writing.art} onClose={() => setWriting(null)} />}
    </>
  );
}
