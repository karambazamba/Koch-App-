// Feste Regeln des Chats (ohne KI – oder wenn die KI per `app_befehl` darum bittet):
// Pause, Tagesablauf, Pinnwand/Wetter, Schnellnotiz, Notizen, Bausteine, Startseite.
// true = erledigt.

import type { Dispatch, SetStateAction } from "react";
import { loadProfile, saveProfile } from "@/lib/einstellungen/profileStore";
import { changeEntries, loadEntries } from "@/lib/aufgaben";
import { parseHomeCommand } from "@/lib/lotte/homeChat";
import { parseBausteinCommand } from "@/lib/lotte/bausteinChat";
import { BAUSTEINE, bausteinOf, featureOn, setFeature } from "@/lib/core/features";
import { changeHome, describeHomeChange, requestHomeEdit, unlockHomeTile } from "@/lib/core/homeLayout";
import { addPin, changePins, createPin, isPinboardQuery, loadPins, pinWriteCommand, visiblePins } from "@/lib/pinnwand";
import { dayAnswer, umbrellaAnswer, weatherQuestion } from "@/lib/wetter/forecast";
import { loadPlace, refreshForecast } from "@/lib/wetter/client";
import { pushUndo, undoLast } from "@/lib/core/undo";
import { commitOps } from "@/lib/lotte/client";
import { dayChat } from "@/lib/lotte/dayChat";
import { cookableEntry } from "@/lib/essen/mealDone";
import type { AssistantData, ChangeOp } from "@/lib/lotte/ops";
import { DEFAULT_SHOPPING_DAY, planningWeekStart, toIsoDate, weekStartFor } from "@/lib/essen/weekPlan";
import { parsePauseRequest, pauseLabel } from "@/lib/essen/spontan";
import { composeWeek } from "@/lib/essen/mealPlan";
import { replaceEntries, taskOverview, terminToAufgabe, upsertEntry, type CalendarEntry } from "@/lib/aufgaben";
import { addListItems, appendLine, changeSchnellnotiz, changeNotes, createNote, isSchnellnotizTidyRequest, schnellnotizCommand, loadSchnellnotiz, loadNotes, noteAnswer, noteFor, parseNoteCommand, replaceNotes, saveSchnellnotiz, setPinned, tidySchnellnotiz, upsertNote, withoutLines } from "@/lib/notizen";
import { createEntry } from "@/lib/core/entries";
import { berlinTime, now } from "@/lib/core/now";

import type { ChatState, ChatTurnView } from "./chatTypes";

/** Was die festen Regeln vom Chat brauchen */
export type RuleContext = {
  data: AssistantData | null | undefined;
  today: Date | undefined;
  setChat: Dispatch<SetStateAction<ChatState>>;
  setInput: (text: string) => void;
  router: { push: (href: string) => void };
  onClose: () => void;
};

/** Lokale Antwort ins Gespräch (mit optionalem Rückgängig) */
const localTurnOf = (ctx: RuleContext) => (t: string, text: string, undo?: () => void) =>
  ctx.setChat((c) => ({
    ...c,
    turns: [...c.turns, { role: "user", text: t, local: true }, { role: "assistant", text, local: true, ...(undo ? { undo: pushUndo(text, undo) } : {}) }],
  }));

/** Antwort von Lotte (lokal) ins Gespräch; `deleted` = echtes Löschen → Knopf "Rückgängig" */
const localReplyOf = (ctx: RuleContext) => (t: string, text: string, undo?: () => void, deleted = false) => {
  ctx.setInput("");
  ctx.setChat((c) => ({
    ...c,
    turns: [
      ...c.turns,
      { role: "user", text: t, local: true },
      {
        role: "assistant",
        local: true,
        text,
        deleted,
        ...(undo
          ? {
              undo: () => {
                undo();
                ctx.setChat((x) => ({ ...x, turns: [...x.turns, { role: "assistant", text: "Rückgängig gemacht – alles wie vorher.", local: true }] }));
              },
            }
          : {}),
      },
    ],
  }));
};

/** Pause ohne KI: nur eine klare Abwesenheit – und nie still, sondern als Frage mit zwei Knöpfen */
export function pauseRule(ctx: RuleContext, t: string): boolean {
  const { data, today, setChat, setInput } = ctx;
  const localTurn = localTurnOf(ctx);
  if (!data || !today) return false;
  const pause = parsePauseRequest(t, today);
  if (!pause) return false;
  setInput("");
  if (pause.kind === "end") {
    const before = data.profile;
    if (before.pause) saveProfile({ ...before, pause: null });
    localTurn(t, before.pause ? "Willkommen zurück! 😊 Pause ist beendet." : "Schön, dass ihr da seid! 😊", before.pause ? () => saveProfile(before) : undefined);
    return true;
  }
  const finish = (yes: boolean) => {
    if (!yes) return setChat((c) => ({ ...c, turns: [...c.turns, { role: "assistant", text: "Okay, keine Pause.", local: true }] }));
    const before = loadProfile() ?? data.profile;
    saveProfile({ ...before, pause: pause.pause });
    setChat((c) => ({
      ...c,
      turns: [
        ...c.turns,
        {
          role: "assistant",
          local: true,
          text: `Eingetragen ✓ Pause ${pauseLabel(pause.pause)} ☀️`,
          undo: pushUndo(`die Pause ${pauseLabel(pause.pause)}`, () => saveProfile(before)),
        },
      ],
    }));
  };
  setChat((c) => ({
    ...c,
    turns: [
      ...c.turns,
      { role: "user", text: t, local: true },
      {
        role: "assistant",
        local: true,
        text: `Soll ich eine Pause ${pauseLabel(pause.pause)} eintragen? Dann plane ich da nichts.`,
        choices: [
          { label: "Ja, eintragen", onClick: () => finish(true) },
          { label: "Nein", onClick: () => finish(false) },
        ],
      },
    ],
  }));
  return true;
}

/** Timer, Kochen, Sport, Startseiten-Modus ohne KI (sofort, Zurücknehmen bleibt gemerkt) */
export function dayRule(ctx: RuleContext, t: string): boolean {
  const { data, today } = ctx;
  const localReply = localReplyOf(ctx);
  if (!data || !today) return false;
  const iso = toIsoDate(today);
  const week = composeWeek(weekStartFor(today, data.profile.shoppingDay || DEFAULT_SHOPPING_DAY), data.profile, data.weekPlans, data.mealPlans, data.recipes);
  const entry = cookableEntry(week.days.find((d) => d.date === iso));
  const recipe = entry?.recipeId ? data.recipes[entry.recipeId] : undefined;
  const reply = dayChat(t, { today: iso, me: data.profile.persons[0]?.id ?? null, others: data.profile.persons.slice(1).map((p) => p.name.trim()), cooking: entry ? { dish: entry.title, recipe: recipe?.id ?? entry.title, steps: recipe?.steps ?? [] } : null });
  if (!reply) return false;
  localReply(t, reply.text);
  return true;
}

/** Bausteine ohne KI: "Zeig mir den Vorrat" (wenn aus), "Ich brauche die Tipps nicht", "Was kannst du noch?" */
/** Pinnwand und Wetter ohne KI: "Schreib an die Pinnwand: …", "Was steht auf der Pinnwand?", "Wie wird das Wetter morgen?", "Brauch ich heute einen Schirm?" */
export function boardRule(ctx: RuleContext, t: string): boolean {
  const { data, today, setChat, setInput } = ctx;
  if (!data || !today) return false;
  const say = (text: string) => setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: t, local: true }, { role: "assistant", text, local: true }] }));
  const me = data.profile.persons[0]?.name.trim() || "Ich";
  const write = pinWriteCommand(t);
  if (write) {
    setInput("");
    const pin = createPin(write, me);
    if (!pin) return false;
    pushUndo("die Pinnwand-Nachricht", changePins((all) => addPin(all, pin)));
    const shown = unlockHomeTile("pinnwand");
    say(`Hängt an der Pinnwand ✓ „${pin.data.text}“${shown ? " – die Pinnwand steht jetzt oben auf der Startseite." : ""}`);
    return true;
  }
  if (isPinboardQuery(t)) {
    setInput("");
    const pins = visiblePins(loadPins(), now().getTime());
    say(pins.length ? `Auf der Pinnwand: ${pins.slice(0, 4).map((m) => `${m.data.author === me ? "Du" : m.data.author}: „${m.data.text}“`).join(" · ")}` : "Auf der Pinnwand steht gerade nichts.");
    return true;
  }
  const question = weatherQuestion(t, toIsoDate(today));
  if (question) {
    setInput("");
    setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: t, local: true }] }));
    void refreshForecast(loadPlace()).then((fc) => {
      const minutes = berlinTime().minutes;
      const text = !fc
        ? "Gerade komme ich nicht an die Wetterdaten – probier’s gleich nochmal."
        : question.umbrella
          ? umbrellaAnswer(fc, question.date, minutes)
          : (dayAnswer(fc, question.date, question.label) ?? "Für den Tag gibt’s noch keine Vorhersage – nur die nächsten 7 Tage.");
      setChat((c) => ({ ...c, turns: [...c.turns, { role: "assistant", text, local: true }] }));
    });
    return true;
  }
  return false;
}

/** Schnellnotiz (früher Kladde) ohne KI: "Schreib in die Schnellnotiz/Kladde: …", "Notier mir schnell …", "Räum meine Schnellnotiz auf"; dazu "Das ist kein Termin, sondern eine Aufgabe" */
export function schnellnotizRule(ctx: RuleContext, t: string): boolean {
  const { today, setChat, setInput } = ctx;
  if (!today) return false;
  const say = (text: string, extra: Partial<ChatTurnView> = {}) => setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: t, local: true }, { role: "assistant", text, local: true, ...extra }] }));
  const write = schnellnotizCommand(t);
  if (write) {
    setInput("");
    const undo = changeSchnellnotiz(appendLine(loadSchnellnotiz().text, write));
    const text = "Steht in der Schnellnotiz ✓ (Notizen, ganz oben)";
    say(text, { undo: pushUndo(text, undo) });
    return true;
  }
  if (isSchnellnotizTidyRequest(t)) {
    setInput("");
    const iso = toIsoDate(today);
    const lines = tidySchnellnotiz(loadSchnellnotiz().text, iso).filter((l) => l.kind);
    if (!lines.length) {
      say("In deiner Schnellnotiz finde ich gerade nichts, was ein Termin, eine Aufgabe oder eine Notiz wird – alles bleibt, wie es ist.");
      return true;
    }
    const label = (l: (typeof lines)[number]) => (l.kind === "termin" ? "Termin" : l.kind === "aufgabe" ? "Aufgabe" : "Notiz");
    const apply = () => {
      const beforeEntries = loadEntries();
      const beforeNotes = loadNotes();
      const beforeSchnellnotiz = loadSchnellnotiz().text;
      const created = lines.flatMap((l) => (l.draft ? [createEntry(l.draft.typ, l.draft.data, { raum: l.draft.raum }) as CalendarEntry] : []));
      if (created.length) changeEntries((list) => created.reduce((acc, e) => upsertEntry(acc, e), list));
      for (const l of lines) {
        if (l.note?.kind === "add") {
          const list = noteFor(loadNotes(), l.note.list);
          const items = l.note.items;
          changeNotes((all) => (list ? addListItems(all, list.id, items) : upsertNote(all, createNote({ title: l.note!.kind === "add" ? l.note!.list : l.line, items }))));
        } else if (l.note?.kind === "create") {
          const n = l.note;
          changeNotes((all) => upsertNote(all, createNote({ title: n.title, text: n.text })));
        }
      }
      saveSchnellnotiz(withoutLines(beforeSchnellnotiz, lines.map((l) => l.line)));
      const text = `Übernommen ✓ ${lines.length} ${lines.length === 1 ? "Zeile" : "Zeilen"} – der Rest bleibt in der Schnellnotiz.`;
      setChat((c) => ({
        ...c,
        turns: [...c.turns, { role: "assistant", text, local: true, undo: pushUndo("das Aufräumen der Schnellnotiz", () => (replaceEntries(beforeEntries), replaceNotes(beforeNotes), saveSchnellnotiz(beforeSchnellnotiz))) }],
      }));
    };
    say(`Daraus würde ich machen: ${lines.map((l) => `${label(l)}: ${l.draft?.data.title ?? (l.note?.kind === "create" ? l.note.title : l.line)}`).join(" · ")}. Der Rest bleibt in der Schnellnotiz.`, {
      choices: [
        { label: "Übernehmen", onClick: apply },
        { label: "Nein, lass", onClick: () => setChat((c) => ({ ...c, turns: [...c.turns, { role: "assistant", text: "Okay, die Schnellnotiz bleibt, wie sie ist.", local: true }] })) },
      ],
    });
    return true;
  }
  // "Das ist kein Termin, sondern eine Aufgabe" – der zuletzt geänderte Termin
  if (/\bkein(?:en)?\s+termin\b.*\baufgabe\b/i.test(t)) {
    setInput("");
    const last = [...loadEntries()].filter((e) => e.typ === "termin").reverse().sort((a, b) => b.geaendert.localeCompare(a.geaendert))[0];
    if (!last || last.typ !== "termin") {
      say("Welchen Termin meinst du genau?");
      return true;
    }
    const undo = changeEntries((list, stamp) => list.map((e) => (e.id === last.id && e.typ === "termin" ? terminToAufgabe(e, stamp) : e)));
    const text = `Umgewandelt ✓ „${last.data.title}“ ist jetzt eine Aufgabe.`;
    say(text, { undo: pushUndo(text, undo) });
    return true;
  }
  return false;
}

/** Notizen und Aufgaben-Übersicht ohne KI: "Merk dir …", "Was steht auf der Packliste?", "Häng das WLAN oben an", "Was muss ich heute noch erledigen?" */
export function noteRule(ctx: RuleContext, t: string): boolean {
  const { today, setChat, setInput, router, onClose } = ctx;
  if (!today) return false;
  const cmd = parseNoteCommand(t);
  if (!cmd) return false;
  setInput("");
  const say = (text: string, undo?: () => void) =>
    setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: t, local: true }, { role: "assistant", text, local: true, ...(undo ? { undo: pushUndo(text, undo) } : {}) }] }));
  const notes = loadNotes();
  switch (cmd.kind) {
    case "tasks": {
      const g = taskOverview(loadEntries(), toIsoDate(today));
      const part = (label: string, list: typeof g.heute) => (list.length ? `${label}: ${list.slice(0, 5).map((i) => `${i.title}${i.carried ? ` (${i.carried})` : i.dueLabel ? ` (${i.dueLabel})` : ""}`).join(", ")}.` : "");
      const text = [part("Heute dran", g.heute), part("Diese Woche", g.woche)].filter(Boolean).join(" ") || "Heute liegt nichts an – schön ruhig.";
      say(cmd.open ? `${text} Ich hab dir die Aufgaben aufgemacht.` : text);
      if (cmd.open) {
        router.push("/aufgaben");
        onClose();
      }
      return true;
    }
    case "show_all":
      say("Hier sind deine Notizen.");
      router.push("/notizen");
      onClose();
      return true;
    case "show": {
      const note = noteFor(notes, cmd.query);
      say(note ? noteAnswer(note) : notes.length ? `Dazu hab ich keine Notiz. Da sind: ${notes.map((n) => n.data.title).join(", ")}.` : "Dazu hab ich noch nichts notiert – sag einfach „Merk dir …“.");
      return true;
    }
    case "pin": {
      const note = noteFor(notes, cmd.query.replace(/^(das|die|den|der|meine|unsere)\s+/i, ""));
      if (!note) {
        say("Die Notiz finde ich gerade nicht – wie heißt sie?");
        return true;
      }
      const undo = changeNotes((list) => setPinned(list, note.id, cmd.on));
      say(cmd.on ? `Angeheftet ✓ ${note.data.title} steht jetzt oben bei den Notizen.` : `Gelöst ✓ ${note.data.title}`, undo);
      return true;
    }
    case "add": {
      const list = noteFor(notes, cmd.list);
      if (list) {
        const undo = changeNotes((all) => addListItems(all, list.id, cmd.items));
        say(`Notiert ✓ ${cmd.items.join(", ")} auf „${list.data.title}“.`, undo);
      } else {
        const note = createNote({ title: cmd.list, items: cmd.items });
        const undo = changeNotes((all) => upsertNote(all, note));
        say(`Notiert ✓ Neue Liste „${note.data.title}“: ${cmd.items.join(", ")}. Steht unter Notizen.`, undo);
      }
      return true;
    }
    case "create": {
      const same = notes.find((n) => n.data.kind === "text" && n.data.title.toLowerCase() === cmd.title.toLowerCase());
      if (same) {
        const undo = changeNotes((all) => upsertNote(all, { ...same, data: { ...same.data, text: cmd.text ?? "" } }));
        say(`Aktualisiert ✓ ${same.data.title}`, undo);
      } else {
        const note = createNote({ title: cmd.title, text: cmd.text });
        const undo = changeNotes((all) => upsertNote(all, note));
        say(`Gemerkt ✓ ${note.data.emoji} ${note.data.title} – steht unter Notizen.`, undo);
      }
      return true;
    }
  }
}

export function bausteinRule(ctx: RuleContext, t: string): boolean {
  const { setInput } = ctx;
  const localTurn = localTurnOf(ctx);
  const cmd = parseBausteinCommand(t);
  if (!cmd) return false;
  if (cmd.kind === "list") {
    const off = BAUSTEINE.filter((b) => !featureOn(b.feature));
    setInput("");
    localTurn(t, off.length ? `Ich kann noch: ${off.map((b) => `${b.name} – ${b.text.replace(/\.$/, "")}`).join("; ")}. Sag einfach, was ich einschalten soll – oder schau unter Einstellungen → Bausteine.` : "Gerade ist alles an, was ich kann.");
    return true;
  }
  const b = bausteinOf(cmd.feature);
  // Schon so? Dann ist es keine Baustein-Frage (z. B. "Zeig mir den Wochenplan" öffnet ihn)
  if (!b || featureOn(cmd.feature) === cmd.on) return false;
  setInput("");
  setFeature(cmd.feature, cmd.on);
  localTurn(t, cmd.on ? `Erledigt ✓ ${b.where}` : `Erledigt ✓ ${b.name} ist aus – die Daten bleiben.`, () => setFeature(cmd.feature, !cmd.on));
  return true;
}

/** "Mach die Einkaufsliste wieder klein", "Lösch den Wochenplan", "Mach das rückgängig" … */
export function homeCommand(ctx: RuleContext, t: string): boolean {
  const { data, today, setInput, router, onClose } = ctx;
  const localReply = localReplyOf(ctx);
  if (!data || !today) return false;
  const cmd = parseHomeCommand(t);
  if (!cmd) return false;
  if (cmd.kind === "undo") {
    const label = undoLast();
    localReply(t, label ? `Zurückgenommen ✓ ${label}` : "Da gibt’s gerade nichts zurückzunehmen.");
    return true;
  }
  if (cmd.kind === "show") {
    setInput("");
    if (cmd.target === "startseite") requestHomeEdit();
    router.push(cmd.target === "wochenplan" ? "/?seite=essen" : cmd.target === "einkaufsliste" ? "/einkaufsliste" : "/");
    onClose();
    return true;
  }
  if (cmd.kind === "home") {
    const undo = pushUndo(describeHomeChange(cmd.change), changeHome(cmd.change));
    localReply(t, `Erledigt ✓ ${describeHomeChange(cmd.change)}`, undo, cmd.change.action === "ausblenden");
    return true;
  }
  const weekStart = planningWeekStart(today, data.profile.shoppingDay || DEFAULT_SHOPPING_DAY).weekStart;
  const op: ChangeOp =
    cmd.kind === "clear_week"
      ? { id: "lokal-woche", type: "clear_week", weekStart: weekStartFor(today, data.profile.shoppingDay || DEFAULT_SHOPPING_DAY) }
      : cmd.kind === "clear_shopping"
        ? { id: "lokal-liste", type: "clear_shopping", weekStart }
        : { id: "lokal-weg", type: "remove_shopping", weekStart, names: cmd.names };
  const { undo } = commitOps(data, [op], new Set([op.id]), t);
  const text = cmd.kind === "clear_week" ? "Erledigt ✓ Der Wochenplan ist wieder leer – die Rezepte bleiben." : cmd.kind === "clear_shopping" ? "Erledigt ✓ Die Einkaufsliste ist leer." : `Erledigt ✓ ${cmd.names.join(", ")} ${cmd.names.length === 1 ? "ist" : "sind"} von der Liste.`;
  localReply(t, text, undo, true);
  return true;
}
