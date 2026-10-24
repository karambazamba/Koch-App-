// Server-Versand der Mitteilungen (Tafel 77, Teil 2) – die reine Planung:
// wer bekommt jetzt welche Mitteilung. Läuft jede Minute (pg_cron →
// /api/push/senden); Netz, Datenbank und Web Push kommen von außen.
// Regeln:
// - Erinnerungen: Familien-Termine erinnern jede:n im Haushalt, „Arbeit“ nur
//   den Besitzer, Aufgaben nur, wer sie gerade hat (Besitzer bzw. „fuer“).
// - Selbst gestellte Erinnerungen zählen nicht als proaktiv und dürfen auch
//   in der Ruhezeit (außer Pause und „Ruhe nach Feierabend“ für Arbeit).
// - Pinnwand und Abgeben sind proaktiv: höchstens 1 am Tag, nicht 20–7 Uhr,
//   nie in der Pause, nie für eigene Einträge.
// - Einkauf unterwegs (Einkauf Teil 6): „Felix ist gleich bei REWE“ mit
//   Schnellknöpfen und „Eingekauft ✓“ – vom Menschen ausgelöst, zählt also
//   nicht als proaktiv, aber nur 7–20 Uhr und nie in der Pause.
// - Nie doppelt (Schlüssel je Abo, `push_gesendet`).

import { pushAllowed } from "@/lib/heute/push";
import { DEFAULT_ROUTINE, type DayRoutine } from "@/lib/heute/tagesablauf";
import { dueNow, pauseOn, type ReminderMoment } from "@/lib/heute/mitteilungen/erinnerungen";
import type { CalendarEntry } from "@/lib/kalender/model";
import type { NotifyKind } from "@/lib/heute/mitteilungen/einstellungen";
import { helperName } from "@/lib/einstellungen/profile";
import { endText, startText } from "@/lib/einkauf/unterwegs/unterwegs";

/** Eine Zeile aus `entries` (so wie der Server sie liest) */
export type PushEntryRow = { household_id: string; id: string; typ: string; raum: string; besitzer: string; erstellt: string; geaendert: string; data: unknown };

/** Einstellungen eines Geräts, die es mit dem Abo schickt */
export type AboSettings = {
  kinds?: Partial<Record<NotifyKind, boolean>>;
  pause?: { from: string; until: string | null } | null;
  routine?: Partial<DayRoutine>;
  /** Name, unter dem Mia schreibt (Absender) */
  name?: string;
};

export type PushAbo = { id: string; user_id: string; household_id: string | null; settings: AboSettings };

/** Schnellknopf in der Mitteilung („plus:Butter“, „nichts“) */
type PushAction = { action: string; title: string };

export type PushMessage = { aboId: string; key: string; payload: { title: string; body: string; href: string; tag: string; actions?: PushAction[] } };

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const kindOn = (s: AboSettings, k: NotifyKind) => s.kinds?.[k] ?? k !== "morgen";

/** Termine und Aufgaben, die diese Person sieht (wie in der App) */
function visibleEntries(rows: PushEntryRow[], userId: string): CalendarEntry[] {
  const out: CalendarEntry[] = [];
  for (const r of rows) {
    if (r.typ !== "termin" && r.typ !== "aufgabe") continue;
    const e = isObj(r.data) ? r.data : {};
    const data = isObj(e.data) ? e.data : null;
    if (!data) continue;
    if (r.typ === "aufgabe") {
      const holder = typeof data.fuer === "string" && data.fuer ? data.fuer : r.besitzer;
      if (holder !== userId) continue;
    } else if (r.raum === "arbeit" && r.besitzer !== userId) continue;
    out.push({ ...(e as object), id: r.id, typ: r.typ, raum: r.raum === "arbeit" ? "arbeit" : "familie", besitzer: r.besitzer, data } as CalendarEntry);
  }
  return out;
}

/** Proaktiv (Pinnwand, Abgeben): was in den letzten `sinceMin` Minuten von anderen kam */
function freshFromOthers(rows: PushEntryRow[], userId: string, nowMs: number, sinceMin: number): { key: string; body: string; href: string; kind: NotifyKind }[] {
  const out: { key: string; body: string; href: string; kind: NotifyKind }[] = [];
  for (const r of rows) {
    const e = isObj(r.data) ? r.data : {};
    const data = isObj(e.data) ? e.data : {};
    if (r.besitzer === userId) continue;
    if ((r.typ === "pinnwand" || r.typ === "memo") && nowMs - Date.parse(r.erstellt) <= sinceMin * 60_000) {
      const author = typeof data.author === "string" && data.author.trim() ? data.author.trim() : "Jemand";
      out.push({ key: `pin:${r.id}`, body: r.typ === "memo" ? `${author} hat eine Sprachnachricht an die Pinnwand gehängt.` : `${author} hat etwas an die Pinnwand gehängt.`, href: "/pinnwand", kind: "pinnwand" });
    } else if (r.typ === "aufgabe" && data.fuer === userId && nowMs - Date.parse(r.geaendert) <= sinceMin * 60_000) {
      const title = typeof data.title === "string" ? data.title : "eine Aufgabe";
      out.push({ key: `abgeben:${r.id}:${r.geaendert}`, body: `Neu für dich: „${title}“.`, href: "/aufgaben", kind: "abgeben" });
    }
  }
  return out;
}

/** Wie lange eine Einkaufs-Mitteilung noch frisch ist */
const TRIP_FRESH_MS = 10 * 60_000;

/** Einkauf unterwegs von anderen: Start (mit Schnellknöpfen) bzw. Ende */
function tripMessages(rows: PushEntryRow[], userId: string, nowMs: number): { key: string; body: string; href: string; actions?: PushAction[] }[] {
  const out: { key: string; body: string; href: string; actions?: PushAction[] }[] = [];
  for (const r of rows) {
    if (r.typ !== "unterwegs" || r.besitzer === userId || !isObj(r.data)) continue;
    const d = r.data;
    const trip = { by: typeof d.by === "string" ? d.by : "", shop: typeof d.shop === "string" ? d.shop : "", count: typeof d.count === "number" ? d.count : null };
    if (!trip.shop) continue;
    const end = typeof d.end === "string" ? Date.parse(d.end) : NaN;
    const start = typeof d.start === "string" ? Date.parse(d.start) : NaN;
    if (!Number.isNaN(end)) {
      if (nowMs - end <= TRIP_FRESH_MS) out.push({ key: `unterwegs:${r.id}:ende`, body: endText(trip), href: "/einkaufsliste" });
    } else if (nowMs - start <= TRIP_FRESH_MS) {
      const names = (Array.isArray(d.vorschlaege) ? d.vorschlaege : []).filter((s): s is string => typeof s === "string" && s.trim() !== "").slice(0, 2);
      const actions = [...names.map((n) => ({ action: `plus:${n.trim()}`, title: `+ ${n.trim()}` })), { action: "nichts", title: "Nichts, danke" }];
      out.push({ key: `unterwegs:${r.id}:start`, body: startText(trip), href: "/einkaufsliste", actions });
    }
  }
  return out;
}

/**
 * Was jetzt rausgeht. `sent` = schon gesendete Schlüssel je Abo; `proactiveToday`
 * = Abos, die heute schon eine proaktive Mitteilung hatten.
 */
export function planPushes(input: {
  abos: PushAbo[];
  rows: PushEntryRow[];
  today: string;
  minute: number;
  nowMs: number;
  sent: Set<string>;
  proactiveToday: Set<string>;
}): PushMessage[] {
  const out: PushMessage[] = [];
  for (const abo of input.abos) {
    if (!abo.household_id) continue;
    const s = abo.settings ?? {};
    if (pauseOn(s.pause, input.today)) continue;
    const routine: DayRoutine = { ...DEFAULT_ROUTINE, ...(s.routine ?? {}) };
    const title = s.name?.trim() || helperName(null);
    const rows = input.rows.filter((r) => r.household_id === abo.household_id);
    if (kindOn(s, "erinnerungen")) {
      const due: ReminderMoment[] = dueNow(visibleEntries(rows, abo.user_id), input.today, input.minute, []);
      for (const m of due) {
        const key = `erinnerung:${m.key}#${m.date}`;
        if (input.sent.has(`${abo.id}|${key}`)) continue;
        if (!pushAllowed({ kind: m.kind, minutes: input.minute, routine, workEnd: null, paused: false, proactiveSentToday: false })) continue;
        out.push({ aboId: abo.id, key, payload: { title, body: m.body, href: m.href, tag: `erinnerung:${m.key}` } });
      }
    }
    if (kindOn(s, "einkauf") && input.minute >= 7 * 60 && input.minute < 20 * 60) {
      for (const t of tripMessages(rows, abo.user_id, input.nowMs)) {
        if (input.sent.has(`${abo.id}|${t.key}`)) continue;
        out.push({ aboId: abo.id, key: t.key, payload: { title, body: t.body, href: t.href, tag: t.key.replace(/:(start|ende)$/, ""), ...(t.actions ? { actions: t.actions } : {}) } });
      }
    }
    if (input.proactiveToday.has(abo.id)) continue;
    const proactive = freshFromOthers(rows, abo.user_id, input.nowMs, 3).find((p) => kindOn(s, p.kind) && !input.sent.has(`${abo.id}|${p.key}`));
    if (proactive && pushAllowed({ kind: "proaktiv", minutes: input.minute, routine, workEnd: null, paused: false, proactiveSentToday: false })) {
      out.push({ aboId: abo.id, key: `proaktiv:${input.today}:${proactive.key}`, payload: { title, body: proactive.body, href: proactive.href, tag: proactive.key } });
    }
  }
  return out;
}

/** Aus den gesendeten Schlüsseln: welche Abos heute schon proaktiv bekamen */
export function proactiveAbos(sent: { abo_id: string; key: string }[], today: string): Set<string> {
  return new Set(sent.filter((x) => x.key.startsWith(`proaktiv:${today}:`)).map((x) => x.abo_id));
}

/** Gesendete Schlüssel als Menge „abo|key“ – proaktive auch unter ihrem Kern-Schlüssel */
export function sentKeys(sent: { abo_id: string; key: string }[]): Set<string> {
  const out = new Set<string>();
  for (const x of sent) {
    out.add(`${x.abo_id}|${x.key}`);
    const m = /^proaktiv:\d{4}-\d{2}-\d{2}:(.+)$/.exec(x.key);
    if (m) out.add(`${x.abo_id}|${m[1]}`);
  }
  return out;
}
