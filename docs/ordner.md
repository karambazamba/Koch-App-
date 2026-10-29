# Ordner (aus CLAUDE.md umgezogen)

Gleiche Bereichsnamen in `src/lib/<bereich>` (Logik, rein wo möglich),
`src/components/<bereich>` (Oberfläche) und `tests/<bereich>`:

| Bereich | Inhalt |
|---|---|
| `heute` | Startseite, Kacheln, Bearbeiten, Jetzt-Karte, Tagesphasen |
| `kalender` | Termine, Aufgaben, Kalender- und Tag-Seite, Eintragen |
| `essen` | Essen-Reiter, Wochenplan (`essen/plan`), Rezepte (`essen/rezepte`), Ideen, Bilder, Kochmodus |
| `einkauf` | Einkaufsliste, Läden, Stammartikel |
| `vorrat` | „Im Haus“: was da ist (ohne Mengen), Orte, vergisst von selbst |
| `pinnwand` | Kühlschranktür: Zettel, Fotos, Sprachnachrichten, Archiv, Fächer-Kachel |
| `notizen` | Notizen (jede Schnellnotiz eine eigene), Bearbeiten im Vollbild |
| `wetter` | Wetter-Server, Kachel, Seite |
| `sport` | Trainings, Wochenziel |
| `timer` | Timer, Stoppuhr |
| `tipps` | Tipps aus der Region |
| `spendentopf` | Spendentopf |
| `durchatmen` | Durchatmen: 12 Übungen (`content/durchatmen/`), Fenster, Vollbild, Stimme und Klang, leises Angebot |
| `wundertuete` | Mias Wundertüte: Kachel mit Wissen, Platt, Rätseln und Tischspielen, Pool je Sorte (`data/`) |
| `begleitung` | Chat, KI-Route, Werkzeuge, Sprache, Avatar, Hallo-Bildschirm |
| `einstellungen` | Profil, Einstellungen, Mehr Funktionen |
| `konten` | Konto, Haushalt, Einladen (Supabase), Datenbank-Tests (`tests/datenbank`) |
| `mails` | Mails an Mia: Eingang (Webhook), Vorschläge, Absender lernen |
| `core` | Speicher, Sicherung, Zeit, Navigation, Toast/Rückgängig, Sortieren, Bausteine |
| `ui` | Bausteine der Oberfläche (`styles.ts`, `Sheet`, `PageHeader` …) |

Importe nur über `@/…`. Die Begleitung heißt im Code neutral
(`BegleitungAvatar`, `BegleitungBar`, `BegleitungTool`, `begleitungPush`);
`/api/lotte`, Speicher-Schlüssel, Op- und Werkzeugnamen und die Umgebungs-
variablen `LOTTE_*` bleiben. Alte Adressen leiten in `next.config.ts`
(`OLD_PAGES`) weiter.
