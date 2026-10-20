// Verzeichnis ALLER gespeicherten Daten (Vorbereitung für Supabase).
//
// Jeder Schlüssel steht genau einmal hier – mit Version und Ort der
// Migration. `createLocalStore` nimmt nur Schlüssel aus diesem Verzeichnis
// (`StorageKey`), neue Daten also immer zuerst hier eintragen.
// `backup` = gehört in "Daten sichern" (Familien-Daten und Einstellungen,
// nicht Zwischenspeicher, Zähler oder der Zugangscode).

type StorageDef = {
  key: string;
  /** Wofür (kurz, für Menschen) */
  what: string;
  /** Aktuelle Version des gespeicherten Formats (ohne = einfacher Wert) */
  version?: number;
  /** Wo die Migration älterer Versionen steht */
  migration?: string;
  area: "local" | "session";
  backup: boolean;
};

export const STORAGE = [
  { key: "familienkueche.haushaltsprofil", what: "Profil: Familie, Begleitung, Vorlieben, Einstellungen", version: 19, migration: "einstellungen/profile.ts migrateProfile", area: "local", backup: true },
  { key: "wasgibts.eintraege", what: "Termine und Aufgaben", version: 2, migration: "aufgaben/store.ts migrate", area: "local", backup: true },
  { key: "wasgibts.notizen", what: "Notizen", version: 1, migration: "notizen/store.ts", area: "local", backup: true },
  { key: "wasgibts.kladde", what: "Schnellnotiz (Schlüssel heißt noch Kladde)", version: 1, migration: "notizen/schnellnotiz.ts", area: "local", backup: true },
  { key: "wasgibts.pinnwand", what: "Pinnwand", version: 1, migration: "pinnwand/store.ts", area: "local", backup: true },
  { key: "wasgibts.startseite", what: "Startseite: Kacheln, Reihenfolge, Größen", version: 3, migration: "core/homeLayout.ts migrateHome", area: "local", backup: true },
  { key: "wasgibts.funktionen", what: "Eingeschaltete Bausteine", version: 2, migration: "core/features.ts migrate", area: "local", backup: true },
  { key: "wasgibts.tagesablauf", what: "Tagesablauf: Mitdenkend/Immer gleich, Feierabend", version: 1, migration: "tagesablauf/settings.ts", area: "local", backup: true },
  { key: "wasgibts.sport", what: "Sport: Trainings, Wochenziel, Packlisten", version: 1, migration: "sport/store.ts", area: "local", backup: true },
  { key: "wasgibts.timer", what: "Laufende Timer", version: 1, migration: "timer/store.ts", area: "local", backup: false },
  { key: "wasgibts.kochen", what: "Gerade wird gekocht (Schritte)", version: 1, migration: "kochen/session.ts", area: "local", backup: false },
  { key: "wasgibts.wochenplan", what: "Wochenplan (Gerichte je Tag)", version: 3, migration: "essen/mealPlan.ts", area: "local", backup: true },
  { key: "wasgibts.wochenvorgaben", what: "Wochen-Vorgaben (Wochen-Check)", version: 4, migration: "essen/weekPlan.ts", area: "local", backup: true },
  { key: "wasgibts.vorlagen", what: "Lieblingswochen (Vorlagen)", version: 1, migration: "essen/templates.ts", area: "local", backup: true },
  { key: "wasgibts.kochbuch", what: "Rezepte", version: 3, migration: "essen/cookbook.ts", area: "local", backup: true },
  { key: "wasgibts.vorrat", what: "Vorrat: Kühlschrank, Tiefkühler, Schrank", version: 2, migration: "essen/pantry.ts migrateStore", area: "local", backup: true },
  { key: "wasgibts.einkaufsliste", what: "Einkaufsliste, Produkte, Läden, Stammliste", version: 4, migration: "einkauf/shoppingList.ts migrateStore", area: "local", backup: true },
  { key: "wasgibts.gekocht", what: "Gekochte Tage", version: 1, migration: "essen/mealDone.ts", area: "local", backup: true },
  { key: "wasgibts.wuensche", what: "Wünsche (\"… wünscht sich …\")", version: 1, migration: "essen/wishes.ts", area: "local", backup: true },
  { key: "wasgibts.ideen", what: "Ideen von heute", version: 1, migration: "essen/useIdeas.ts", area: "local", backup: false },
  { key: "wasgibts.tipps", what: "Gezeigte Gesundheits-Tipps je Woche", version: 1, migration: "essen/healthTips.ts", area: "local", backup: false },
  { key: "wasgibts.mails", what: "Mails: Gruß, Signatur, Anrede", version: 1, migration: "lotte/mailSettings.ts", area: "local", backup: true },
  { key: "wasgibts.vorlesen", what: "Vorlesen: Modus, Stimme, Tempo (pro Gerät)", version: 1, migration: "lotte/speech.ts migrate", area: "local", backup: true },
  { key: "wasgibts.wetterort", what: "Wetter-Ort", version: 1, migration: "wetter/client.ts", area: "local", backup: true },
  { key: "wasgibts.wetterdaten", what: "Letzte Wetterdaten (offline)", version: 1, area: "local", backup: false },
  { key: "wasgibts.willkommen", what: "Zwischenstand des Kennenlernens", version: 1, migration: "einstellungen/welcomeStore.ts migrateWelcome", area: "local", backup: false },
  { key: "wasgibts.aktivitaet", what: "Zuletzt geöffnet, eigenes Tun", version: 1, migration: "core/activity.ts", area: "local", backup: false },
  { key: "wasgibts.chatnutzung", what: "Wie oft gechattet (Beispiel-Chips)", version: 1, migration: "lotte/chatSuggestions.ts", area: "local", backup: false },
  { key: "wasgibts.maschinenansicht", what: "Thermomix-Ansicht an/aus", area: "local", backup: true },
  { key: "wasgibts.stimmenhinweis", what: "Stimmen-Hinweis schon gezeigt", area: "local", backup: false },
  { key: "wasgibts.avatargruss", what: "Begrüßung des Avatars heute schon gezeigt", area: "local", backup: false },
  { key: "wasgibts.zugangscode", what: "Zugangscode für die KI (pro Gerät)", area: "local", backup: false },
  { key: "wasgibts.lotte.anfragen", what: "KI-Anfragen heute (Tageslimit)", area: "local", backup: false },
  { key: "wasgibts.geraet", what: "Zufällige Geräte-Kennung (Tageslimit)", area: "local", backup: false },
  { key: "wasgibts.verlauf", what: "Zurück-Verlauf und Scrollhöhen", area: "session", backup: false },
  { key: "wasgibts.spontan.filter", what: "Spontan-Filter dieser Sitzung", area: "session", backup: false },
  { key: "wasgibts.alleszeigen", what: "\"Alles zeigen\" bis zum nächsten Phasenwechsel", area: "session", backup: false },
  { key: "wasgibts.zeitvorschau", what: "Zeit-Vorschau der Startseite", area: "session", backup: false },
  { key: "wasgibts.wetterszenario", what: "Wetter-Testmodus", area: "session", backup: false },
] as const satisfies readonly StorageDef[];

export type StorageKey = (typeof STORAGE)[number]["key"];

/**
 * Nicht mehr genutzte Schlüssel. Ihre Daten sind übernommen (oder gehörten zu
 * entfernten Funktionen) – sie werden beim Start einmal gelöscht.
 * `wasgibts.termine` erst, nachdem die alten Termine übernommen wurden.
 */
const RETIRED_KEYS = [
  "wasgibts.bewertungen",
  "wasgibts.hinweise",
  "wasgibts.kennenlernen",
  "wasgibts.twists",
  "wasgibts.wetter",
  "wasgibts.tippkarten",
  "wasgibts.kuechenhelfer.vorlesen",
] as const;

const RETIRED_SESSION_KEYS = ["wasgibts.entwicklung"] as const;

/** Alte Termine (v0.9) – gelöscht, sobald sie im neuen Modell stehen */
export const OLD_TERMINE_KEY = "wasgibts.termine";

/** Nicht mehr genutzte Schlüssel löschen (Fehler beim Speicher still übergehen) */
export function removeRetiredKeys(storage: Pick<Storage, "removeItem">, session?: Pick<Storage, "removeItem">) {
  try {
    for (const k of RETIRED_KEYS) storage.removeItem(k);
    for (const k of RETIRED_SESSION_KEYS) session?.removeItem(k);
  } catch {
    // ohne Speicher nichts zu tun
  }
}

/** Schlüssel, die in "Daten sichern" landen */
export const BACKUP_KEYS: StorageKey[] = STORAGE.filter((s) => s.backup).map((s) => s.key);
