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
  { key: "wasgibts.eintraege", what: "Termine und Aufgaben (v3: „Irgendwann“/„Diese Woche“ still auf heute bzw. den Tag)", version: 3, migration: "kalender/store.ts migrate", area: "local", backup: true },
  { key: "wasgibts.notizen", what: "Notizen", version: 2, migration: "notizen/store.ts", area: "local", backup: true },
  { key: "wasgibts.kladde", what: "Schnellnotiz (Schlüssel heißt noch Kladde)", version: 1, migration: "notizen/schnellnotiz.ts", area: "local", backup: true },
  { key: "wasgibts.pinnwand", what: "Pinnwand (Kühlschranktür): Zettel, Fotos (nur der Eintrag) und Sprachnachrichten (Einträge; Memos nicht in der Sicherung), Farbe, Papier, Erledigt, Archiv, Reaktionen je Person, Antworten mit Zitat", version: 4, migration: "pinnwand/store.ts migratePinStore", area: "local", backup: true },
  { key: "wasgibts-fotos", what: "Bilder der Foto-Zettel (IndexedDB, verkleinert auf 1600 px; mit Konto zusätzlich im Haushalt, Bucket „fotos“)", version: 1, migration: "pinnwand/fotoStore.ts", area: "indexeddb", backup: false },
  { key: "wasgibts-memos", what: "Ton der Sprachnachrichten (IndexedDB; mit Konto zusätzlich im Haushalt, Bucket „memos“)", version: 1, migration: "pinnwand/memoAudio.ts", area: "indexeddb", backup: false },
  { key: "wasgibts.startseite", what: "Startseite: Kacheln, Reihenfolge, Größen, Farben", version: 8, migration: "core/homeLayout.ts migrateHome", area: "local", backup: true },
  { key: "wasgibts.funktionen", what: "Eingeschaltete Bausteine (+ Übernahme Launch 1.0, Im Haus, Pinnwand)", version: 6, migration: "core/features.ts migrate", area: "local", backup: true },
  { key: "wasgibts.tagesablauf", what: "Tagesablauf: Morgens, Feierabend, Ruhe, Arbeitstage, Kochen", version: 1, migration: "heute/tagesablauf.ts", area: "local", backup: true },
  { key: "wasgibts.sport", what: "Sport: Trainings, Wochenziel, Packlisten", version: 1, migration: "sport/store.ts", area: "local", backup: true },
  { key: "wasgibts.timer", what: "Laufende Timer", version: 1, migration: "timer/store.ts", area: "local", backup: false },
  { key: "wasgibts.kochen", what: "Gerade wird gekocht: Schritte, Kochmodus-Stand, abgehakte Zutaten (nur heute)", version: 2, migration: "essen/kochSession.ts", area: "local", backup: false },
  { key: "wasgibts.wochenplan", what: "Wochenplan (Gerichte je Tag)", version: 3, migration: "essen/mealPlan.ts", area: "local", backup: true },
  { key: "wasgibts.wochenvorgaben", what: "Wochen-Vorgaben (Wochen-Check)", version: 4, migration: "essen/weekPlan.ts", area: "local", backup: true },
  { key: "wasgibts.vorlagen", what: "Lieblingswochen (Vorlagen)", version: 1, migration: "essen/templates.ts", area: "local", backup: true },
  { key: "wasgibts.kochbuch", what: "Rezepte", version: 3, migration: "essen/cookbook.ts", area: "local", backup: true },
  { key: "wasgibts.vorrat", what: "Im Haus: was da ist (ohne Mengen), Gruppen Kühlschrank/Vorrat/Obst & Gemüse/Brot/Tiefkühl, aufgebraucht, gemerkte Orte je Sorte", version: 4, migration: "vorrat/pantry.ts migratePantry", area: "local", backup: true },
  { key: "wasgibts.einkaufsliste", what: "Einkaufsliste (Doppeltes zusammengefasst, „Einkauf fertig“), Produkte, Läden, Meine Läden, feste Laden-Regeln, Gelerntes, Stammliste", version: 7, migration: "einkauf/listMigration.ts migrateStore", area: "local", backup: true },
  { key: "wasgibts.essenansicht", what: "Essen: die nächsten 7 Tage als Liste oder Reihe (pro Gerät)", version: 1, migration: "essen/sieben/ansicht.ts", area: "local", backup: false },
  { key: "wasgibts.rezeptansicht", what: "Rezept „So geht’s“: Kurz oder Ausführlich (pro Gerät)", version: 1, migration: "essen/kurz/ansicht.ts", area: "local", backup: false },
  { key: "wasgibts.einkaufsansicht", what: "Einkauf: zuletzt gewählter Laden in „Aussuchen“ (pro Gerät; früher der Chip der Liste, gleiches Format)", version: 2, migration: "einkauf/shopMode.ts", area: "local", backup: false },
  { key: "wasgibts.einkaufswege", what: "Einkauf unterwegs: wer gerade wo einkauft (im Haushalt geteilt, 2 Tage)", version: 1, migration: "einkauf/unterwegs/unterwegs.ts migrateTrips", area: "local", backup: false },
  { key: "wasgibts.einkaufbescheid", what: "Familie beim Einkaufen Bescheid sagen: Antwort und laufender Einkauf (pro Gerät)", version: 1, migration: "einkauf/unterwegs/unterwegs.ts migrateBescheid", area: "local", backup: false },
  { key: "wasgibts.verbrauch", what: "KI-Verbrauch je Tag (nur Zahlen: Anfragen, Modellgröße, Kosten) – Vorbereitung Guthaben", version: 1, migration: "begleitung/usage.ts", area: "local", backup: false },
  { key: "wasgibts.gekocht", what: "Gekochte Tage", version: 1, migration: "essen/mealDone.ts", area: "local", backup: true },
  { key: "wasgibts.wuensche", what: "Wünsche (\"… wünscht sich …\")", version: 1, migration: "essen/wishes.ts", area: "local", backup: true },
  { key: "wasgibts.ideen", what: "Ideen von heute", version: 1, migration: "essen/useIdeas.ts", area: "local", backup: false },
  { key: "wasgibts.ideengezeigt", what: "Wann eine Essens-Idee zuletzt gezeigt wurde (für mehr Abwechslung, 30 Tage)", version: 1, migration: "essen/ideenGezeigt.ts", area: "local", backup: false },
  { key: "wasgibts.tipps", what: "Gezeigte Gesundheits-Tipps je Woche", version: 1, migration: "essen/healthTips.ts", area: "local", backup: false },
  { key: "wasgibts.einwilligungen", what: "Einwilligungen dieser Person: KI darf mitdenken, Bedingungen, Mails weiterleiten (ja/nein, Textfassung, Zeitpunkt) – pro Gerät, nicht in der Sicherung; mit Konto zusätzlich auf dem Server", version: 1, migration: "datenschutz/einwilligung.ts", area: "local", backup: false },
  { key: "wasgibts.mails", what: "Mails: Gruß, Signatur, Anrede", version: 1, migration: "begleitung/mailSettings.ts", area: "local", backup: true },
  { key: "wasgibts.vorlesen", what: "Vorlesen: Modus, Stimme, Tempo (pro Gerät)", version: 1, migration: "begleitung/speech.ts migrate", area: "local", backup: true },
  { key: "wasgibts.wetterort", what: "Wetter-Ort", version: 1, migration: "wetter/client.ts", area: "local", backup: true },
  { key: "wasgibts.wetterdaten", what: "Letzte Wetterdaten (offline)", version: 1, area: "local", backup: false },
  { key: "wasgibts.jetzt", what: "Jetzt-Karte: an/aus, heute ausgeblendete Themen, Interesse je Thema, Woche ohne Wochencheck (weekOff, optional)", version: 1, migration: "heute/jetztStore.ts", area: "local", backup: true },
  { key: "wasgibts.regiontipps", what: "Tipps aus der Region: Ort, Umkreis, im Kalender zeigen, gemerkte und übernommene Tipps, Jetzt-Karte am Wochenende aus", version: 1, migration: "tipps/client.ts migrateTipSettings", area: "local", backup: true },
  { key: "wasgibts.spendentopf", what: "Spendentopf: Region, Bescheid geben, Stimme je Jahr, vorgemerkter bzw. zugesagter Beitrag (keine Zahlung; mit Konto für den Haushalt geteilt), Beitrags-Frage", version: 2, migration: "spendentopf/store.ts migratePot", area: "local", backup: true },
  { key: "wasgibts.konto", what: "Anmeldung (Sitzung) – nur auf dem Gerät, nie in der Sicherung", area: "local", backup: false },
  { key: "wasgibts.konto-pkce", what: "Anmelden mit Apple/Google: Prüfwert bis zur Rückkehr (PKCE) – nur kurz auf dem Gerät", area: "local", backup: false },
  { key: "wasgibts.anmelden-zurueck", what: "Anmelden mit Apple/Google: wohin nach der Rückkehr (z. B. Einladung)", area: "session", backup: false },
  { key: "wasgibts.haushalt", what: "Zuletzt bekannter Haushalt (Name, Mitglieder, eigene Rolle) für offline", version: 1, migration: "konten/account.ts", area: "local", backup: false },
  { key: "wasgibts.abgleich", what: "Abgleich mit dem Haushalt: zuletzt abgeglichener Stand je Eintrag (nur Fingerabdrücke), Warteschlange, Übernahme erledigt", version: 1, migration: "konten/sync/engine.ts migrateSyncState", area: "local", backup: false },
  { key: "wasgibts.mitteilungen", what: "Mitteilungen auf diesem Gerät: Standard-Erinnerung, Schalter je Art, Mias Frage (ja/nein, wann), schon gemeldete Erinnerungen", version: 1, migration: "heute/mitteilungen/einstellungen.ts migrateNotify", area: "local", backup: false },
  { key: "wasgibts.miaknopf", what: "Runder Knopf der Begleitung links (Linkshänder) – pro Gerät", version: 1, migration: "mia/knopf.ts migrateKnopf", area: "local", backup: false },
  { key: "wasgibts.miareaktion", what: "Wie oft sich die Begleitung heute groß gefreut hat (höchstens 3×)", version: 1, migration: "mia/reaktion.ts", area: "local", backup: false },
  { key: "wasgibts.miadenkt", what: "Die Begleitung denkt mit: wie gesprächig, vorgestellte Kacheln (Später), besuchte Seiten, Antworten auf Muster-Fragen (Ja/Nein), Essens-Rituale, Hinweise je Tag (7 Tage), Sprüche (30 Tage)", version: 1, migration: "mia/denktmit/store.ts migrateDenkt", area: "local", backup: true },
  { key: "wasgibts.miafragen", what: "Beantwortete Fragen der Begleitung (Überschneidung, Packliste) – nie zweimal fragen", version: 1, migration: "mia/fragen.ts", area: "local", backup: false },
  { key: "wasgibts.neu", what: "Leise Neuigkeiten aus dem Haushalt für die Jetzt-Karte (wer was eingetragen hat, jede nur einmal)", version: 1, migration: "konten/wer.ts migrateNews", area: "local", backup: false },
  { key: "wasgibts.kuehlcheck", what: "Kurz-Check „Im Haus“: Woche (Sonntag), in der er erledigt bzw. „Heute nicht“ ist – pro Gerät", version: 1, migration: "vorrat/kuehlcheck.ts migrateKuehlCheck", area: "local", backup: false },
  { key: "wasgibts.aufgabenvorschlag", what: "Aufgaben-Vorschlag „Drei für heute?“ aus den Listen: Woche, in der er nicht mehr kommt – pro Gerät", version: 1, migration: "kalender/liste/vorschlag.ts migrateVorschlag", area: "local", backup: false },
  { key: "wasgibts.aufgabenfilter", what: "Aufgaben: gewählter Filter Alle · Familie · Arbeit – pro Gerät", version: 1, migration: "kalender/aufgabenFilter.ts migrateAufgabenFilter", area: "local", backup: false },
  { key: "wasgibts.einladenhinweis", what: "Karte „Familie einladen“ auf der Startseite: wann „Später“ getippt – pro Gerät", version: 1, migration: "konten/einladenHinweis.ts migrateEinladen", area: "local", backup: false },
  { key: "wasgibts.kalenderangebot", what: "„Kalender mitbringen“: später gesagt (Tage), erledigt – pro Gerät", version: 1, migration: "kalender/mitbringen/angebot.ts migrateAngebot", area: "local", backup: false },
  { key: "wasgibts.kalenderabos", what: "Kalender-Links (Abos): Name, geheimer Link, Farbe, Familie/Arbeit, an/aus – nur auf dem Gerät, in der Sicherung nur auf Wunsch", version: 1, migration: "kalender/abo/store.ts", area: "local", backup: false },
  { key: "wasgibts.kalenderabo-termine", what: "Zwischenspeicher der Abo-Termine (nur lesen, wird neu abgerufen)", version: 1, migration: "kalender/abo/store.ts", area: "local", backup: false },
  { key: "wasgibts.stimmen", what: "Gute Stimmen, die das Gerät schon hatte (für „Neue Stimme gefunden: … Nehmen?“) – pro Gerät", version: 1, migration: "begleitung/stimmenStore.ts migrateStimmen", area: "local", backup: false },
  { key: "wasgibts.tempo", what: "Tempo der Gespräche mit der Begleitung: die letzten 20 Messungen, nur Zahlen in ms (Stille, Server, erstes Wort, erster Satz, fertig) – nur auf dem Gerät, nie in der Sicherung oder an die KI", version: 1, migration: "begleitung/tempo.ts migrateTempo", area: "local", backup: false },
  { key: "wasgibts.mikroprotokoll", what: "Mikro-Protokoll: die letzten 20 Ereignisse rund um Mikrofon und Sprachnachrichten – nur auf dem Gerät, nie in der Sicherung oder an die KI", version: 1, migration: "core/micLog.ts", area: "local", backup: false },
  { key: "wasgibts.einmalhinweise", what: "Einmalige Hinweise (z. B. „+ Kachel“ beim ersten Bearbeiten)", version: 1, migration: "core/hints.ts", area: "local", backup: false },
  { key: "wasgibts.ideenmix", what: "Mehr Ideen: still gelerntes Interesse (Antippen, gezeigt) für die Tages-Mischung", version: 1, migration: "essen/mehrIdeen/store.ts", area: "local", backup: true },
  { key: "wasgibts.kochtipp", what: "Kochidee: Nutzungstage, Knopf freigeschaltet, letzte Wahl, zuletzt gezeigte Gerichte, Erzähltes „im Haus“ (3 Tage)", version: 1, migration: "essen/kochtipp/store.ts", area: "local", backup: true },
  { key: "wasgibts.hinweise", what: "Hinweise der Startseite: an welchem Tag zuerst gezeigt (ab dem nächsten Tag weg)", version: 1, migration: "core/hinweise.ts", area: "local", backup: false },
  { key: "wasgibts.dunkeltipp", what: "Einmaliger Hinweis auf Dunkel/Automatisch (ab dem 3. Tag)", version: 1, migration: "core/darkTip.ts", area: "local", backup: false },
  { key: "wasgibts.homebildschirm", what: "Karte „Auf den Home-Bildschirm“: wie oft „Später“, wann zuletzt, installiert (nur dieser Browser)", version: 1, migration: "core/homeBildschirm.ts", area: "local", backup: false },
  { key: "wasgibts.beispiel", what: "Beispiel-Tag beim ersten Start (seit wann, geleerte Kacheln, Abgehaktes)", version: 1, migration: "core/demo.ts", area: "local", backup: false },
  { key: "wasgibts.willkommen", what: "Ergebnis des ersten Starts (wobei helfen)", version: 1, migration: "einstellungen/welcomeStore.ts (Zwischenstand bis v0.26 wird verworfen)", area: "local", backup: false },
  { key: "wasgibts.aktivitaet", what: "Zuletzt geöffnet, eigenes Tun", version: 1, migration: "core/activity.ts", area: "local", backup: false },
  { key: "wasgibts.chatnutzung", what: "Wie oft gechattet (Beispiel-Chips)", version: 1, migration: "begleitung/chatSuggestions.ts", area: "local", backup: false },
  { key: "wasgibts.maschinenansicht", what: "Thermomix-Ansicht an/aus", area: "local", backup: true },
  { key: "wasgibts.stimmenhinweis", what: "Stimmen-Hinweis schon gezeigt", area: "local", backup: false },
  { key: "wasgibts.avatargruss", what: "Begrüßung des Avatars heute schon gezeigt", area: "local", backup: false },
  { key: "wasgibts.zugangscode", what: "Zugangscode für die KI (pro Gerät)", area: "local", backup: false },
  { key: "wasgibts.zugangscode.spaeter", what: "Zugangscode-Abfrage auf „Später“ gestellt", area: "local", backup: false },
  { key: "wasgibts.lotte.anfragen", what: "KI-Anfragen heute (Tageslimit)", area: "local", backup: false },
  { key: "wasgibts.mia.erledigt", what: "Was die Begleitung heute still erledigt hat (nur Text und Ort)", version: 1, migration: "begleitung/miaDone.ts", area: "local", backup: false },
  { key: "wasgibts.lotte.nachholen", what: "Offline Gesagtes an die Begleitung, wird nachgeholt, sobald wieder Netz da ist", version: 1, migration: "begleitung/nachholen.ts", area: "local", backup: false },
  { key: "wasgibts.geraet", what: "Zufällige Geräte-Kennung (Tageslimit)", area: "local", backup: false },
  { key: "wasgibts.zuletztweg", what: "Wann die App zuletzt in den Hintergrund ging (nach 5 Minuten öffnet sie wieder auf der Startseite)", area: "local", backup: false },
  { key: "wasgibts.verlauf", what: "Zurück-Verlauf und Scrollhöhen", area: "session", backup: false },
  { key: "wasgibts.reiterwunsch", what: "Leiste: gewählter Bereich, bis die Startseite ihn zeigt", area: "session", backup: false },
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
  // „wasgibts.hinweise“ war hier früher auch eingetragen (alte Hinweise bis v0.101), ist seit v0.102 aber wieder
  // die Hinweis-Warteschlange der Startseite – nie hier eintragen, sonst ginge „jeder Hinweis nur einmal“ bei jedem Start verloren (A-027)
  "wasgibts.kennenlernen",
  "wasgibts.twists",
  "wasgibts.wetter",
  "wasgibts.tippkarten",
  "wasgibts.kuechenhelfer.vorlesen",
  // „Vom Einkauf einräumen“ – seit „Im Haus“ (v0.85) geht Gekauftes von selbst rein
  "wasgibts.eingeraeumt",
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
