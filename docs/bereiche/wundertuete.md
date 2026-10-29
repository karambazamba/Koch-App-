# Mias Wundertüte (mit Rätseln)

## Feste Regeln (A-022, Tafel 116; neu mit A-052, Tafel 137/140)

- **Wundertüte = Witze, Plattdeutsch, Angeberwissen und Rätsel** (seit
  A-064 vierte Sorte; vorher eigener Bereich mit Mini-Kreis und Fenster).
  Die Kachel wechselt die Sorten streng der Reihe nach (Witz · Platt ·
  Wissen · Rätsel; Sorten ohne Ungesehenes fallen aus der Reihe, Anlass-Karten
  kommen innerhalb ihrer Sorte zuerst), nie doppelt. Seite mit Filter Alles ·
  Witze · Platt · Wissen · Rätsel. Gemischt wird in `wundertuete/mischung.ts`;
  die Rätsel behalten ihren eigenen Vorrat (`lib/raetsel`, Paket 001 bleibt
  Quelle, `wasgibts.raetsel` mit „gesehen“ und Mias Nachschub, Abgleich
  unverändert).
  Tischrunde, Schätz mal, Wer zuerst und Heute vor 100 Jahren gibt es nicht
  mehr (Schätz-mal-Fakten wurden Angeberwissen, IDs `sm-…` blieben).
- **Nie doppelt:** jede Karte hat eine feste ID; was der Haushalt gesehen
  hat, kommt nie wieder (mit Konto im Haushalt geteilt, sonst auf dem
  Gerät). „Noch eine ›“ bzw. „Noch eins ›“ geht beliebig oft. Immer zuerst
  Ungesehenes aus dem ältesten Paket.
- **Geprüft statt erfunden:** Plattdeutsch und Angeberwissen NUR aus
  geprüften Paketen, Fakten und Platt-Bedeutungen mit Quelle im Datensatz
  (`quelle`, nie angezeigt). Witze und Rätsel darf Mia per KI nachlegen
  (Haiku über `begleitung/guard.ts`, 20 im Voraus, Ähnlichkeitsabgleich),
  nie Fakten oder Platt. Ohne KI und ohne Vorrat: „Neue Witze kommen bald.“
  bzw. „Neue Rätsel kommen bald.“, niemals eine Wiederholung.
- Kindgerecht, Mia-Ton (trocken, norddeutsch, nie albern), keine
  Gesundheitsratschläge, keine Politik/Religion, nichts über Körper/Gewicht,
  keine Stereotype, kein Emoji, kein Gedankenstrich, typografischer Apostroph.
- Keine Punkte, keine Zähler, keine Streaks.
- Baustein `wundertuete` (`core/features.ts`): für **neue Nutzer an** als
  S-Kachel (`ersteStartseite`); bestehende Nutzer bekommen sie nie von selbst,
  in der Kachel-Auswahl steht sie mit „NEU“. Von Felix gewollte Ausnahme vom
  Feature-Stopp für 1.0.
- **Lösung erst nach Antippen (A-059, Tafel 145):** wie eine Karte zum
  Umdrehen, für alle Sorten und die Rätsel. Kachel vorn nur Sorte und
  Frage/Witz-Anfang/Platt-Wort; Antippen dreht sie um, die Seite öffnet
  nur „Mehr ›“. Auf der Seite und im Rätsel-Fenster ist die Lösung nach
  jeder neuen Karte erst verdeckt. Kachel-Schrift immer in voller Farbe
  (≥ 4,5:1 in allen 8 Kachelfarben), keine Silbentrennung.
- **Nichts abgeschnitten (A-045):** kein sichtbarer Text endet auf „…“ oder
  wird weggeschnitten. Der Text steht in fester Fläche, die Schrift wird
  Stufe für Stufe kleiner, bis alles ganz zu sehen ist (`useEinpassen`); der
  Kopf nimmt die Kurzform („Platt“), auf ganz schmalen Handys nur das
  Symbol. Durchklick `wundertueteAlle` prüft jede Karte.

Kurz: Die Wundertüte versüßt den Tag mit einem Witz, einem plattdeutschen
Wort oder Angeberwissen; die Rätsel sind für die Kinder am Tisch.

## Sorten der Wundertüte

| Sorte | ID | Kachel-Titel | Kleine Sorte | Farbe (Tokens) | Symbol/Wasserzeichen | Unten | Quelle | KI |
|---|---|---|---|---|---|---|---|---|
| Witze | `witz` | Wundertüte | WITZ | Vanille (`notizen`) | Geschenk | „Antippen für die Lösung“ (Pointe hinten) | – | ja |
| Plattdeutsch | `platt` | Platt för Plietsche | – | Mint (`aufgaben`) | Anker | „Antippen für die Lösung“ | Pflicht | nein |
| Angeberwissen | `angeberwissen` | Wundertüte | ANGEBERWISSEN | Flieder (`sport`) | Geschenk | „Antippen für die Lösung“ | Pflicht | nein |

## Wo im Code

- Inhalte: `content/wundertuete/paket-001.json` … (je bis zu 500 Karten,
  `{ paket, eintraege: [{ id, sorte, vorne, hinten, quelle?, anlass? }] }`)
  und `content/raetsel/paket-001.json` … (je bis zu 500,
  `{ id, frage, loesung }`), eingebunden in `src/lib/wundertuete/pakete.ts`
  bzw. `src/lib/raetsel/pakete.ts` (Import über `@/content/…`, Alias in
  `tsconfig.json` und `vitest.config.ts`).
- Gemeinsam „nie doppelt“ (rein): `src/lib/wundertuete/vorrat.ts`
  (`poolAus`, `ungesehen`, `ziehe`, `merke`, `brauchtNachschub`,
  `nachlegen`, `VORRAT_ZIEL` 20, `KI_JE_TAG` 6), Ähnlichkeit `aehnlich.ts`
  (normalisieren + Trigramm-Jaccard, Schwelle 0,4), Nachschub im Speicher
  `nachschub.ts`, Browser `kiHolen.ts` (erst per `import()`), Server
  `kiKarte.ts` (Prompt, strukturierte Antwort, `pruefeKiKarte`, Mock) und
  Route `src/app/api/nachschub/route.ts`.
- Wundertüte: `sorten.ts` (`SORTEN`, `FILTER`, `ANTIPPEN`, `KOMMT_BALD`,
  `teilText`), `pool.ts` (`WT_POOL`, `BEISPIEL_KARTE` = „Kiek mol an“),
  `auswahl.ts` (`passt`, `naechste`, `tageskarte`, `uebrigAusPaketen`,
  `PAKET_NOETIG_AB` 50, `migrateWt`), `lage.ts`, `store.ts` (`useWundertuete`,
  `wtZeigen`, `wtNoch`).
- Rätsel: `src/lib/raetsel/auswahl.ts` (`RT_POOL`, `naechstesRaetsel`,
  `oeffnen`, `loesen`, `hatUngesehenes` (nur intern),
  `raetselStart`, `migrateRaetsel`), `store.ts` (`useRaetsel`,
  `raetselOeffnen`, `raetselLoesen`, `raetselNoch`).
- Oberfläche: Kachel `src/components/wundertuete/WundertueteTile.tsx`, Seite
  `WundertueteSeite.tsx` (`/wundertuete`, aufgedeckt merken
  `lib/wundertuete/aufgedeckt.ts`), Rätsel-Fenster
  `src/components/raetsel/RaetselFenster.tsx`, Entwickler-Zeilen
  `WundertueteNachschub.tsx` (in „Für Entwickler“, dort auch der Test-Öffner
  des Rätsel-Fensters). CSS `.wt-karte`, `.wt-neu` in `globals.css`.
- Abgleich: Übersetzer `wundertuete` und `raetsel` (`vorratAdapter`) in
  `src/lib/konten/sync/docs.ts`.
- Mia: Werkzeug `wundertuete_karte` (`src/lib/begleitung/wundertueteTools.ts`,
  Sorten witz, platt, angeberwissen, raetsel), Prüfstand-Sätze in
  `pruefstand/saetze.ts`.

## Verhalten Wundertüte

- **Kachel (S/M):** Kopf je Sorte, kleine Sorte, vorn groß Wort/Frage/
  Witz-Anfang (möglichst höchstens 2 Zeilen, sonst kleiner; nie getrennt,
  `hyphens: none`), unten „↻ Antippen für die Lösung“. Antippen (ganze
  Kachel, `role="button"`, auch Enter/Leertaste) dreht die Karte um (0,6 s,
  nur transform; reduced-motion: Überblenden; CSS `.wt-dreh`): hinten die
  Frage klein, darunter die Lösung bzw. Pointe im weißen Feld
  (`bg-tile-inner`, Kachel-Akzent), unten rechts „Mehr ›“ (eigene Tippfläche
  ≥ 44 px) = Seite. Nochmal antippen = zurück. Passt hinten nicht alles,
  fällt erst die Frage weg (`data-ohne-frage`), dann die kleine Sorte und
  das Feld wird schmaler (`data-knapp`). Beide Seiten liegen immer in der
  Kachel (die verdeckte `inert`), so prüft `wundertueteAlle` vorn und
  hinten. An einem neuen Tag kommt von selbst die nächste Karte (gilt ab
  dann als gesehen). Alles gesehen: „Neue Wundertüte kommt bald.“
- **Seite /wundertuete:** dieselbe Karte groß; die Lösung („Heißt“,
  „Lösung“, beim Witz „Pointe“) erst verdeckt im gestrichelten Kasten
  („↻ Antippen für die Lösung“), Antippen der Karte deckt auf. Kommt man
  von der umgedrehten Kachel über „Mehr ›“, ist sie schon offen
  (`wundertuete/aufgedeckt.ts`, nur im Speicher der Sitzung). „Noch eine ›“
  vor dem Aufdecken hell (tippbar), danach orange. Filter Alles · Witze ·
  Platt · Wissen (umbrechen statt abschneiden), „Nie doppelt. <Name> legt
  immer neue nach.“, Teilen oben rechts.
- **Auswahl** (fest statt Zufall: gleicher Stand = gleiche Karte auf jedem
  Gerät): 1. eine Karte mit passendem Anlass (Wetter, Jahreszeit,
  Wochentag, Gericht, Feiertag; „Schietwedder“ nur an Regentagen), 2. sonst
  das älteste Paket mit Ungesehenem (Mias Witze danach); nie dieselbe Sorte
  wie eben, sonst die Sorte, von der anteilig am meisten übrig ist (so
  mischen sich die Sorten im Verhältnis des Pakets).
- **Nachschub:** Sind weniger als 20 ungesehene Witze da, legt Mia im
  Hintergrund nach (`/api/nachschub`, je Anfrage bis zu 5, höchstens 6
  Anfragen am Tag je Gerät, Guard: KI-Einwilligung, Zugangscode,
  Tageslimit; Modell `alltagsModell()` aus `begleitung/modellwahl.ts`).
  Jeder Text durch `tidyMiaText()`, streng geprüft (höchstens zwei Sätze,
  Längen, Emoji, heikle Themen), Ähnliches zu Bekanntem fällt weg; kommt
  nichts Brauchbares, genau ein zweiter Versuch.
- **Paket nötig:** unter 50 ungesehenen Platt- bzw. Angeberwissen-Karten
  zeigt „Für Entwickler“ „Plattdeutsch: Paket nötig (n übrig)“ bzw.
  „Angeberwissen: …“ (Monatsauftrag A-039).
- Beispiel-Tag: feste Karte „Was heißt ‚Kiek mol an‘?“, nie gespeichert;
  „Beispiel“ nur für VoiceOver. Antippen leert das Beispiel und dreht die Karte um.

## Rätsel (Sorte der Wundertüte seit A-064)

- Kein eigener Kreis und kein eigenes Fenster mehr (bis v0.171: Mini-Kreis
  „Rätsel“ mit `RaetselFenster`). Rätsel erscheinen auf der Kachel im Wechsel
  mit den anderen Sorten und auf der Seite (Filter „Rätsel“); Lösung wie bei
  allen Sorten erst nach Antippen. Farbe Pfirsich (`data-tone="essen"`),
  Titel „Wundertüte“, Sorte „Rätsel“. Leer: „Neue Rätsel kommen bald.“
- Die aktuelle Karte der Wundertüte merkt sich `raetsel: true`, wenn sie aus
  dem Rätsel-Vorrat kommt (`wasgibts.wundertuete` v2, Feld optional – alte
  Stände bleiben gültig). Gezogene Rätsel gelten im Rätsel-Vorrat als gesehen.
- Mia: „Gib mir ein Rätsel“, „Rätsel!“, „Hast du ein Rätsel für die Kinder?“
  → `app_befehl` „Rätsel“ → Bühne zu, Seite `/wundertuete?sorte=raetsel`
  (`wundertuete/oeffnen.ts`, Gastgeber `begleitung/KitchenHelper`). Ohne KI
  dieselbe Erkennung (`raetselWunsch`). Mia liest keine Rätsel mehr vor.
- Paket 001: die 55 Rätsel der alten Wundertüte (IDs `ra-001` bis `ra-055`)
  und 36 neue, geprüfte (`ra-056` bis `ra-091`) = **91 Rätsel**; den Rest
  legt Mia per KI nach (20 im Voraus).
- Erster Start: Rätsel, die die alte Wundertüte schon gezeigt hat, gelten als
  gesehen (`raetselStart`).

## Daten und Speicher

| Schlüssel | Version | Inhalt | Sicherung |
|---|---|---|---|
| `wasgibts.wundertuete` | v2 | `{ aktuell: { id, tag } \| null, gesehen: id[], eigene: Witz[], ki?: { tag, n } }` | ja |
| `wasgibts.raetsel` | v1 | `{ aktuell: { id, geloest } \| null, gesehen: id[], eigene: Rätsel[], ki?: { tag, n } }` | ja |

- `migrateWt`: v1 (`karte`, `anzeigen`, `zuletzt`, `gezeigt` je Sorte) → v2:
  alles Gezeigte (auch Rätsel, Tischrunde …) und die damalige Karte zählen
  als gesehen. Unbekannte IDs in `gesehen` bleiben (neueres Paket eines
  anderen Geräts), eigene Karten nur als Witz. Alte Sicherung:
  `tests/fixtures/sicherung-v0.156-wundertuete.json`.
- Mit Konto: je gesehene Karte ein Eintrag (`wt:g:<id>` Typ
  `wundertuete-gesehen`, `rt:g:<id>` Typ `raetsel-gesehen`), je von Mia
  nachgelegte Karte einer (`wt:k:…`/`rt:k:…`, Typ `…-karte`), Raum Familie in
  der bestehenden Tabelle `entries` (RLS: nur der eigene Haushalt; keine neue
  Tabelle, keine Migration). `aktuell` und `ki` bleiben auf dem Gerät.

## Zählung (Stand A-052)

| Sorte | Einträge |
|---|---|
| Angeberwissen | 180 (145 `aw-` + 35 `sm-`) |
| Plattdeutsch | 90 |
| Witze | 32 (+ Mias Nachschub) |
| Rätsel | 91 (+ Mias Nachschub) |

Wundertüte: 302 Karten in Paket 001, Rätsel: 91 in Paket 001.

## Nachfüllen (Monats-Auftrag A-039)

- Platt und Angeberwissen (und gern Witze/Rätsel) als neues Paket hinten
  anlegen (`paket-002.json` …, höchstens 500, das bisherige letzte darf
  aufgefüllt werden), dazu EINE Zeile in `pakete.ts`. Spätestens fällig,
  wenn „Für Entwickler“ „Paket nötig“ zeigt.
- Neue IDs hinten anhängen (nächste freie Nummer), nie eine ID ändern,
  löschen oder neu vergeben.
- Jede Zahl und jeden Fakt gegen die Quelle prüfen und ins Feld `quelle`
  schreiben (Behörden, Museen, Fachlexika). Platt nur mit echter Bedeutung
  aus einem Wörterbuch (Sass, INS, Duden „norddeutsch“); ein Beispielsatz
  nur, wenn er aus einer Quelle stammt.
- Vorne höchstens 64 Zeichen (Rätsel 70, Witze 80), Lösung 1–2 Sätze mit
  genau einem `**fetten**` Wort, Witze mit Pointe ohne Fett. Danach `npm
  test` (`pool.test.ts`, `pakete.test.ts`) und Durchklick `wundertueteAlle`.

## Begleitung

- „Erzähl mir was Unnützes“, „Angeberwissen“, „Erzähl mal einen Witz“,
  „Was heißt Schietwedder auf Hochdeutsch?“ → `wundertuete_karte`: Frage,
  dann Antwort; Witz mit Pointe. Mia ändert dabei nichts und merkt nichts
  als gesehen. Rätsel öffnen die Wundertüte mit der Sorte Rätsel (siehe oben).

## Tests

- `tests/wundertuete/pool.test.ts`: IDs, Dubletten (Wundertüte und Rätsel),
  Quelle, Ton, Längen, Fettes, Sorten, Kachel-Texte, Teilen, Beispiel.
- `tests/wundertuete/pakete.test.ts`: Pakete lückenlos, je höchstens 500,
  alle eingebunden, IDs stabil.
- `tests/wundertuete/nieDoppelt.test.ts`: 1.000× „Noch eine ›“ und 1.000×
  „Noch eins ›“ ohne Wiederholung (Mock-KI), KI nur Witze/Rätsel, Filter,
  Paket 2 nahtlos, „kommt bald“, Karte des Tages, Rätsel-Fenster, Paket
  nötig, Migration.
- `tests/wundertuete/nachschub.test.ts`: Ähnlichkeit, Nachlegen (zweiter
  Versuch, gescheitert), ohne KI, Zähler, Route (Mock, 503, Guard, Modell,
  Protokoll), nur Witze und Rätsel.
- `tests/wundertuete/haushalt.test.ts`: zwei Handys im Haushalt teilen
  „gesehen“ (Wundertüte und Rätsel), Mias Karten kommen an, alte Sicherung.
- `tests/wundertuete/baustein.test.ts`: Baustein, Anordnung, Oberfläche, Mia.
- `tests/wundertuete/umdrehen.test.ts` (A-059): Kachel zeigt die Lösung nicht vor dem Tippen, aufgedeckt merken, Seite und Rätsel nach „Noch eine“ verdeckt, Kontrast in allen 8 Kachelfarben (hell und dunkel, auf der Fläche und im weißen Feld).
- `tests/konten/abgleich.test.ts` (Übersetzer verlustfrei),
  `tests/datenbank/sicherheit.test.sql` Abschnitt 8.
- Durchklick `e2e/ablaeufe/wundertuete.mjs`: `wundertuete` (Beispiel,
  Kachel, Seite, „Noch eine“, Filter, Mock-Witze, „kommt bald“,
  Rätsel-Fenster, S/M, Schlicht, Dunkel) und `wundertueteAlle` (jede Karte
  und die Mock-Witze in S und M ganz, iPhone SE mit).
