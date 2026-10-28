"use client";

// Seite /pinnwand als Kühlschranktür (Tafel 106/1, Tafel 123): Kopf „‹ Heute“,
// rechts das orange ＋ (= „Neuer Zettel“), großer Titel. Darunter die Tür
// (heller Verlauf, feiner Rand, Griff rechts, so hoch wie der Inhalt) mit den
// Zetteln in zwei Spalten, große quer über beide – „Bleibt hängen“ (OBEN)
// vorn, sonst nach Platz. Antippen = Menü (Foto: groß im Fenster), lange
// drücken = Fenster (Größe, Nach oben, Nur für mich, Erledigt), halten und
// ziehen = verschieben; Haken-Kreis = Erledigt (Häkchen orange, 1 s stehen,
// dann weich ins Archiv). Ganz unten unter einer gestrichelten Linie die Ecke „Nur für mich
// · sieht nur du“ (einklappbar, pro Gerät gemerkt; ohne private Zettel und im
// Haushalt „allein“ keine Linie). Unter der Tür „Ältere · n ›“ (Archiv, nach
// 30 Tagen still weg).
// Sieht ein eigener Zettel nach Notiz aus, fragt Mia einmal. Aus der Kachel
// geöffnet (`?n=<id>`) springt die Seite zum Zettel und hebt ihn kurz hervor.

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, Lock, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN, PAGE_PLUS, buttonClass } from "@/components/ui/styles";
import { Sheet } from "@/components/ui/Sheet";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { NUR_FUER_MICH, NUR_FUER_MICH_ZEILE, PINNWAND_TIPP, changePins, markPinsRead, papierFor, usePins, wandBereiche } from "@/lib/pinnwand";
import { setPrivatZu, usePrivatZu } from "@/lib/pinnwand/ansicht";
import { useHaushalt } from "@/lib/einstellungen/useHaushalt";
import { NOTIZ_FRAGE, markNoteAsked, noteQuestionFor } from "@/lib/pinnwand/notizBruecke";
import { quoteOf } from "@/lib/pinnwand/schreiben";
import { now, todayIso } from "@/lib/core/now";
import { clearDemoTile, demoTiles, useDemo } from "@/lib/core/demo";
import { demoBoard } from "@/lib/pinnwand/beispiel";
import { haushaltOf } from "@/lib/core/haushalt";
import { useBoard, type BoardItem } from "@/components/pinnwand/useBoard";
import { Zettel } from "@/components/pinnwand/Zettel";
import { NeuerZettel, type ZettelArt } from "@/components/pinnwand/NeuerZettel";
import { ReactionMenu } from "@/components/pinnwand/ReactionMenu";
import { moveItem, moveToNotes, toggleDone } from "@/components/pinnwand/boardActions";
import { Wand } from "@/components/pinnwand/Wand";
import { ZettelFenster } from "@/components/pinnwand/ZettelFenster";
import { FotoFenster } from "@/components/pinnwand/FotoFenster";
import { MicStrip } from "@/components/ui/MicPermission";
import type { PinQuote } from "@/lib/pinnwand";

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
  const [arrange, setArrange] = useState<string | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const allein = useHaushalt() === "allein";
  const privatZu = usePrivatZu();
  const list = board.items;
  const bereiche = wandBereiche(list ?? [], (i) => i.kind === "pin" && i.pin.data.privat, allein);
  const arrangeItem = arrange ? (list?.find((i) => i.id === arrange) ?? null) : null;
  const fotoItem = foto ? (list?.find((i) => i.id === foto) ?? null) : null;
  const heldItem = held ? ((held.archived ? board.archived : list)?.find((i) => i.id === held.id) ?? null) : null;
  const question = pins ? noteQuestionFor(pins, me, board.nowMs) : null;
  // Beispiel-Tag: die Beispiele hängen auch hier, bis der erste echte Zettel kommt
  const demoState = useDemo();
  const demoOn = Boolean(list) && demoTiles(demoState, todayIso()).includes("pinnwand");
  const hasOwn = board.hasOwn;
  useEffect(() => {
    if (demoOn && hasOwn) clearDemoTile("pinnwand");
  }, [demoOn, hasOwn]);
  const demo = demoOn && !hasOwn ? demoBoard(haushaltOf(profile?.householdType)) : null;

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

  /** Antippen: Foto groß im Fenster, sonst das Menü */
  const open = (item: BoardItem) => (item.kind === "pin" && item.pin.data.papier === "foto" ? setFoto(item.id) : setHeld({ id: item.id, archived: false }));
  const renderZettel = (item: BoardItem, lifted: boolean) => (
    <Zettel item={item} me={me} household={board.household} highlight={focus === item.id} lifted={lifted} holdOpens={false} onOpen={() => open(item)} onDone={() => toggleDone(item, me)} />
  );
  const drop = (section: BoardItem[]) => (id: string, to: number) => {
    const item = section.find((i) => i.id === id);
    if (item) moveItem(item, section, to);
  };
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
        <section className="kuehlschrank py-3 pl-3 pr-5" aria-label="Kühlschranktür">
          {!list ? (
            <div className="h-40 animate-pulse" />
          ) : demo ? (
            <>
              <span className="absolute right-6 top-2 z-10 rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-muted">Beispiel</span>
              <Wand
                items={[
                  { kind: "pin", id: demo.pins[0].id, at: demo.pins[0].erstellt, pinned: false, pin: demo.pins[0] },
                  { kind: "memo", id: demo.memos[0].id, at: demo.memos[0].erstellt, memo: demo.memos[0] },
                  { kind: "pin", id: demo.pins[1].id, at: demo.pins[1].erstellt, pinned: false, pin: demo.pins[1] },
                ]}
                render={(item) => <Zettel item={item} me={me} household={board.household} demo onOpen={() => setWriting({ quote: null, art: "zettel" })} />}
              />
            </>
          ) : list.length === 0 || bereiche.alle.length === 0 ? (
            <div className={`flex flex-col items-center justify-center gap-3 px-4 text-center ${list.length === 0 ? "py-10" : "py-5"}`}>
              <p className="text-[16px] font-semibold text-muted">{PINNWAND_TIPP}</p>
              <button type="button" onClick={() => setWriting({ quote: null, art: "zettel" })} className={buttonClass("soft", "sm")}>
                Erster Zettel
              </button>
            </div>
          ) : (
            <Wand items={bereiche.alle} render={renderZettel} ordnen={{ onHold: setArrange, onDrop: drop(bereiche.alle) }} label={allein ? "Zettel" : "Zettel für alle"} />
          )}
          {list && !demo && bereiche.privat.length > 0 && (
            <div className="mt-4" data-privat-ecke>
              {/* Gestrichelte Linie links und rechts, in der Mitte die Beschriftung – antippen klappt zu bzw. auf */}
              <button type="button" aria-expanded={!privatZu} onClick={() => setPrivatZu(!privatZu)} className="flex min-h-11 w-full items-center gap-2 text-[13px] font-bold text-fridge-soft" data-privat-linie>
                <span className="wand-privat-linie h-0 flex-1" aria-hidden />
                <span className="flex shrink-0 items-center gap-1.5">
                  {privatZu ? (
                    <>
                      {NUR_FUER_MICH}
                      <ChevronDown className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                      {NUR_FUER_MICH_ZEILE}
                      <ChevronUp className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                    </>
                  )}
                </span>
                <span className="wand-privat-linie h-0 flex-1" aria-hidden />
              </button>
              {!privatZu && (
                <div className="wand-privat-auf">
                  <Wand items={bereiche.privat} render={renderZettel} ordnen={{ onHold: setArrange, onDrop: drop(bereiche.privat) }} label={NUR_FUER_MICH} />
                </div>
              )}
            </div>
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
            <Wand items={board.archived} render={(item) => <Zettel item={item} me={me} household={board.household} onOpen={() => setHeld({ id: item.id, archived: true })} />} label="Ältere Zettel" />
          </div>
        </Sheet>
      )}
      {heldItem && held && (
        <ReactionMenu item={heldItem} me={me} household={board.household} archived={held.archived} onReply={() => reply(heldItem)} onArrange={held.archived ? undefined : () => setArrange(heldItem.id)} onClose={() => setHeld(null)}>
          <Zettel item={heldItem} me={me} household={board.household} onOpen={() => setHeld(null)} />
        </ReactionMenu>
      )}
      {arrangeItem && <ZettelFenster item={arrangeItem} all={list ?? []} me={me} onClose={() => setArrange(null)} />}
      {fotoItem && fotoItem.kind === "pin" && <FotoFenster item={fotoItem} me={me} onMore={() => (setFoto(null), setHeld({ id: fotoItem.id, archived: false }))} onClose={() => setFoto(null)} />}
      {writing && <NeuerZettel me={me} household={board.household} karo={karo} quote={writing.quote} art={writing.art} onClose={() => setWriting(null)} />}
    </>
  );
}
