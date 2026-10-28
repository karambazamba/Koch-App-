// Testmodus (KUECHENHELFER_MOCK=1): Alltags-Sätze ohne KI erkennen –
// Termine, Aufgaben, Mails, Tagesablauf, Pinnwand/Wetter, Schnellnotiz, Notizen.

import { parseTimerCommand } from "@/lib/timer/model";
import { stayMiaReply } from "@/lib/begleitung/helperTools";
import { parseHouseholdIntro } from "@/lib/einstellungen/householdIntro";
import { isCalendarImportRequest } from "@/lib/kalender/import/chat";
import { isWeekCheckRequest } from "@/lib/kalender/wochencheck";
import { parseSportCommand } from "@/lib/sport/model";
import { parseNoteCommand } from "@/lib/notizen/chat";
import { schnellnotizCommand } from "@/lib/notizen/schnellnotiz";
import { noteFromText } from "@/lib/notizen/model";
import { isPinboardQuery, pinWriteCommand } from "@/lib/pinnwand/model";
import { eventsIn, greetingCommand, localNewMail, localReply, looksLikeMail, parseHistoryDraft, REPLY_CHOICES, reviseDraft, revisionOf, splitInstruction, styleFromContext, type MailDraft } from "@/lib/begleitung/mail";
import type Anthropic from "@anthropic-ai/sdk";
import { parseCalendar, type Draft } from "@/lib/kalender/parse";
import { splitTermine } from "@/lib/kalender/sentence";
import { parseHomeCommand } from "@/lib/begleitung/homeChat";
import { parseBausteinCommand } from "@/lib/begleitung/bausteinChat";
import { BAUSTEINE, LAUNCH_AUS } from "@/lib/core/features";
import { parsePauseRequest } from "@/lib/essen/spontan";
import { findByTitle, sanitizeEntry, type CalendarEntry } from "@/lib/kalender/model";
import { text, tools } from "@/lib/begleitung/mockShared";
import { jetztCommand } from "@/lib/heute/jetztCommand";
import { tipsMode } from "@/lib/tipps/server";
import { tipQuestion } from "@/lib/tipps/question";

// --- Termine und Aufgaben (Testmodus: Satz-Erkennung ohne KI) --------------------

const NUMBER_WORDS: Record<string, number> = { zweit: 2, dritt: 3, viert: 4, fünft: 5, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6 };

/** Alltag im Testmodus: Portionen, Pause, Startseite/Rückgängig, App-Bedienung */
export function everydayUses(latest: string, system: string): Anthropic.Beta.BetaMessage | null {
  const t = latest.toLowerCase();
  const today = system.match(/^Heute: .*\((\d{4}-\d{2}-\d{2})\)/m)?.[1] ?? "";
  // "Heute sind wir nur zu zweit" / "Rechne das Rezept auf 2 Personen um"
  const people = t.match(/\bnur (?:zu )?(zweit|dritt|viert|fünft)\b/) ?? t.match(/\bauf (\d+|zwei|drei|vier|fünf|sechs) (?:personen|leute|portionen)\b/) ?? t.match(/\bnur (\d+|zwei|drei|vier) (?:personen|leute)\b/);
  if (people) return tools([{ name: "portionen_anpassen", input: { personen: Number(people[1]) || NUMBER_WORDS[people[1]] || 2 } }]);
  if (/\b(wieder da|zurück aus dem urlaub|urlaub ist vorbei)\b/.test(t)) return tools([{ name: "pause_beenden", input: {} }]);
  if (/\b(urlaub|verreist|verreisen|ferien)\b/.test(t) && today) {
    const pause = parsePauseRequest(latest, new Date(`${today}T12:00:00`));
    if (pause?.kind === "start" && pause.pause.until) return tools([{ name: "pause_setzen", input: { von: pause.pause.from, bis: pause.pause.until } }]);
    return text("Schön! Von wann bis wann seid ihr weg? (Testmodus)");
  }
  // Bausteine: "Zeig mir den Vorrat", "Ich brauche die Tipps nicht", "Was kannst du noch?"
  const baustein = parseBausteinCommand(latest);
  if (baustein) {
    const offLine = system.match(/Aus: (.+)$/m)?.[1] ?? "";
    if (baustein.kind === "list") {
      const off = BAUSTEINE.filter((b) => offLine.includes(`(${b.feature}:`) && !LAUNCH_AUS.includes(b.feature));
      return text(off.length ? `Außerdem kann ich: ${off.map((b) => `${b.name} – ${b.text.replace(/\.$/, "")}`).join("; ")}. Soll ich was davon einschalten? (Testmodus)` : "Gerade ist alles an, was ich kann. (Testmodus)");
    }
    const isOff = offLine.includes(`(${baustein.feature}:`);
    if (isOff === baustein.on) return tools([{ name: baustein.on ? "baustein_an" : "baustein_aus", input: { baustein: baustein.feature } }]);
  }
  const home = parseHomeCommand(latest);
  if (home) {
    if (home.kind === "undo") return tools([{ name: "rueckgaengig", input: {} }]);
    if (home.kind === "home") return tools([{ name: "startseite_anpassen", input: { kachel: home.change.tile, aktion: home.change.action, ...(home.change.farbe ? { farbe: home.change.farbe } : {}) } }]);
    if (home.kind === "clear_week") return tools([{ name: "wochenplan_loeschen", input: {} }]);
    if (home.kind === "clear_shopping") return tools([{ name: "einkaufsliste_leeren", input: {} }]);
    if (home.kind === "remove_shopping") return tools([{ name: "einkaufsliste_entfernen", input: { artikel: home.names } }]);
    return tools([{ name: "app_befehl", input: { text: latest } }]);
  }
  // App-Bedienung (Ansicht, Vorlesen, Einstellungen, neue Person, Produkte, Seiten)
  if (greetingCommand(latest) || isCalendarImportRequest(latest) || isWeekCheckRequest(latest)) return tools([{ name: "app_befehl", input: { text: latest } }]);
  if (/\b(ansicht|dunkel|ruhiger|schlichter|dezenter|weniger bunt|bunter|farbiger|wieder farbig|vorlesen|lies mir|sprich (langsamer|schneller)|melde dich|keine tipps|isst jetzt|mag kein\w*|allergisch|wohnt jetzt|immer .+ statt|zeig mir (alles|unsere rezepte|den vorrat)|koche jetzt spontan)\b/.test(t)) {
    return tools([{ name: "app_befehl", input: { text: latest } }]);
  }
  return null;
}

/** Mails im Testmodus: eingefügte Mail, "Zusagen"/"Absagen"/"Nachfragen", neue Mail, "Kürzer"/"Auf Du" */
export function mailUses(latest: string, msgs: Anthropic.Beta.BetaMessageParam[], system: string): Anthropic.Beta.BetaMessage | null {
  const today = system.match(/^Heute: .*\((\d{4}-\d{2}-\d{2})\)/m)?.[1] ?? "";
  const { style, name } = styleFromContext(system);
  const strings = msgs.slice(0, -1).filter((m) => typeof m.content === "string") as { role: string; content: string }[];
  const eventsFor = (mail: string) => (today ? eventsIn(mail, today).map((d) => draftInput(d, today)) : []);
  const draftUse = (d: MailDraft) => ({ name: "mail_entwurf", input: { an: d.to, empfaenger: d.recipient ?? "", betreff: d.subject, text: d.body, anrede: d.tone, ...(d.summary ? { kurzfassung: d.summary } : {}) } });
  const { instruction, mail } = splitInstruction(latest);
  if (looksLikeMail(mail)) {
    if (instruction) return tools([draftUse(localReply(mail, { instruction }, style, name)), ...eventsFor(mail)]);
    return tools([{ name: "antwort_knoepfe", input: { optionen: REPLY_CHOICES.map((c) => c.label) } }, ...eventsFor(mail)]);
  }
  // Antwort-Knopf auf die zuletzt eingefügte Mail
  const choice = REPLY_CHOICES.find((c) => c.label.toLowerCase() === latest.trim().toLowerCase());
  const pasted = [...strings].reverse().find((m) => m.role === "user" && looksLikeMail(splitInstruction(m.content).mail));
  if (choice && pasted) return tools([draftUse(localReply(splitInstruction(pasted.content).mail, { choice: choice.id }, style, name))]);
  // Änderung am letzten Entwurf
  const rev = revisionOf(latest);
  const lastDraft = [...strings].reverse().find((m) => m.role === "assistant" && m.content.includes("[Mail-Entwurf"));
  const previous = lastDraft ? parseHistoryDraft(lastDraft.content.slice(lastDraft.content.indexOf("[Mail-Entwurf"))) : null;
  if (rev && previous) return tools([draftUse(reviseDraft(previous, rev))]);
  const fresh = localNewMail(latest, style, name);
  if (fresh) return tools([draftUse(fresh)]);
  return null;
}

/** Pinnwand und Wetter im Testmodus */
export const DAY_TOOL_NAMES = new Set(["timer_stellen", "timer_stoppen", "stoppuhr", "timer_status", "kochen_starten", "kochschritt", "sport_eintragen", "sport_ziel_setzen", "trainings_planen", "sport_statistik", "jetzt_karte", "assistent_anpassen", "haushalt_vorstellen"]);

/** Timer, Kochen, Sport, Jetzt-Karte im Testmodus (dieselben Erkenner wie ohne KI) */
export function dayUses(latest: string, system: string): Anthropic.Beta.BetaMessage | null {
  const today = system.match(/^Heute: .*\((\d{4}-\d{2}-\d{2})\)/m)?.[1] ?? "";
  const jetzt = jetztCommand(latest);
  if (jetzt !== null) return tools([{ name: "jetzt_karte", input: { an: jetzt } }]);
  const stay = stayMiaReply(latest);
  if (stay) return text(`${stay} (Testmodus)`);
  const intro = parseHouseholdIntro(latest);
  if (intro) return tools([{ name: "haushalt_vorstellen", input: { ...(intro.me ? { ich: intro.me } : {}), erwachsene: intro.adults, kinder: intro.kids, weitere_kinder: intro.moreKids, allein: intro.single } }]);
  const timer = parseTimerCommand(latest);
  if (timer?.kind === "start") return tools([{ name: "timer_stellen", input: { minuten: timer.minutes, name: timer.name } }]);
  if (timer?.kind === "stop") return tools([{ name: "timer_stoppen", input: { name: timer.name } }]);
  if (timer?.kind === "stopwatch") return tools([{ name: "stoppuhr", input: { aktion: timer.action === "stop" ? "stopp" : "start" } }]);
  if (timer?.kind === "status") return tools([{ name: "timer_status", input: {} }]);
  if (/\b(fang\w*|beginn\w*)\b.*\bkoch\w*|\bich\s+koche\s+jetzt\b/i.test(latest)) return tools([{ name: "kochen_starten", input: {} }]);
  if (/^(nächster|naechster)\s+schritt\b/i.test(latest.trim())) return tools([{ name: "kochschritt", input: { aktion: "weiter" } }]);
  if (/^was\s+kommt\s+(jetzt|als\s+nächstes)\b/i.test(latest.trim())) return tools([{ name: "kochschritt", input: { aktion: "zeigen" } }]);
  const sport = today ? parseSportCommand(latest, today) : null;
  if (sport?.kind === "add") return tools([{ name: "sport_eintragen", input: { sportart: sport.sport, ...(sport.minutes ? { minuten: sport.minutes } : {}), ...(sport.km ? { km: sport.km } : {}), datum: sport.date } }]);
  if (sport?.kind === "goal") return tools([{ name: "sport_ziel_setzen", input: { ziel: sport.goal } }]);
  if (sport?.kind === "stats") return tools([{ name: "sport_statistik", input: { zeitraum: sport.what } }]);
  if (sport?.kind === "plan") return tools([{ name: "trainings_planen", input: { anzahl: sport.count, tageszeit: sport.part ?? "egal", woche: sport.week } }]);
  return null;
}

export function pinWeatherUses(latest: string, system: string): Anthropic.Beta.BetaMessage | null {
  const write = pinWriteCommand(latest);
  if (write) return tools([{ name: "pinnwand_schreiben", input: { text: write } }]);
  if (isPinboardQuery(latest)) {
    const line = system.match(/^Pinnwand: (.*)$/m)?.[1] ?? "leer";
    return text(line === "leer" ? "Auf der Pinnwand steht gerade nichts. (Testmodus)" : `Auf der Pinnwand: ${line} (Testmodus)`);
  }
  const today0 = system.match(/^Heute: .*\((\d{4}-\d{2}-\d{2})\)/m)?.[1] ?? "";
  const tipAsk = today0 && tipsMode() !== "off" ? tipQuestion(latest, today0) : null;
  if (tipAsk) return tools([{ name: "tipps_suchen", input: { von: tipAsk.von, bis: tipAsk.bis, filter: tipAsk.filters, ...(tipAsk.ort ? { ort: tipAsk.ort } : {}) } }]);
  if (/\b(wetter|schirm|regnet|regen)\b/i.test(latest) && /\?|\bwie\b|\bbrauch/i.test(latest)) {
    const today = system.match(/^Heute: .*\((\d{4}-\d{2}-\d{2})\)/m)?.[1] ?? "";
    const t = latest.toLowerCase();
    const days = ["sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag"];
    const add = (n: number) => {
      const d = new Date(`${today}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };
    let tag = today;
    if (/(?<![a-zäöüß])übermorgen\b/.test(t)) tag = add(2);
    else if (/\bmorgen\b/.test(t)) tag = add(1);
    else {
      const wd = days.findIndex((d) => t.includes(d));
      if (wd >= 0 && today) {
        const cur = new Date(`${today}T12:00:00Z`).getUTCDay();
        tag = add((wd - cur + 7) % 7 || 7);
      }
    }
    return tools([{ name: "wetter_abfragen", input: { tag } }]);
  }
  return null;
}

/** Schnellnotiz und Umwandeln im Testmodus */
export function schnellnotizUses(latest: string, msgs: Anthropic.Beta.BetaMessageParam[], system: string): Anthropic.Beta.BetaMessage | null {
  const write = schnellnotizCommand(latest);
  const note = write ? noteFromText(write) : null;
  if (note) return tools([{ name: "notiz_anlegen", input: { titel: note.data.title, text: note.data.text ?? "" } }]);
  const toTask = /\bkein(?:en)?\s+termin\b.*\baufgabe\b/i.test(latest);
  const toTermin = latest.match(/\bkeine\s+aufgabe\b.*\btermin\b.*?\b(?:um\s+)?(\d{1,2})(?::(\d{2}))?\s*uhr\b/i);
  if (toTask || toTermin) {
    const known = contextEntries(system).filter((e) => e.typ === (toTask ? "termin" : "aufgabe"));
    const prevUser = [...msgs].reverse().find((m, i) => i > 0 && m.role === "user" && typeof m.content === "string")?.content as string | undefined;
    const hit = known.find((e) => prevUser?.toLowerCase().includes(e.title.toLowerCase().split(" ")[0])) ?? known[0];
    if (!hit) return text("Welchen Eintrag meinst du genau? (Testmodus)");
    if (toTask) return tools([{ name: "termin_in_aufgabe_umwandeln", input: { id: hit.id } }]);
    return tools([{ name: "aufgabe_in_termin_umwandeln", input: { id: hit.id, start: `${toTermin![1].padStart(2, "0")}:${toTermin![2] ?? "00"}` } }]);
  }
  return null;
}

/** Notizen im Testmodus: "Merk dir …", "Was steht auf der Packliste?", "Häng das WLAN oben an", "Was muss ich heute noch erledigen?" */
export function noteUses(latest: string): Anthropic.Beta.BetaMessage | null {
  const cmd = parseNoteCommand(latest);
  if (!cmd) return null;
  switch (cmd.kind) {
    case "tasks":
      // "Zeig mir meine Aufgaben" öffnet die Seite, sonst kurz antworten
      if (cmd.open) return tools([{ name: "app_befehl", input: { text: latest } }]);
      return tools([{ name: "aufgaben_anzeigen", input: cmd.raum ? { raum: cmd.raum } : {} }]);
    case "show_all":
      return tools([{ name: "app_befehl", input: { text: latest } }]);
    case "show":
      return tools([{ name: "notizen_anzeigen", input: { suche: cmd.query } }]);
    case "pin":
      return tools([{ name: "notiz_anheften", input: { id: cmd.query.replace(/^(das|die|den|der|meine|unsere)\s+/i, ""), angeheftet: cmd.on } }]);
    case "add":
      return tools([{ name: "liste_eintrag_hinzufuegen", input: { liste: cmd.list, eintraege: cmd.items } }]);
    case "create":
      return tools([{ name: "notiz_anlegen", input: { titel: cmd.title, ...(cmd.items ? { liste: cmd.items } : { text: cmd.text ?? "" }) } }]);
  }
}

export const CALENDAR_WRITE = new Set(["pinnwand_schreiben", "termin_in_aufgabe_umwandeln", "aufgabe_in_termin_umwandeln", "notiz_anlegen", "notiz_aendern", "notiz_loeschen", "liste_eintrag_hinzufuegen", "notiz_anheften", "baustein_an", "baustein_aus", "portionen_anpassen", "pause_setzen", "pause_beenden", "startseite_anpassen", "wochenplan_loeschen", "einkaufsliste_leeren", "einkaufsliste_entfernen", "rueckgaengig", "termin_anlegen", "termin_aendern", "termin_loeschen", "aufgabe_anlegen", "aufgabe_aendern", "aufgabe_erledigen", "aufgabe_verschieben"]);

/** Einträge aus der Kontext-Liste "- Mo 2026-10-19: 09:00 Titel [id=…; termin, familie] | …" */
function contextEntries(system: string): { date: string; time: string | null; title: string; id: string; typ: string; repeat: boolean }[] {
  return system
    .split("\n")
    .filter((l) => /^- \S+ \d{4}-\d{2}-\d{2}: /.test(l))
    .flatMap((l) => {
      const date = l.match(/\d{4}-\d{2}-\d{2}/)![0];
      return [...l.slice(l.indexOf(": ")).matchAll(/(?:\| |: )(?:(\d{2}:\d{2}) )?([^|[]+?) \[id=([^;]+); (termin|aufgabe)([^\]]*)\]/g)].map((m) => ({
        date,
        time: m[1] ?? null,
        title: m[2].trim(),
        id: m[3],
        typ: m[4],
        repeat: m[5].includes("wiederkehrend"),
      }));
    });
}

function draftInput(draft: Draft, today?: string): { name: string; input: Record<string, unknown> } {
  const d = draft.data;
  const wiederholung = d.repeat ? { art: d.repeat.kind, ...(d.repeat.kind === "wochentage" ? { tage: d.repeat.days } : {}) } : undefined;
  const common = { titel: d.title, raum: draft.raum, erinnerung: d.reminder, ...(d.label ? { etikett: d.label } : {}), ...(wiederholung ? { wiederholung } : {}) };
  if (draft.typ === "termin") return { name: "termin_anlegen", input: { ...common, datum: draft.data.date, start: draft.data.start, ...(draft.data.who ? { personen: draft.data.who } : {}) } };
  const a = draft.data;
  // Alles ist heute: nur ein genannter Tag kommt als tag mit (Tafel 103)
  return { name: "aufgabe_anlegen", input: { ...common, ...(a.date && a.date !== today ? { tag: a.date } : {}), ...(a.due ? { frist: a.due } : {}), ...(a.time ? { uhrzeit: a.time } : {}) } };
}

/** „Sag Lisa, sie soll den Turnbeutel waschen“ / „Lisa soll …“ → Name und Aufgabe */
export function parseGiveTask(text: string): { name: string; title: string } | null {
  const m = text.trim().match(/^(?:(?:[Ss]ag|[Ff]rag)\s+)?(\p{Lu}[\p{L}-]+),?\s+(?:(?:sie|er)\s+)?soll\s+(?:bitte\s+)?(.+?)[.!]?$/u);
  if (!m || /^(ich|du|wir|man|das|es)$/i.test(m[1])) return null;
  const rest = m[2].replace(/^(den|die|das)\s+/i, "").trim();
  const title = rest.charAt(0).toUpperCase() + rest.slice(1);
  return { name: m[1], title };
}

export function calendarUses(latest: string, system: string): Anthropic.Beta.BetaMessage | null {
  const today = system.match(/^Heute: .*\((\d{4}-\d{2}-\d{2})\)/m)?.[1];
  if (!today) return null;
  // Personen aus dem Profil ("- Jonne; Kind, 6 J.") – Name als Kennung
  const persons = [...system.matchAll(/^- ([^;\n]+); (?:Kind|erwachsen)/gm)].map((m) => ({ id: m[1].trim(), name: m[1].trim() }));
  // „Sag Lisa, sie soll den Turnbeutel waschen“ → Aufgabe für Lisa (Tafel 52 B)
  const give = parseGiveTask(latest);
  if (give) return tools([{ name: "aufgabe_anlegen", input: { titel: give.title, an: give.name } }]);
  // Mehrere Termine in einem Satz: je einer
  const teile = splitTermine(latest, today);
  if (teile.length > 1) {
    const drafts = teile.map((t) => parseCalendar(t, today, persons)).flatMap((c) => (c?.kind === "create" ? [draftInput(c.draft, today)] : []));
    if (drafts.length === teile.length) return tools(drafts);
  }
  const cmd = parseCalendar(latest, today, persons);
  if (!cmd) return null;
  if (cmd.kind === "create") return tools([draftInput(cmd.draft, today)]);
  if (cmd.kind === "show") return tools([cmd.days > 1 ? { name: "woche_anzeigen", input: { ab: cmd.from, tage: cmd.days, label: cmd.label } } : { name: "tag_anzeigen", input: { datum: cmd.from, label: cmd.label } }]);
  if (cmd.kind === "free") return tools([{ name: "tag_anzeigen", input: { datum: cmd.date, frei: [cmd.from, cmd.to], label: cmd.label } }]);
  // Ändern: Eintrag über den Titel finden (ungefähr)
  const known = contextEntries(system);
  const asEntries = known
    .map((k) => sanitizeEntry({ id: k.id, typ: k.typ, data: { title: k.title, date: k.date, start: k.time ?? "08:00", reminder: "aus" } }))
    .filter((e): e is CalendarEntry => e !== null);
  const hit = findByTitle(asEntries, cmd.query)[0];
  const found = hit ? known.find((k) => k.id === hit.id)! : null;
  if (!found) return text("Den Eintrag find ich grad nicht. Wie heißt er genau? (Testmodus)");
  if (cmd.kind === "move") {
    if (found.typ === "termin") return tools([{ name: "termin_aendern", input: { id: found.id, datum: cmd.to, ...(cmd.time ? { start: cmd.time } : {}), ...(found.repeat ? { nur_am: found.date } : {}) } }]);
    return tools([{ name: "aufgabe_verschieben", input: { id: found.id, auf: cmd.to, ...(found.repeat ? { am: found.date } : {}) } }]);
  }
  if (cmd.kind === "delete") return tools([found.typ === "termin" ? { name: "termin_loeschen", input: { id: found.id } } : { name: "aufgabe_aendern", input: { id: found.id, loeschen: true } }]);
  return tools([{ name: "aufgabe_erledigen", input: { id: found.id, am: found.date } }]);
}

/** Kurze Antwort aus der gelesenen Liste (Testmodus) */
export function calendarAnswer(content: string, input: Record<string, unknown>): string {
  const label = typeof input.label === "string" ? input.label : "Da";
  const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const days = contextEntries(content.split("\n").map((l) => (l.startsWith("- ") ? l : `- ${l}`)).join("\n"));
  const open = days.filter((d) => !/erledigt/.test(d.title));
  if (Array.isArray(input.frei)) {
    const [from, to] = input.frei as string[];
    const busy = open.filter((d) => d.typ === "termin" && d.time && d.time >= from && d.time < to);
    return busy.length ? `${cap1(label)} hast du ${busy.map((b) => `${b.time!.replace(/^0/, "")} ${b.title}`).join(" und ")}. (Testmodus)` : `Ja, ${label} ist frei. (Testmodus)`;
  }
  if (!open.length) return `${cap1(label)} steht nichts an. Schön ruhig. (Testmodus)`;
  const byDay = [...new Set(open.map((d) => d.date))].slice(0, 5).map((date) => {
    const items = open.filter((d) => d.date === date).map((d) => `${d.time ? `${d.time.replace(/^0/, "")} ` : ""}${d.title}`);
    const wd = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)).replace(".", "");
    return input.datum ? items.join(", ") : `${wd}: ${items.join(", ")}`;
  });
  return `${cap1(label)}: ${byDay.join(". ")}. (Testmodus)`;
}
