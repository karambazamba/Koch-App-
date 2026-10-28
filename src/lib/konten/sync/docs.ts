// Übersetzer zwischen den Speichern auf dem Gerät und der gemeinsamen Tabelle
// `entries` (Etappe 3b). Jeder geteilte Speicher wird in einzelne Einträge
// („Dokumente“) zerlegt und wieder zusammengesetzt – verlustfrei:
// fromDocs(toDocs(v), v) ergibt wieder v. Was nur das Gerät betrifft
// (gesehene Erinnerungen, Einstellungen, Memos ohne geteilten Ton) bleibt.
// Rein: keine Speicherzugriffe, nur Werte rein, Werte raus.

import type { StorageKey } from "@/lib/core/storage";
import { cleanPantryItem, migratePantry } from "@/lib/vorrat/haltbar";
import { migrateNotes } from "@/lib/notizen/model";
import { migratePinStore } from "@/lib/pinnwand/migration";
import { aufgabeIch, ohnePrivat, ohneZeitraum, type CalendarEntry } from "@/lib/kalender/model";
import { todayIso } from "@/lib/core/now";
import { migrateStore } from "@/lib/einkauf/listMigration";

import { roomOf, type Room } from "@/lib/core/entries";

/** Ein Eintrag, wie er in der Tabelle liegt (ohne Haushalt) */
export type CloudDoc = {
  id: string;
  typ: string;
  raum: Room;
  /** Konto-ID; null = noch nie hochgeladen (dann das eigene Konto) */
  besitzer: string | null;
  erstellt: string;
  geaendert: string;
  geloescht: boolean;
  data: unknown;
  /** Fortlaufende Nummer des Servers (nur beim Herunterladen) */
  rev?: number;
};

/** Teil eines Speichers, bevor er Zeitstempel bekommt */
export type LocalDoc = Pick<CloudDoc, "id" | "typ" | "raum" | "besitzer" | "data"> & { erstellt?: string };

type Value = Record<string, unknown>;

export type Adapter = {
  /** Kurzname für den Abgleich-Speicher */
  name: "kalender" | "notizen" | "pinnwand" | "einkauf" | "wochenplan" | "vorrat" | "spendentopf" | "unterwegs";
  key: StorageKey;
  /** Speicher-Version, die der Übersetzer kennt (andere: auslassen, bis migriert) */
  version: number;
  typs: string[];
  toDocs(value: Value): LocalDoc[];
  fromDocs(docs: LocalDoc[], value: Value | null): Value;
  /** Älteren Stand auf `version` heben (sonst wird er ausgelassen, bis die App ihn migriert) */
  upgrade?: (value: Value) => Value | null;
};

const isObj = (v: unknown): v is Value => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const list = (v: unknown): Value[] => (Array.isArray(v) ? v.filter(isObj) : []);
// „ich“ und „arbeit“ sieht nur der Besitzer – nie als Familie hochladen
const room = roomOf;
const ownerOf = (v: unknown): string | null => (typeof v === "string" && v !== "lokal" ? v : null);

/** Speicher, deren Einträge schon das einheitliche Modell haben (id, typ, raum, besitzer …) */
function entryAdapter(name: Adapter["name"], key: StorageKey, version: number, field: string, typs: string[], keep: (value: Value | null) => Value): Adapter {
  return {
    name,
    key,
    version,
    typs,
    toDocs: (value) =>
      list(value[field])
        .filter((e) => typeof e.id === "string" && typs.includes(e.typ as string))
        .map((e) => ({ id: e.id as string, typ: e.typ as string, raum: room(e.raum), besitzer: ownerOf(e.besitzer), erstellt: typeof e.erstellt === "string" ? e.erstellt : undefined, data: e })),
    fromDocs: (docs, value) => ({
      ...keep(value),
      [field]: docs.map((d) => ({ ...(isObj(d.data) ? d.data : {}), id: d.id, typ: d.typ, raum: d.raum, besitzer: d.besitzer ?? (isObj(d.data) ? d.data.besitzer : undefined) ?? "lokal" })),
    }),
  };
}

// v2 → v3: „Diese Woche“ still auf heute bzw. den genannten Tag; v3 → v4:
// Etikett „Privat“ → Raum Ich; v4 → v5: bestehende Aufgaben → „Ich“ (A-034,
// kalender/store.ts)
const kalenderHeben = (e: CalendarEntry, von: number): CalendarEntry => {
  const v3 = von === 2 ? ohneZeitraum(e, todayIso()) : e;
  return aufgabeIch(ohnePrivat(v3));
};
const kalender = {
  ...entryAdapter("kalender", "wasgibts.eintraege", 5, "entries", ["termin", "aufgabe"], (v) => ({
    version: 5,
    migratedTermine: v?.migratedTermine === true,
    seenReminders: Array.isArray(v?.seenReminders) ? v.seenReminders : [],
  })),
  upgrade: (v: Value): Value | null =>
    v.version === 2 || v.version === 3 || v.version === 4
      ? { ...v, version: 5, entries: list(v.entries).map((e) => kalenderHeben(e as unknown as CalendarEntry, v.version as number) as unknown as Value) }
      : null,
};

// v1 → v2: die alte Sammel-Schnellnotiz kommt als einzelne Notizen an
const notizen = { ...entryAdapter("notizen", "wasgibts.notizen", 2, "notes", ["notiz"], () => ({ version: 2 })), upgrade: (v: Value) => migrateNotes(v) as Value | null };

// Pinnwand: Zettel und Sprachnachrichten (Etappe 3c, Kühlschranktür v4). Ein
// Memo wird erst geteilt, wenn sein Ton in Supabase Storage liegt
// (`storagePath`), ein Foto-Zettel erst mit Bild im Haushalt (`foto.path`) –
// bis dahin bleiben sie nur auf dem Gerät (und beim Einspielen erhalten).
// v3 → v4 → v5 hebt `migratePinStore` (Farbe = Person; Größe, Platz, „Nur für
// mich“ – nichts geht verloren). „Nur für mich“ (`privat`) geht mit in den
// Haushalt, dort sieht ihn nur der Besitzer (RLS wie „Arbeit“, Migration
// 20261101130000); Bilder privater Zettel lädt die App nicht hoch (`foto.ts`),
// sie bleiben also auf dem Gerät.
const isShared = (m: Value) => isObj(m.data) && typeof m.data.storagePath === "string" && m.data.storagePath !== "";
const pinShared = (m: Value) => !isObj(m.data) || !isObj(m.data.foto) || (typeof m.data.foto.path === "string" && m.data.foto.path !== "");
const nachrichten = entryAdapter("pinnwand", "wasgibts.pinnwand", 5, "messages", ["pinnwand"], () => ({}));
const memos = entryAdapter("pinnwand", "wasgibts.pinnwand", 5, "memos", ["memo"], () => ({}));
const pinnwand: Adapter = {
  name: "pinnwand",
  key: "wasgibts.pinnwand",
  version: 5,
  typs: ["pinnwand", "memo"],
  upgrade: (value) => (value.version === 5 ? null : (migratePinStore(value) as unknown as Value | null)),
  toDocs: (value) => [...nachrichten.toDocs({ messages: list(value.messages).filter(pinShared) }), ...memos.toDocs({ memos: list(value.memos).filter(isShared) })],
  fromDocs: (docs, value) => {
    const memosHere = list(value?.memos).filter((m) => !isShared(m) && !docs.some((d) => d.id === m.id));
    const pinsHere = list(value?.messages).filter((m) => !pinShared(m) && !docs.some((d) => d.id === m.id));
    const shared = memos.fromDocs(docs.filter((d) => d.typ === "memo"), null).memos as Value[];
    const sharedPins = nachrichten.fromDocs(docs.filter((d) => d.typ === "pinnwand"), null).messages as Value[];
    return { version: 5, messages: [...pinsHere, ...sharedPins], memos: [...memosHere, ...shared] };
  },
};

// Im Haus (v4, ohne Mengen, Gruppen seit Tafel 102): je Sache ein Eintrag,
// dazu einmal die gemerkten Orte je Sorte. Ältere Geräte schicken noch Mengen
// bzw. Obst/Brot im Kühlschrank – beides räumt `migratePantry` beim Lesen auf
// (selbst gewählte Orte bleiben).
const VR_ORTE = "vr:orte";
const vorrat: Adapter = {
  name: "vorrat",
  key: "wasgibts.vorrat",
  version: 4,
  typs: ["vorrat", "vorrat-orte"],
  upgrade: (value) => migratePantry(value),
  toDocs: (value) => [
    ...list(value.items)
      .filter((i) => typeof i.id === "string")
      .map((i): LocalDoc => ({ id: `vr:${i.id as string}`, typ: "vorrat", raum: "familie", besitzer: null, data: i })),
    ...(isObj(value.places) && Object.keys(value.places).length ? [{ id: VR_ORTE, typ: "vorrat-orte", raum: "familie" as const, besitzer: null, data: value.places }] : []),
  ],
  fromDocs: (docs) => {
    const places = docs.find((d) => d.typ === "vorrat-orte");
    return migratePantry({
      version: 3,
      items: docs.filter((d) => d.typ === "vorrat").map((d) => cleanPantryItem(d.data)).filter(Boolean),
      places: places && isObj(places.data) ? places.data : {},
    }) as Value;
  },
};

// Einkaufsliste: jede eigene Zeile einzeln (gleichzeitig abhaken geht gut),
// je Woche der Rest (abgehakte Rezept-Zutaten, „haben wir“ …), dazu einmal
// die Einstellungen (Produkte, Läden, Stammliste).
const WEEK_FIELDS = ["checked", "have", "renamed", "skippedStaples", "fertig"] as const;
const SETTINGS = "ek:einstellungen";

/** Läden der Familie (v5/v6): Meine Läden, feste Regeln, Gelerntes, Ausnahmen */
const shopSettings = (value: Value | null) => ({
  myShops: value?.myShops ?? [],
  shopsAsked: value?.shopsAsked === true,
  shopRules: value?.shopRules ?? {},
  learned: value?.learned ?? {},
  learnAsked: value?.learnAsked ?? [],
  alwaysList: value?.alwaysList ?? [],
  angebotAb: typeof value?.angebotAb === "string" ? value.angebotAb : "",
});

const einkauf: Adapter = {
  name: "einkauf",
  key: "wasgibts.einkaufsliste",
  version: 8,
  typs: ["einkauf", "einkauf-woche", "einkauf-einstellungen"],
  // v4–v7 (noch nicht neu gespeichert): wie beim Laden der App (`migrateStore`: „Meine Läden“,
  // feste Regeln, v6 → v7 Doppeltes zusammen – der weggefallene Eintrag wird als gelöscht markiert;
  // v7 → v8 Gelerntes mit Datum, Wochenplan als Angebot)
  upgrade: (value) => (value.version === 8 ? null : (migrateStore(value) as unknown as Value | null)),
  toDocs: (value) => {
    const docs: LocalDoc[] = [];
    const weeks = isObj(value.weeks) ? value.weeks : {};
    for (const [week, raw] of Object.entries(weeks)) {
      if (!isObj(raw)) continue;
      for (const item of list(raw.manual)) {
        // „von“ = Besitzer des Eintrags (setzt der Server) – nicht in den Daten hochladen
        const { von: _von, ...own } = item;
        void _von;
        if (typeof item.id === "string") docs.push({ id: `ek:${week}:${item.id}`, typ: "einkauf", raum: "familie", besitzer: ownerOf(item.von), data: { week, item: own } });
      }
      const rest: Value = {};
      for (const f of WEEK_FIELDS) if (raw[f] !== undefined) rest[f] = raw[f];
      if (Object.keys(rest).length) docs.push({ id: `ekw:${week}`, typ: "einkauf-woche", raum: "familie", besitzer: null, data: { week, ...rest } });
    }
    docs.push({ id: SETTINGS, typ: "einkauf-einstellungen", raum: "familie", besitzer: null, data: { products: value.products ?? {}, shops: value.shops ?? [], itemShops: value.itemShops ?? {}, staples: value.staples ?? [], ...shopSettings(value) } });
    return docs;
  },
  fromDocs: (docs, value) => {
    const weeks: Record<string, Value> = {};
    const week = (w: string) => (weeks[w] ??= { manual: [], checked: [], have: [] });
    let settings: Value = { products: value?.products ?? {}, shops: value?.shops ?? [], itemShops: value?.itemShops ?? {}, staples: value?.staples ?? [], ...shopSettings(value) };
    for (const d of docs) {
      const data = isObj(d.data) ? d.data : {};
      if (d.typ === "einkauf-einstellungen") settings = { ...settings, ...data };
      else if (typeof data.week !== "string") continue;
      else if (d.typ === "einkauf-woche") {
        const { week: w, ...rest } = data;
        Object.assign(week(w as string), rest);
      } else if (d.typ === "einkauf" && isObj(data.item)) (week(data.week).manual as Value[]).push(d.besitzer ? { ...data.item, von: d.besitzer } : data.item);
    }
    return { version: 8, weeks, ...settings };
  },
};

// Wochenplan: je Tag (und Tages-Notiz) ein Eintrag
const wochenplan: Adapter = {
  name: "wochenplan",
  key: "wasgibts.wochenplan",
  version: 3,
  typs: ["wochenplan"],
  toDocs: (value) => {
    const docs: LocalDoc[] = [];
    const weeks = isObj(value.weeks) ? value.weeks : {};
    for (const [week, days] of Object.entries(weeks)) {
      if (!isObj(days)) continue;
      for (const [slot, entry] of Object.entries(days)) docs.push({ id: `wp:${week}:${slot}`, typ: "wochenplan", raum: "familie", besitzer: null, data: { week, slot, entry } });
    }
    return docs;
  },
  fromDocs: (docs) => {
    const weeks: Record<string, Value> = {};
    for (const d of docs) {
      const data = isObj(d.data) ? d.data : {};
      if (typeof data.week !== "string" || typeof data.slot !== "string" || !isObj(data.entry)) continue;
      (weeks[data.week] ??= {})[data.slot] = data.entry;
    }
    return { version: 3, weeks };
  },
};

// Spendentopf (Etappe 3d): Region, Stimme je Jahr und Beitrag gelten für den
// ganzen Haushalt (eine Stimme pro Familie); Frage-Zeitpunkte und
// weggetippte Karten bleiben auf dem Gerät.
const POT_SHARED = ["region", "support", "interest", "votes", "pledge"] as const;
const POT_DEVICE = ["ask", "voteCardHidden", "liveAsked"] as const;
const spendentopf: Adapter = {
  name: "spendentopf",
  key: "wasgibts.spendentopf",
  version: 2,
  typs: ["spendentopf"],
  toDocs: (value) => [{ id: "pot:haushalt", typ: "spendentopf", raum: "familie", besitzer: null, data: Object.fromEntries(POT_SHARED.map((k) => [k, value[k] ?? null])) }],
  fromDocs: (docs, value) => {
    const shared = docs.find((d) => d.typ === "spendentopf");
    const data = shared && isObj(shared.data) ? shared.data : {};
    const device = Object.fromEntries(POT_DEVICE.filter((k) => value?.[k] !== undefined).map((k) => [k, value?.[k]]));
    return { version: 2, ...Object.fromEntries(POT_SHARED.map((k) => [k, data[k] ?? value?.[k] ?? (k === "interest" ? [] : k === "votes" ? {} : null)])), ...device };
  },
};

// Einkauf unterwegs (Einkauf Teil 6): je Einkauf ein Eintrag; „von“ setzt der
// Server (Besitzer), der Server schickt daraus die Mitteilungen.
const unterwegs: Adapter = {
  name: "unterwegs",
  key: "wasgibts.einkaufswege",
  version: 1,
  typs: ["unterwegs"],
  toDocs: (value) =>
    list(value.trips)
      .filter((t) => typeof t.id === "string")
      .map((t) => {
        const { von: _von, ...own } = t;
        void _von;
        return { id: `uw:${t.id as string}`, typ: "unterwegs", raum: "familie", besitzer: ownerOf(t.von), erstellt: typeof t.start === "string" ? t.start : undefined, data: own };
      }),
  fromDocs: (docs) => ({ version: 1, trips: docs.filter((d) => isObj(d.data)).map((d) => (d.besitzer ? { ...(d.data as Value), von: d.besitzer } : d.data)) }),
};

/** Alles, was geteilt wird (Einstellungen und Startseite bleiben pro Gerät) */
export const ADAPTERS: Adapter[] = [kalender, notizen, pinnwand, einkauf, wochenplan, vorrat, spendentopf, unterwegs];

export const adapterFor = (typ: string): Adapter | undefined => ADAPTERS.find((a) => a.typs.includes(typ));

/** JSON mit sortierten Schlüsseln (die Datenbank ordnet sie um) */
export function stableJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(",")}]`;
  if (isObj(v))
    return `{${Object.keys(v)
      .filter((k) => v[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson(v[k])}`)
      .join(",")}}`;
  return JSON.stringify(v) ?? "null";
}

/** Kurzer Fingerabdruck eines Eintrags (zum Erkennen von Änderungen) */
export function docHash(d: Pick<LocalDoc, "typ" | "raum" | "data">): string {
  const s = stableJson([d.typ, d.raum, d.data]);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519);
  }
  return `${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}${s.length.toString(36)}`;
}

// --- Vorschau der Übernahme ------------------------------------------------------

const LABELS: [string, string, string][] = [
  ["termin", "Termin", "Termine"],
  ["aufgabe", "Aufgabe", "Aufgaben"],
  ["notiz", "Notiz", "Notizen"],
  ["pinnwand", "Nachricht", "Nachrichten"],
  ["einkauf", "Sache auf der Einkaufsliste", "Sachen auf der Einkaufsliste"],
  ["wochenplan", "Tag im Wochenplan", "Tage im Wochenplan"],
  ["vorrat", "Sache im Haus", "Sachen im Haus"],
];

/** Zählt, was mitgenommen würde (Einstellungen der Liste zählen nicht) */
export function countDocs(docs: Pick<LocalDoc, "typ">[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const d of docs) if (LABELS.some(([t]) => t === d.typ)) counts[d.typ] = (counts[d.typ] ?? 0) + 1;
  return counts;
}

/** „3 Termine, 5 Aufgaben und 2 Notizen werden mitgenommen.“ – leer, wenn nichts da ist */
export function takeoverSummary(counts: Record<string, number>): string {
  const found = LABELS.filter(([t]) => counts[t]);
  const parts = found.map(([t, one, many]) => `${counts[t]} ${counts[t] === 1 ? one : many}`);
  if (!parts.length) return "";
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} und ${parts[parts.length - 1]}`;
  const many = parts.length > 1 || counts[found[0][0]] > 1;
  return `${list} ${many ? "werden" : "wird"} mitgenommen.`;
}
