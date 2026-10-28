"use client";

// Schnelleingabe speichern (Tafel 76): ein Satz → Eintrag, sofort. Meldet
// sich mit „Notiert: … · Rückgängig“ (auch „Mach das rückgängig“ bei Mia).
// Termine und Aufgaben speichert ihr eigenes Fenster (`kalender/eintragen`).

import { todayIso } from "@/lib/core/now";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import type { QuickRead, QuickRequest } from "@/lib/core/schnelleingabe";
import { parseQuickAdd } from "@/lib/einkauf/quickAdd";
import { addManualItem, loadShoppingSettings, removeManualItems, sectionFor, setItemShop } from "@/lib/einkauf/shoppingList";
import { ladenMerken, rememberedShop } from "@/lib/einkauf/meineLaeden";
import { changeNotes, noteFromText, upsertNote } from "@/lib/notizen";
import { addPin, changePins, createPin } from "@/lib/pinnwand";
import { noteUserAction } from "@/lib/core/activity";
import { buzz } from "@/components/heute/actions";
import { askForNotifications } from "@/lib/heute/mitteilungen/geraet";
import { cloudSync } from "@/lib/konten/cache";
import { addPantryItems, consumePantry, loadPantryAll, replacePantry } from "@/lib/vorrat/pantry";
import { imHausVerstehen } from "@/lib/vorrat/reinsprechen";
import { unlockFeature } from "@/lib/core/features";

const VERB: Record<QuickRead["kind"], string> = { einkauf: "Auf der Liste", notiz: "Notiert", pinnwand: "Hängt", imhaus: "Im Haus" };

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
export function saveQuick(read: QuickRead, text: string, request: QuickRequest): boolean {
  if (!read.title) return false;
  let saved: { undo: () => void; title: string } | null = null;
  if (read.kind === "einkauf") saved = request.shopping ? saveShopping(text, request.shopping.weekStart, request.shopping) : null;
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
