// Übersetzer zwischen den Speichern auf dem Gerät und der gemeinsamen Tabelle
// `entries` (Etappe 3b). Jeder geteilte Speicher wird in einzelne Einträge
// („Dokumente“) zerlegt und wieder zusammengesetzt – verlustfrei:
// fromDocs(toDocs(v), v) ergibt wieder v. Was nur das Gerät betrifft
// (gesehene Erinnerungen, Einstellungen, Memos ohne geteilten Ton) bleibt.
// Rein: keine Speicherzugriffe, nur Werte rein, Werte raus.

import type { StorageKey } from "@/lib/core/storage";

/** Ein Eintrag, wie er in der Tabelle liegt (ohne Haushalt) */
export type CloudDoc = {
  id: string;
  typ: string;
  raum: "familie" | "arbeit";
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
};

const isObj = (v: unknown): v is Value => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const list = (v: unknown): Value[] => (Array.isArray(v) ? v.filter(isObj) : []);
const room = (v: unknown): "familie" | "arbeit" => (v === "arbeit" ? "arbeit" : "familie");
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

const kalender = entryAdapter("kalender", "wasgibts.eintraege", 2, "entries", ["termin", "aufgabe"], (v) => ({
  version: 2,
  migratedTermine: v?.migratedTermine === true,
  seenReminders: Array.isArray(v?.seenReminders) ? v.seenReminders : [],
}));

const notizen = entryAdapter("notizen", "wasgibts.notizen", 1, "notes", ["notiz"], () => ({ version: 1 }));

// Pinnwand: Nachrichten und Sprachnachrichten (Etappe 3c). Ein Memo wird erst
// geteilt, wenn sein Ton in Supabase Storage liegt (`storagePath`) – bis dahin
// bleibt es nur auf dem Gerät (und beim Einspielen erhalten).
const isShared = (m: Value) => isObj(m.data) && typeof m.data.storagePath === "string" && m.data.storagePath !== "";
const nachrichten = entryAdapter("pinnwand", "wasgibts.pinnwand", 3, "messages", ["pinnwand"], () => ({}));
const memos = entryAdapter("pinnwand", "wasgibts.pinnwand", 3, "memos", ["memo"], () => ({}));
const pinnwand: Adapter = {
  name: "pinnwand",
  key: "wasgibts.pinnwand",
  version: 3,
  typs: ["pinnwand", "memo"],
  toDocs: (value) => [...nachrichten.toDocs(value), ...memos.toDocs({ memos: list(value.memos).filter(isShared) })],
  fromDocs: (docs, value) => {
    const onlyHere = list(value?.memos).filter((m) => !isShared(m) && !docs.some((d) => d.id === m.id));
    const shared = memos.fromDocs(docs.filter((d) => d.typ === "memo"), null).memos as Value[];
    return { version: 3, messages: nachrichten.fromDocs(docs.filter((d) => d.typ === "pinnwand"), null).messages, memos: [...onlyHere, ...shared] };
  },
};

const vorrat: Adapter = {
  name: "vorrat",
  key: "wasgibts.vorrat",
  version: 2,
  typs: ["vorrat"],
  toDocs: (value) => list(value.items).filter((i) => typeof i.id === "string").map((i) => ({ id: `vr:${i.id as string}`, typ: "vorrat", raum: "familie", besitzer: null, data: i })),
  fromDocs: (docs) => ({ version: 2, items: docs.map((d) => d.data).filter(isObj) }),
};

// Einkaufsliste: jede eigene Zeile einzeln (gleichzeitig abhaken geht gut),
// je Woche der Rest (abgehakte Rezept-Zutaten, „haben wir“ …), dazu einmal
// die Einstellungen (Produkte, Läden, Stammliste).
const WEEK_FIELDS = ["checked", "have", "renamed", "skippedStaples"] as const;
const SETTINGS = "ek:einstellungen";

const einkauf: Adapter = {
  name: "einkauf",
  key: "wasgibts.einkaufsliste",
  version: 4,
  typs: ["einkauf", "einkauf-woche", "einkauf-einstellungen"],
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
    docs.push({ id: SETTINGS, typ: "einkauf-einstellungen", raum: "familie", besitzer: null, data: { products: value.products ?? {}, shops: value.shops ?? [], itemShops: value.itemShops ?? {}, staples: value.staples ?? [] } });
    return docs;
  },
  fromDocs: (docs, value) => {
    const weeks: Record<string, Value> = {};
    const week = (w: string) => (weeks[w] ??= { manual: [], checked: [], have: [] });
    let settings: Value = { products: value?.products ?? {}, shops: value?.shops ?? [], itemShops: value?.itemShops ?? {}, staples: value?.staples ?? [] };
    for (const d of docs) {
      const data = isObj(d.data) ? d.data : {};
      if (d.typ === "einkauf-einstellungen") settings = { ...settings, ...data };
      else if (typeof data.week !== "string") continue;
      else if (d.typ === "einkauf-woche") {
        const { week: w, ...rest } = data;
        Object.assign(week(w as string), rest);
      } else if (d.typ === "einkauf" && isObj(data.item)) (week(data.week).manual as Value[]).push(d.besitzer ? { ...data.item, von: d.besitzer } : data.item);
    }
    return { version: 4, weeks, ...settings };
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
  ["vorrat", "Sache im Vorrat", "Sachen im Vorrat"],
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
