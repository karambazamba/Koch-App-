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
import { ladenMerken, rememberedShop } from "@/lib/einkauf/meineLaeden";
import { changeNotes, noteFromText, upsertNote } from "@/lib/notizen";
import { addPin, changePins, createPin } from "@/lib/pinnwand";
import { noteUserAction } from "@/lib/core/activity";
import { buzz } from "@/components/heute/actions";
import { loadNotify } from "@/lib/heute/mitteilungen/einstellungen";
import { askForNotifications } from "@/lib/heute/mitteilungen/geraet";
import { cloudSync } from "@/lib/konten/cache";
import { addPantryItems, consumePantry, loadPantryAll, replacePantry } from "@/lib/vorrat/pantry";
import { imHausVerstehen } from "@/lib/vorrat/reinsprechen";
import { unlockFeature } from "@/lib/core/features";
import { readQuick } from "@/lib/core/schnelleingabe";
import { splitTermine } from "@/lib/kalender/sentence";

const VERB: Record<QuickRead["kind"], string> = { termin: "Eingetragen", aufgabe: "Eingetragen", einkauf: "Auf der Liste", notiz: "Notiert", pinnwand: "Hängt", imhaus: "Im Haus" };

function saveEntry(read: Extract<QuickRead, { kind: "termin" | "aufgabe" }>, remind: boolean): { undo: () => void; title: string } | null {
  const today = todayIso();
  const standard = loadNotify().defaultReminder;
  const data =
    read.kind === "termin"
      ? { title: read.title.slice(0, 120), date: read.date, start: read.time ?? "", reminder: read.time && remind ? standard : "aus", repeat: read.repeat, ...(read.label ? { label: read.label } : {}) }
      : quickTaskData(read.title, read.when ?? "heute", today, { time: read.time, label: read.label, dringend: read.urgent, reminder: read.time && remind && standard !== "aus" ? "30" : "aus" });
  const entry = sanitizeEntry(createEntry(read.kind, data, { raum: read.room }) as CalendarEntry);
  if (!entry) return null;
  const undo = changeEntries((list) => upsertEntry(list, entry));
  // Termin mit Uhrzeit: der passende Moment für Mias Frage nach Erinnerungen
  if (read.kind === "termin" && read.time && remind) askForNotifications("erster-termin");
  return { undo, title: entry.data.title };
}

/** Laden je Artikel: im Satz genannt → von Hand gewählt → gemerkt → offener Reiter; nichts = „noch ohne Laden“, „Egal wo“ nur bewusst */
function saveShopping(text: string, weekStart: string, choice: { shop?: string; picked?: boolean } = {}): { undo: () => void; title: string } | null {
  const settings = loadShoppingSettings();
  const { items, unsure } = parseQuickAdd(text, settings);
  // Unsicheres kommt so auf die Liste, wie es getippt wurde – ändern geht dort
  const all = [...items, ...unsure.map((u) => ({ name: u.name, amount: u.amount, shop: u.shop }))];
  if (!all.length) return null;
  const ids = all.map((i) => {
    const id = addManualItem(weekStart, { name: i.name, amount: i.amount, section: sectionFor(i.name) });
    const name = settings.products[i.name.toLowerCase()] ?? i.name;
    const remembered = rememberedShop(i.name, settings.itemShops, settings.products);
    const shop = i.shop || (choice.picked ? (choice.shop ?? "") : remembered || (choice.shop ?? ""));
    if (ladenMerken({ name: i.name, shop, picked: Boolean(choice.picked) && !i.shop, itemShops: settings.itemShops, products: settings.products })) setItemShop(name, shop);
    return id;
  });
  return { undo: () => removeManualItems(weekStart, ids), title: all.map((i) => i.name).join(", ") };
}

/**
 * „Kartoffeln, Eier“ → Im Haus (ohne Mengen; Grundsachen und Nicht-Essen
 * bleiben draußen). Derselbe Versteher wie beim Reinsprechen: „Zucchini gar
 * nicht im Haus“ nimmt Zucchini raus und wird nie selbst zur Sache (Tafel 102).
 */
function saveImHaus(text: string): { undo: () => void; title: string } | null {
  const before = loadPantryAll();
  const v = imHausVerstehen(text);
  const added = addPantryItems(v.rein.map((name) => ({ name })), todayIso());
  const used = consumePantry(v.raus, todayIso());
  if (!added.length && !used.length) return null;
  if (!added.length) return { undo: () => replacePantry(before), title: `${used.join(", ")} raus` };
  unlockFeature("vorrat");
  return { undo: () => replacePantry(before), title: added.join(", ") };
}

/** Speichert, was gelesen wurde; `false` = nichts zu speichern (leer/unverständlich) */
export function saveQuick(read: QuickRead, text: string, request: QuickRequest, remind = true): boolean {
  if (!read.title) return false;
  let saved: { undo: () => void; title: string } | null = null;
  // Mehrere Termine in einem Satz: jeder wird ein eigener Termin (ein Rückgängig für alle)
  const teile = read.kind === "termin" ? splitTermine(text, todayIso()) : [];
  if (teile.length > 1) {
    const all = teile.map((t) => readQuick("termin", t, todayIso())).flatMap((r) => (r.kind === "termin" && r.title ? [saveEntry(r, remind)] : [])).filter((x): x is NonNullable<typeof x> => x !== null);
    saved = all.length ? { undo: () => all.forEach((x) => x.undo()), title: all.map((x) => x.title).join(", ") } : null;
  } else if (read.kind === "termin" || read.kind === "aufgabe") saved = saveEntry(read, remind);
  else if (read.kind === "einkauf") saved = request.shopping ? saveShopping(text, request.shopping.weekStart, request.shopping) : null;
  else if (read.kind === "imhaus") saved = saveImHaus(text);
  else if (read.kind === "notiz") {
    // Eigene Notiz: erste Zeile = Titel, der Rest = Text (mit Absätzen)
    const note = noteFromText(read.title);
    if (note) saved = { undo: changeNotes((all) => upsertNote(all, note)), title: note.data.title };
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
