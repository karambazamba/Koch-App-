"use client";

// Einkauf wie Bring (Tafel 35): „Mehr hinzufügen“ – Suche (tippen oder
// sprechen, mehrere mit Komma), „Oft gekauft“ zuerst, dann alles nach
// Abteilung. Antippen wählt aus bzw. ab; „Fertig“ übernimmt alles auf einmal.
// Mit „Meine Läden“: „Kommt auf die Liste für“ (gemerkter Laden → offener
// Reiter → „Egal wo“); Vorschläge zeigen ihren gemerkten Laden leise.

import { rezeptLinkIn } from "@/lib/essen/rezeptLink/lesen";
import { openHelper } from "@/lib/begleitung/open";
import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Search, Square } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { INPUT_BASE, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { MIC_BLOCKED, MicStrip } from "@/components/ui/MicPermission";
import { ItemTile, TILE_GRID } from "@/components/einkauf/kacheln/ItemTile";
import { BASICS } from "@/lib/einkauf/kacheln/basics";
import { catalog } from "@/lib/einkauf/kacheln/view";
import { parseQuickAdd } from "@/lib/einkauf/quickAdd";
import { addManualItem, removeManualItems, sectionFor, setHave, setItemShop, type ListItem, type Section, type ShoppingSettings } from "@/lib/einkauf/shoppingList";
import { useSpeechInput } from "@/lib/begleitung/useSpeechInput";
import { useKeyboardInset } from "@/lib/core/useMobileKeyboard";
import { pushUndo } from "@/lib/core/undo";
import { LadenWahl } from "@/components/einkauf/MeineLaeden";
import { rememberedShop, vorwahlHinweis } from "@/lib/einkauf/meineLaeden";

const lower = (s: string) => s.trim().toLowerCase();
const sachen = (n: number) => `${n} ${n === 1 ? "Sache" : "Sachen"}`;

type Extra = { name: string; amount: string; shop: string; section: Section };

export function CatalogSheet({
  weekStart,
  settings,
  open,
  recent,
  myShops = [],
  tab,
  onClose,
}: {
  weekStart: string;
  settings: ShoppingSettings;
  /** Offene Artikel der Woche (schon auf der Liste = ausgewählt) */
  open: ListItem[];
  /** Zuletzt gekauft (für „Oft gekauft“) */
  recent: ListItem[];
  /** „Meine Läden“ (leer = keine Laden-Wahl) */
  myShops?: string[];
  /** Offener Laden-Reiter */
  tab?: string;
  onClose: () => void;
}) {
  const inset = useKeyboardInset();
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState("");
  // Auswahl als Namen (klein); Start = was schon auf der Liste steht
  const initial = useMemo(() => new Set(open.map((i) => lower(i.name))), [open]);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(initial));
  // Frei Getipptes/Gesprochenes, das es im Katalog nicht gibt
  const [extras, setExtras] = useState<Extra[]>([]);
  // Laden: von Hand gewählt geht vor, sonst der gemerkte des zuletzt gewählten Artikels, sonst der Reiter
  const [picked, setPicked] = useState<string | null>(null);
  const [lastOn, setLastOn] = useState("");
  const remembered = (name: string) => rememberedShop(name, settings.itemShops, settings.products);
  const lastShop = lastOn ? remembered(lastOn) : "";
  const shopValue = picked ?? (lastShop || tab || "");
  const shopFor = (name: string) => (picked !== null ? picked : remembered(name) || tab || "");
  const full = catalog({ staples: settings.staples, recent, open, basics: BASICS });
  const entries = catalog({ staples: settings.staples, recent, open, basics: BASICS, query });
  const known = new Set(full.map((e) => lower(e.name)));
  const added = [...chosen].filter((n) => !initial.has(n)).length;
  const removed = [...initial].filter((n) => !chosen.has(n)).length;
  const changes = added + removed;

  const toggle = (name: string) =>
    setChosen((c) => {
      const next = new Set(c);
      if (next.has(lower(name))) next.delete(lower(name));
      else {
        next.add(lower(name));
        setLastOn(name);
      }
      return next;
    });

  const submit = (text: string) => {
    if (!text.trim()) return;
    speech.reset();
    const result = parseQuickAdd(text, settings);
    const found: Extra[] = [
      ...result.items.map((i) => ({ name: i.name, amount: i.amount, shop: i.shop, section: sectionFor(i.name) })),
      ...result.unsure.map((u) => ({ name: u.suggestion ?? u.name, amount: u.amount, shop: u.shop, section: sectionFor(u.suggestion ?? u.name) })),
    ];
    if (!found.length) return setHint("Sag z. B. „Milch, Windeln und Müsli von Rossmann“.");
    setExtras((x) => [...x.filter((e) => !found.some((f) => lower(f.name) === lower(e.name))), ...found.filter((f) => !known.has(lower(f.name)) || f.amount || f.shop)]);
    setChosen((c) => new Set([...c, ...found.map((f) => lower(f.name))]));
    setQuery("");
    setHint("");
  };

  const finish = () => {
    const ids: string[] = [];
    const all = [...extras, ...full];
    const staple = (n: string) => settings.staples.find((s) => lower(s.name) === n);
    for (const n of chosen) {
      if (initial.has(n)) continue;
      const extra = extras.find((e) => lower(e.name) === n);
      const entry = all.find((e) => lower(e.name) === n);
      if (!entry) continue;
      ids.push(addManualItem(weekStart, { name: entry.name, amount: extra?.amount ?? staple(n)?.amount ?? "", section: entry.section }));
      const shop = extra?.shop || (myShops.length ? shopFor(entry.name) : "");
      if (shop !== remembered(entry.name) && (shop || picked !== null)) setItemShop(settings.products[n] ?? entry.name, shop);
    }
    // Abgewählt: Eigenes fällt weg, Zutaten aus Gerichten → „Haben wir schon“
    const manual = open.filter((i) => !chosen.has(lower(i.name)) && i.manualId).map((i) => i.manualId!);
    if (manual.length) removeManualItems(weekStart, manual);
    for (const i of open) if (!chosen.has(lower(i.name)) && !i.manualId) setHave(weekStart, i.key, true);
    // Still: kein Rückgängig beim Hinzufügen („Mach das rückgängig“ geht trotzdem)
    if (ids.length) pushUndo(`${sachen(ids.length)} auf der Liste`, () => removeManualItems(weekStart, ids));
    onClose();
  };

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const speech = useSpeechInput({
    onTranscript: (t) => setQuery(t),
    onEnd: (t) => {
      setQuery("");
      if (t && mounted.current) submit(t);
    },
  });
  const toggleMic = () => {
    if (speech.supported === false) return setHint("Spracheingabe gibt es hier nicht – tipp aufs Mikrofon deiner Tastatur und diktiere einfach.");
    if (speech.listening) speech.stop();
    else {
      setQuery("");
      speech.start();
    }
  };

  const often = entries.filter((e) => e.often);
  const rest = entries.filter((e) => !e.often);
  const shownExtras = extras.filter((e) => !query || lower(e.name).includes(lower(query)));
  const tile = (e: { name: string; section: Section }) => (
    <ItemTile
      key={lower(e.name)}
      name={e.name}
      section={e.section}
      products={settings.products}
      selected={chosen.has(lower(e.name))}
      dish={myShops.length ? remembered(e.name) : ""}
      label={e.name}
      onTap={() => toggle(e.name)}
    />
  );

  return (
    <Sheet
      title="Mehr hinzufügen"
      onClose={onClose}
      tall
      inset={inset}
    >
      <MicStrip />
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          // Ein eingefügter Rezept-Link geht an Mia (Karte mit Zutaten)
          const link = rezeptLinkIn(query);
          if (link) {
            setQuery("");
            onClose();
            openHelper(undefined, link);
            return;
          }
          submit(query);
        }}
      >
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search className="pointer-events-none absolute left-3.5 h-5 w-5 text-muted" strokeWidth={2} aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="done"
            aria-label="Suchen oder eintragen"
            placeholder={speech.listening ? speech.interim || "Ich höre zu …" : "Suchen oder sagen"}
            className={`${INPUT_BASE} h-12 w-full pl-11 pr-4`}
          />
        </label>
        <button
          type="button"
          onClick={toggleMic}
          aria-pressed={speech.listening}
          aria-label={speech.blocked ? "Mikro aus – so machst du es an" : speech.listening ? "Zuhören beenden" : "Einsprechen"}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${speech.blocked ? MIC_BLOCKED : "bg-accent text-on-accent shadow-md"} active:scale-95 ${speech.listening ? "animate-pulse ring-4 ring-accent/25" : ""}`}
        >
          {speech.blocked || speech.supported === false ? (
            <MicOff className="h-6 w-6" strokeWidth={2} aria-hidden />
          ) : speech.listening ? (
            <Square className="h-5 w-5 fill-current" strokeWidth={2} aria-hidden />
          ) : (
            <Mic className="h-6 w-6" strokeWidth={2} aria-hidden />
          )}
        </button>
      </form>
      <LadenWahl myShops={myShops} value={shopValue} onChange={setPicked} hint={picked === null && lastShop ? vorwahlHinweis(lastOn, lastShop) : undefined} />
      {hint && (
        <p className="text-sm text-muted" role="note">
          {hint}
        </p>
      )}
      {query.trim() && !entries.length && !shownExtras.length && (
        <button type="button" onClick={() => submit(query)} className={`${buttonClass("soft", "md")} self-start`}>
          „{query.trim()}“ auf die Liste
        </button>
      )}
      {shownExtras.length > 0 && <div className={TILE_GRID.normal}>{shownExtras.map(tile)}</div>}
      {often.length > 0 && (
        <section aria-label="Oft gekauft" className="flex flex-col gap-2">
          <h3 className={SECTION_TITLE}>Oft gekauft</h3>
          <div className={TILE_GRID.normal}>{often.map(tile)}</div>
        </section>
      )}
      {rest.length > 0 && (
        <section aria-label="Alles" className="flex flex-col gap-2">
          {often.length > 0 && <h3 className={SECTION_TITLE}>Alles</h3>}
          <div className={TILE_GRID.normal}>{rest.map(tile)}</div>
        </section>
      )}
      <div className="sticky bottom-0 -mx-4 mt-1 flex items-center gap-3 bg-surface px-4 py-3">
        <span className="min-w-0 flex-1 text-sm font-semibold text-muted" role="status">
          {added > 0 ? `${added} ausgewählt` : removed > 0 ? `${removed} abgewählt` : "Antippen zum Auswählen"}
        </span>
        <button type="button" onClick={finish} className={buttonClass("primary", "md")}>
          {changes ? "Fertig" : "Schließen"}
        </button>
      </div>
    </Sheet>
  );
}
