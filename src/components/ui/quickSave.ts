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

const VERB: Record<QuickRead["kind"], string> = { termin: "Eingetragen", aufgabe: "Eingetragen", einkauf: "Auf der Liste", notiz: "Notiert", pinnwand: "Angepinnt" };

function saveEntry(read: Extract<QuickRead, { kind: "termin" | "aufgabe" }>): { undo: () => void; title: string } | null {
  const today = todayIso();
  const data =
    read.kind === "termin"
      ? { title: read.title.slice(0, 120), date: read.date, start: read.time ?? "", reminder: read.time ? "30" : "aus", repeat: read.repeat, ...(read.label ? { label: read.label } : {}) }
      : quickTaskData(read.title, read.when ?? "irgendwann", today, { time: read.time, label: read.label, dringend: read.urgent });
  const entry = sanitizeEntry(createEntry(read.kind, data, { raum: read.room }) as CalendarEntry);
  if (!entry) return null;
  return { undo: changeEntries((list) => upsertEntry(list, entry)), title: entry.data.title };
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

/** Speichert, was gelesen wurde; `false` = nichts zu speichern (leer/unverständlich) */
export function saveQuick(read: QuickRead, text: string, request: QuickRequest): boolean {
  if (!read.title) return false;
  let saved: { undo: () => void; title: string } | null = null;
  if (read.kind === "termin" || read.kind === "aufgabe") saved = saveEntry(read);
  else if (read.kind === "einkauf") saved = request.shopping ? saveShopping(text, request.shopping.weekStart) : null;
  else if (read.kind === "notiz") {
    const note = createNote({ title: read.title.slice(0, 80), ...(read.title.length > 80 ? { text: read.title } : {}) });
    saved = { undo: changeNotes((all) => upsertNote(all, note)), title: note.data.title };
  } else {
    const pin = createPin(read.title, request.me ?? "Ich", request.quote ?? null);
    if (pin) saved = { undo: changePins((all) => addPin(all, pin)), title: pin.data.text };
  }
  if (!saved) return false;
  buzz();
  noteUserAction(todayIso());
  const label = `${VERB[read.kind]}: ${saved.title}`;
  showToast({ text: label, undo: pushUndo(label, saved.undo), undoneText: "Wieder weg", seconds: 4, small: true });
  return true;
}
