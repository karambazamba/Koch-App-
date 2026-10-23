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
  /** local/session = Web Storage; indexeddb = eigene Datenbank (z. B. Ton der Sprachnachrichten) */
  area: "local" | "session" | "indexeddb";
  backup: boolean;
};

export const STORAGE = [
  { key: "familienkueche.haushaltsprofil", what: "Profil: Familie, Begleitung, Vorlieben, Einstellungen", version: 22, migration: "einstellungen/profileStore.ts migrateProfile", area: "local", backup: true },
  { key: "wasgibts.eintraege", what: "Termine und Aufgaben", version: 2, migration: "kalender/store.ts migrate", area: "local", backup: true },
  { key: "wasgibts.notizen", what: "Notizen", version: 1, migration: "notizen/store.ts", area: "local", backup: true },
  { key: "wasgibts.kladde", what: "Schnellnotiz (Schlüssel heißt noch Kladde)", version: 1, migration: "notizen/schnellnotiz.ts", area: "local", backup: true },
  { key: "wasgibts.pinnwand", what: "Pinnwand: Nachrichten und Sprachnachrichten (Einträge; Memos nicht in der Sicherung)", version: 2, migration: "pinnwand/store.ts migratePinStore", area: "local", backup: true },
  { key: "wasgibts-memos", what: "Ton der Sprachnachrichten (IndexedDB, bleibt auf dem Gerät)", version: 1, migration: "pinnwand/memoAudio.ts", area: "indexeddb", backup: false },
  { key: "wasgibts.startseite", what: "Startseite: Kacheln, Reihenfolge, Größen", version: 4, migration: "core/homeLayout.ts migrateHome", area: "local", backup: true },
  { key: "wasgibts.funktionen", what: "Eingeschaltete Bausteine", version: 2, migration: "core/features.ts migrate", area: "local", backup: true },
  { key: "wasgibts.tagesablauf", what: "Tagesablauf: Morgens, Feierabend, Ruhe, Arbeitstage, Kochen", version: 1, migration: "heute/tagesablauf.ts", area: "local", backup: true },
  { key: "wasgibts.sport", what: "Sport: Trainings, Wochenziel, Packlisten", version: 1, migration: "sport/store.ts", area: "local", backup: true },
  { key: "wasgibts.timer", what: "Laufende Timer", version: 1, migration: "timer/store.ts", area: "local", backup: false },
  { key: "wasgibts.kochen", what: "Gerade wird gekocht (Schritte)", version: 1, migration: "essen/kochSession.ts", area: "local", backup: false },
  { key: "wasgibts.wochenplan", what: "Wochenplan (Gerichte je Tag)", version: 3, migration: "essen/mealPlan.ts", area: "local", backup: true },
  { key: "wasgibts.wochenvorgaben", what: "Wochen-Vorgaben (Wochen-Check)", version: 4, migration: "essen/weekPlan.ts", area: "local", backup: true },
  { key: "wasgibts.vorlagen", what: "Lieblingswochen (Vorlagen)", version: 1, migration: "essen/templates.ts", area: "local", backup: true },
  { key: "wasgibts.kochbuch", what: "Rezepte", version: 3, migration: "essen/cookbook.ts", area: "local", backup: true },
  { key: "wasgibts.vorrat", what: "Vorrat: Kühlschrank, Tiefkühler, Schrank", version: 2, migration: "vorrat/pantry.ts migrateStore", area: "local", backup: true },
  { key: "wasgibts.einkaufsliste", what: "Einkaufsliste, Produkte, Läden, Stammliste", version: 4, migration: "einkauf/listMigration.ts migrateStore", area: "local", backup: true },
  { key: "wasgibts.einkaufsansicht", what: "Einkaufsliste: gewählter Chip – Alle oder ein Laden (pro Gerät)", version: 2, migration: "einkauf/shopMode.ts", area: "local", backup: false },
  { key: "wasgibts.eingeraeumt", what: "Vom Einkauf schon in den Vorrat eingeräumt (je Woche, nur Kennungen)", version: 1, migration: "vorrat/einraeumen.ts", area: "local", backup: false },
  { key: "wasgibts.verbrauch", what: "KI-Verbrauch je Tag (nur Zahlen: Anfragen, Modellgröße, Kosten) – Vorbereitung Guthaben", version: 1, migration: "begleitung/usage.ts", area: "local", backup: false },
  { key: "wasgibts.gekocht", what: "Gekochte Tage", version: 1, migration: "essen/mealDone.ts", area: "local", backup: true },
  { key: "wasgibts.wuensche", what: "Wünsche (\"… wünscht sich …\")", version: 1, migration: "essen/wishes.ts", area: "local", backup: true },
  { key: "wasgibts.ideen", what: "Ideen von heute", version: 1, migration: "essen/useIdeas.ts", area: "local", backup: false },
  { key: "wasgibts.tipps", what: "Gezeigte Gesundheits-Tipps je Woche", version: 1, migration: "essen/healthTips.ts", area: "local", backup: false },
  { key: "wasgibts.mails", what: "Mails: Gruß, Signatur, Anrede", version: 1, migration: "begleitung/mailSettings.ts", area: "local", backup: true },
  { key: "wasgibts.vorlesen", what: "Vorlesen: Modus, Stimme, Tempo (pro Gerät)", version: 1, migration: "begleitung/speech.ts migrate", area: "local", backup: true },
  { key: "wasgibts.wetterort", what: "Wetter-Ort", version: 1, migration: "wetter/client.ts", area: "local", backup: true },
  { key: "wasgibts.wetterdaten", what: "Letzte Wetterdaten (offline)", version: 1, area: "local", backup: false },
  { key: "wasgibts.jetzt", what: "Jetzt-Karte: an/aus, heute ausgeblendete Themen, Interesse je Thema, Woche ohne Wochencheck (weekOff, optional)", version: 1, migration: "heute/jetztStore.ts", area: "local", backup: true },
  { key: "wasgibts.regiontipps", what: "Tipps aus der Region: Ort, Umkreis, im Kalender zeigen, gemerkte und übernommene Tipps, Jetzt-Karte am Wochenende aus", version: 1, migration: "tipps/client.ts migrateTipSettings", area: "local", backup: true },
  { key: "wasgibts.spendentopf", what: "Spendentopf: Region, Bescheid geben, Stimme je Jahr, zugesagter Beitrag (keine Zahlung), Beitrags-Frage", version: 1, migration: "spendentopf/store.ts migratePot", area: "local", backup: true },
  { key: "wasgibts.konto", what: "Anmeldung (Sitzung) – nur auf dem Gerät, nie in der Sicherung", area: "local", backup: false },
  { key: "wasgibts.haushalt", what: "Zuletzt bekannter Haushalt (Name, Mitglieder, eigene Rolle) für offline", version: 1, migration: "konten/account.ts", area: "local", backup: false },
  { key: "wasgibts.abgleich", what: "Abgleich mit dem Haushalt: zuletzt abgeglichener Stand je Eintrag (nur Fingerabdrücke), Warteschlange, Übernahme erledigt", version: 1, migration: "konten/sync/engine.ts migrateSyncState", area: "local", backup: false },
  { key: "wasgibts.kalenderabos", what: "Kalender-Links (Abos): Name, geheimer Link, Farbe, Familie/Arbeit, an/aus – nur auf dem Gerät, in der Sicherung nur auf Wunsch", version: 1, migration: "kalender/abo/store.ts", area: "local", backup: false },
  { key: "wasgibts.kalenderabo-termine", what: "Zwischenspeicher der Abo-Termine (nur lesen, wird neu abgerufen)", version: 1, migration: "kalender/abo/store.ts", area: "local", backup: false },
  { key: "wasgibts.mikroprotokoll", what: "Mikro-Protokoll: die letzten 20 Ereignisse rund um Mikrofon und Sprachnachrichten – nur auf dem Gerät, nie in der Sicherung oder an die KI", version: 1, migration: "core/micLog.ts", area: "local", backup: false },
  { key: "wasgibts.einmalhinweise", what: "Einmalige Hinweise (z. B. „+ Kachel“ beim ersten Bearbeiten)", version: 1, migration: "core/hints.ts", area: "local", backup: false },
  { key: "wasgibts.ideenmix", what: "Mehr Ideen: still gelerntes Interesse (Antippen, gezeigt) für die Tages-Mischung", version: 1, migration: "essen/mehrIdeen/store.ts", area: "local", backup: true },
  { key: "wasgibts.kochtipp", what: "Kochidee: Nutzungstage, Knopf freigeschaltet, letzte Wahl, zuletzt gezeigte Gerichte, Erzähltes „im Haus“ (3 Tage)", version: 1, migration: "essen/kochtipp/store.ts", area: "local", backup: true },
  { key: "wasgibts.dunkeltipp", what: "Einmaliger Hinweis auf Dunkel/Automatisch (ab dem 3. Tag)", version: 1, migration: "core/darkTip.ts", area: "local", backup: false },
  { key: "wasgibts.beispiel", what: "Beispiel-Tag beim ersten Start (seit wann, geleerte Kacheln, Abgehaktes)", version: 1, migration: "core/demo.ts", area: "local", backup: false },
  { key: "wasgibts.willkommen", what: "Ergebnis des ersten Starts (wobei helfen)", version: 1, migration: "einstellungen/welcomeStore.ts (Zwischenstand bis v0.26 wird verworfen)", area: "local", backup: false },
  { key: "wasgibts.aktivitaet", what: "Zuletzt geöffnet, eigenes Tun", version: 1, migration: "core/activity.ts", area: "local", backup: false },
  { key: "wasgibts.chatnutzung", what: "Wie oft gechattet (Beispiel-Chips)", version: 1, migration: "begleitung/chatSuggestions.ts", area: "local", backup: false },
  { key: "wasgibts.maschinenansicht", what: "Thermomix-Ansicht an/aus", area: "local", backup: true },
  { key: "wasgibts.stimmenhinweis", what: "Stimmen-Hinweis schon gezeigt", area: "local", backup: false },
  { key: "wasgibts.avatargruss", what: "Begrüßung des Avatars heute schon gezeigt", area: "local", backup: false },
  { key: "wasgibts.zugangscode", what: "Zugangscode für die KI (pro Gerät)", area: "local", backup: false },
  { key: "wasgibts.lotte.anfragen", what: "KI-Anfragen heute (Tageslimit)", area: "local", backup: false },
  { key: "wasgibts.geraet", what: "Zufällige Geräte-Kennung (Tageslimit)", area: "local", backup: false },
  { key: "wasgibts.verlauf", what: "Zurück-Verlauf und Scrollhöhen", area: "session", backup: false },
  { key: "wasgibts.spontan.filter", what: "Spontan-Filter dieser Sitzung", area: "session", backup: false },
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

const RETIRED_SESSION_KEYS = ["wasgibts.entwicklung", "wasgibts.alleszeigen"] as const;

/** Alte Termine (v0.9) – gelöscht, sobald sie im neuen Modell stehen */
export const OLD_TERMINE_KEY = "wasgibts.termine";

/** Alte Schlüssel, die beim Übernehmen noch einmal gelesen werden */
export type RetiredKey = (typeof RETIRED_KEYS)[number] | typeof OLD_TERMINE_KEY;

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
