// Die Kühlschranktür (Tafel 106/107) – Regeln für Zettel und
// Sprachnachrichten gleichermaßen:
// - Nichts verschwindet ungefragt. Erledigt = 24 Std. blass und
//   durchgestrichen an der Tür, dann ins Archiv „Ältere“. Sonst nach 7 Tagen
//   leise ins Archiv. Angeheftete bleiben dauerhaft oben links (bis Erledigt).
//   Gelöscht wird nur von Hand.
// - Farbe = Person: fünf Pastell-Töne (Tokens `--app-zettel-<n>`), je
//   Mitglied fest (Reihenfolge im Haushalt, sonst aus dem Namen); beim
//   Schreiben wählbar, dann am Zettel gespeichert.
// - Jeder Zettel hängt fest leicht schief (−3° bis +3°, aus der ID) an
//   einem Magneten je Papier: Punkt (Zettel), Stern (Karoblatt), Apfel
//   (Polaroid), Herz (Kassenbon); Angeheftetes am roten Pin.
// - Kachel „Fächer“: die neuesten nicht erledigten, Angeheftetes nur zum
//   Auffüllen. Rein.

export const ZETTEL_FARBEN = 5;
export type ZettelFarbe = 0 | 1 | 2 | 3 | 4;
/** Namen der Töne (für VoiceOver und Tests) */
export const FARB_NAMEN = ["Gelb", "Rosa", "Grün", "Blau", "Lila"] as const;

export type Done = { von: string; am: string };

/** So lange bleibt Erledigtes blass an der Tür */
export const ERLEDIGT_MS = 24 * 3_600_000;
/** So lange hängt ein Zettel, bevor er leise ins Archiv geht */
export const ARCHIV_MS = 7 * 86_400_000;

/** Was alle Einträge an der Tür gemeinsam haben (Zettel und Sprachnachrichten) */
export type DoorEntry = { id: string; erstellt: string; data: { author: string; pinned?: boolean; erledigt: Done | null; archiv: string | null; farbe: ZettelFarbe | null } };

export const readFarbe = (v: unknown): ZettelFarbe | null => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < ZETTEL_FARBEN ? (v as ZettelFarbe) : null);

export function readDone(v: unknown): Done | null {
  const d = v as Partial<Done> | null;
  return d && typeof d === "object" && typeof d.von === "string" && typeof d.am === "string" ? { von: d.von, am: d.am } : null;
}

const ms = (iso: string) => Date.parse(iso) || 0;

/** Im Archiv: von Hand hineingelegt, seit 24 Std. erledigt oder (nicht angeheftet) 7 Tage alt */
export function isArchived(e: DoorEntry, nowMs: number): boolean {
  if (e.data.archiv) return true;
  if (e.data.erledigt) return nowMs - ms(e.data.erledigt.am) >= ERLEDIGT_MS;
  return !e.data.pinned && nowMs - ms(e.erstellt) >= ARCHIV_MS;
}

export const onDoor = (e: DoorEntry, nowMs: number) => !isArchived(e, nowMs);

/** Erledigt an/aus (zurücknehmen geht, solange er an der Tür hängt) */
export const doneValue = (e: DoorEntry, me: string, stamp: string): Done | null => (e.data.erledigt ? null : { von: me, am: stamp });

/** „erledigt von Lisa“ bzw. „erledigt von dir“ */
export const doneLine = (d: Done, me: string) => `erledigt von ${d.von === me ? "dir" : d.von}`;

const hash = (s: string) => {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};

/** Farbe einer Person: Reihenfolge im Haushalt (Person 1 = Gelb …), sonst aus dem Namen */
export function personFarbe(name: string, household: string[] = []): ZettelFarbe {
  const i = household.findIndex((p) => p.trim().toLowerCase() === name.trim().toLowerCase());
  return ((i >= 0 ? i : hash(name.trim().toLowerCase())) % ZETTEL_FARBEN) as ZettelFarbe;
}

/** Farbe eines Eintrags: gewählt, sonst die der Person */
export const farbeOf = (e: DoorEntry, household: string[]) => e.data.farbe ?? personFarbe(e.data.author, household);

/** Fest je Zettel: −3° bis +3° (eine Nachkommastelle), nie bei jedem Laden neu */
export const tiltOf = (id: string) => Math.round(((hash(id) % 61) / 10 - 3) * 10) / 10;

export type MagnetForm = "punkt" | "stern" | "apfel" | "herz" | "pin";

/** Magnet je Papier; Angeheftetes hängt am roten Pin */
export function magnetOf(papier: "zettel" | "karo" | "foto" | "memo", pinned = false): MagnetForm {
  if (pinned) return "pin";
  return papier === "karo" ? "stern" : papier === "foto" ? "apfel" : papier === "memo" ? "herz" : "punkt";
}

/** Fächer je Größe: S und M drei, L bis sechs */
export const FAECHER = { S: 3, M: 3, L: 6 } as const;

/** Winkel im Fächer (hinten → vorn); L als Raster mit kleinen Winkeln */
export const FAECHER_WINKEL = [-10, -2, 7] as const;

/**
 * Kachel: die neuesten nicht erledigten Einträge an der Tür (neueste zuerst);
 * Angeheftete zählen nur mit, wenn weniger als `count` neue da sind.
 */
export function faecherOf<T extends DoorEntry>(items: T[], nowMs: number, count: number): T[] {
  const live = items.filter((e) => onDoor(e, nowMs) && !e.data.erledigt).sort((a, b) => b.erstellt.localeCompare(a.erstellt));
  const fresh = live.filter((e) => !e.data.pinned);
  const pinned = live.filter((e) => e.data.pinned);
  return [...fresh, ...pinned].slice(0, count);
}

/** Zwei Spalten (Masonry): der Reihe nach immer in die kürzere Spalte – das Erste oben links */
export function twoColumns<T>(items: T[], heightOf: (item: T) => number): [T[], T[]] {
  const cols: [T[], T[]] = [[], []];
  const h = [0, 0];
  for (const item of items) {
    const c = h[1] < h[0] ? 1 : 0;
    cols[c].push(item);
    h[c] += heightOf(item);
  }
  return cols;
}

/** Geschätzte Höhe für die Spalten (Text-Länge und Zeilen; Foto und Kassenbon fest) */
export function guessHeight(kind: "zettel" | "karo" | "foto" | "memo", text = ""): number {
  if (kind === "memo") return 120;
  if (kind === "foto") return 190 + (text ? 24 : 0);
  const lines = text.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 16)), 0);
  return 70 + lines * 22;
}

/**
 * Sieht der Zettel nach Notiz aus? Liste mit 3+ Zeilen, Passwort/PIN/WLAN,
 * Telefonnummer oder Adresse – dann fragt Mia EINMAL, ob er zu den Notizen soll.
 */
export function looksLikeNote(text: string): boolean {
  const t = text.trim();
  if (t.split("\n").filter((l) => l.trim()).length >= 3) return true;
  if (/(?<![a-zäöüß])(passwort|kennwort|pw|pin|wlan|wifi|wi-fi|zugangsdaten)(?![a-zäöüß])/i.test(t)) return true;
  if (/(?:\+49|0)[\d /-]{7,}\d/.test(t)) return true;
  return /(?<![a-zäöüß])[a-zäöüß-]+(straße|str\.|weg|allee|platz|gasse|ring|damm)\s*\d{1,4}\s*[a-z]?(?![a-zäöüß])/i.test(t) || /\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+/.test(t);
}

/** CSS-Farben eines Zettels (Tokens): Papier und Magnet; "mia" = Orange (nur im Beispiel) */
export const zettelTon = (f: ZettelFarbe | "mia") => ({ bg: `var(--app-zettel-${f})`, mag: `var(--app-zettel-${f}-mag)` });

/** Karoblatt für Kinder-Profile (Rolle „kind“ im Profil), sonst Haftnotiz */
export const papierFor = (name: string, persons: { name: string; role: string }[] = []): "zettel" | "karo" =>
  persons.some((p) => p.role === "kind" && p.name.trim().toLowerCase() === name.trim().toLowerCase()) ? "karo" : "zettel";
