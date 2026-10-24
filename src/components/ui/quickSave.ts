"use client";

// Schnelleingabe speichern (Tafel 76): ein Satz → Eintrag, sofort. Meldet
// sich mit „Eingetragen: … · Rückgängig“ (auch „Mach das rückgängig“ bei Mia).

import { createEntry } from "@/lib/core/entries";
import { todayIso } from "@/lib/core/now";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import type { QuickRead, QuickRequest } from "@/lib/core/schnelleingabe";
import { sanitizeEntry, upsertEntry, type CalendarEntry } from "@/lib/kalender/model";
import { quickTaskData } from "@/lib/kalender/quick";
import { changeEntries } from "@/lib/kalender/store";
import { parseQuickAdd } from "@/lib/einkauf/quickAdd";
import { addManualItem, loadShoppingSettings, removeManualItems, sectionFor, setItemShop } from "@/lib/einkauf/shoppingList";
import { changeNotes, createNote, upsertNote } from "@/lib/notizen";
import { addPin, changePins, createPin } from "@/lib/pinnwand";
import { noteUserAction } from "@/lib/core/activity";
import { buzz } from "@/components/heute/actions";
import { loadNotify } from "@/lib/heute/mitteilungen/einstellungen";
import { askForNotifications } from "@/lib/heute/mitteilungen/geraet";
import { cloudSync } from "@/lib/konten/cache";
import { parseShoppingText } from "@/lib/einkauf/shoppingParse";
import { addPantryItems, loadPantryAll, replacePantry } from "@/lib/vorrat/pantry";
import { unlockFeature } from "@/lib/core/features";

const VERB: Record<QuickRead["kind"], string> = { termin: "Eingetragen", aufgabe: "Eingetragen", einkauf: "Auf der Liste", notiz: "Notiert", pinnwand: "Angepinnt", imhaus: "Im Haus" };

function saveEntry(read: Extract<QuickRead, { kind: "termin" | "aufgabe" }>, remind: boolean): { undo: () => void; title: string } | null {
  const today = todayIso();
  const standard = loadNotify().defaultReminder;
  const data =
    read.kind === "termin"
      ? { title: read.title.slice(0, 120), date: read.date, start: read.time ?? "", reminder: read.time && remind ? standard : "aus", repeat: read.repeat, ...(read.label ? { label: read.label } : {}) }
      : quickTaskData(read.title, read.when ?? "irgendwann", today, { time: read.time, label: read.label, dringend: read.urgent, reminder: read.time && remind && standard !== "aus" ? "30" : "aus" });
  const entry = sanitizeEntry(createEntry(read.kind, data, { raum: read.room }) as CalendarEntry);
  if (!entry) return null;
  const undo = changeEntries((list) => upsertEntry(list, entry));
  // Termin mit Uhrzeit: der passende Moment für Mias Frage nach Erinnerungen
  if (read.kind === "termin" && read.time && remind) askForNotifications("erster-termin");
  return { undo, title: entry.data.title };
}

function saveShopping(text: string, weekStart: string): { undo: () => void; title: string } | null {
  const settings = loadShoppingSettings();
  const { items, unsure } = parseQuickAdd(text, settings);
  // Unsicheres kommt so auf die Liste, wie es getippt wurde – ändern geht dort
  const all = [...items, ...unsure.map((u) => ({ name: u.name, amount: u.amount, shop: u.shop }))];
  if (!all.length) return null;
  const ids = all.map((i) => {
    const id = addManualItem(weekStart, { name: i.name, amount: i.amount, section: sectionFor(i.name) });
    if (i.shop) setItemShop(settings.products[i.name.toLowerCase()] ?? i.name, i.shop);
    return id;
  });
  return { undo: () => removeManualItems(weekStart, ids), title: all.map((i) => i.name).join(", ") };
}

/** „Kartoffeln, Eier“ → Im Haus (ohne Mengen; Grundsachen und Nicht-Essen bleiben draußen) */
function saveImHaus(text: string): { undo: () => void; title: string } | null {
  const before = loadPantryAll();
  const added = addPantryItems(parseShoppingText(text).map((i) => ({ name: i.name })), todayIso());
  if (!added.length) return null;
  unlockFeature("vorrat");
  return { undo: () => replacePantry(before), title: added.join(", ") };
}

/** Speichert, was gelesen wurde; `false` = nichts zu speichern (leer/unverständlich) */
export function saveQuick(read: QuickRead, text: string, request: QuickRequest, remind = true): boolean {
  if (!read.title) return false;
  let saved: { undo: () => void; title: string } | null = null;
  if (read.kind === "termin" || read.kind === "aufgabe") saved = saveEntry(read, remind);
  else if (read.kind === "einkauf") saved = request.shopping ? saveShopping(text, request.shopping.weekStart) : null;
  else if (read.kind === "imhaus") saved = saveImHaus(text);
  else if (read.kind === "notiz") {
    const note = createNote({ title: read.title.slice(0, 80), ...(read.title.length > 80 ? { text: read.title } : {}) });
    saved = { undo: changeNotes((all) => upsertNote(all, note)), title: note.data.title };
  } else {
    const pin = createPin(read.title, request.me ?? "Ich", request.quote ?? null);
    if (pin) saved = { undo: changePins((all) => addPin(all, pin)), title: pin.data.text };
    // Mit Haushalt: Bescheid sagen, wenn jemand antwortet
    if (pin && cloudSync()) askForNotifications("pinnwand");
  }
  if (!saved) return false;
  buzz();
  noteUserAction(todayIso());
  const label = `${VERB[read.kind]}: ${saved.title}`;
  showToast({ text: label, undo: pushUndo(label, saved.undo), undoneText: "Wieder weg", seconds: 4, small: true });
  return true;
}
