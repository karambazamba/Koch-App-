# Mias Wundertüte

## Feste Regeln (A-022, Tafel 116)

- Eine Kachel, die jeden Tag anders heißt: sieben Sorten mit eigenem Kopf
  (lucide-Symbol + Name in Großbuchstaben), Farbe aus der Kachel-Palette
  (Tafel 108, über `data-tone` der Sorte) und Hinweis unten links.
- **Geprüft statt erfunden:** alle Inhalte vorab geschrieben, Fakten, Zahlen,
  Jahrestage und Platt-Bedeutungen mit Quelle im Datensatz (`quelle`, nie
  angezeigt). Keine KI-Fakten; Mia liest nur Karten aus dem Pool vor. Im
  Zweifel weglassen.
- Kindgerecht, Mia-Ton (trocken, norddeutsch, nie albern), keine
  Gesundheitsratschläge, keine Politik/Religion, nichts über Körper/Gewicht,
  keine Stereotype, kein Emoji, kein Gedankenstrich, typografischer Apostroph.
- Nie Punkte zum Sammeln, Streaks oder Zähler. Die drei Punkte unten rechts
  zeigen nur, wie oft diese Karte schon da war (1–3), dann kommt die nächste.
- Baustein `wundertuete` (`core/features.ts`): für **neue Nutzer an** als
  S-Kachel direkt hinter Essen + Einkauf (`ersteStartseite`); bestehende
  Nutzer bekommen sie nie von selbst (Anordnung ändert sich nie von selbst),
  in der Kachel-Auswahl steht sie mit „NEU“, in „Mehr Funktionen“ zum
  Einschalten. Von Felix gewollte Ausnahme vom Feature-Stopp für 1.0.

Kurz: Die Wundertüte versüßt den Tag. Tagsüber Angeberwissen, Platt und
Rätsel, ab 17 Uhr (zu zweit/Familie) Tischrunde, Schätz mal und Wer zuerst.

## Sorten

| Sorte | ID | Farbe (Tokens) | Symbol | Wann | Rückseite | Quelle |
|---|---|---|---|---|---|---|
| Angeberwissen | `angeberwissen` | Flieder (`sport`) | Lightbulb | tagsüber | ja | Pflicht |
| Platt för Plietsche | `platt` | Mint (`aufgaben`) | Anchor | tagsüber | ja | Pflicht |
| Rätselstunde | `raetsel` | Vanille (`notizen`) | Puzzle | tagsüber | ja | – |
| Heute vor 100 Jahren | `heute100` | Sand (`timer`) | Calendar | nur am belegten Tag | ja | Pflicht |
| Tischrunde | `tischrunde` | Pfirsich (`essen`) | MessageSquare | ab 17 Uhr | nein | – |
| Schätz mal! | `schaetzmal` | Lavendel (`termine`) | Scale | ab 17 Uhr | ja | Pflicht |
| Wer zuerst … | `werzuerst` | Rosé (`pinnwand`) | Dice5 | ab 17 Uhr | nein | – |

Pfirsich ist kein wählbarer Ton der Palette, aber die feste Essen-Fläche
(`--app-tile-essen`) – so bleibt alles in den Tokens. Allein: abends weiter
Wissen, Platt, Rätsel (Angeberwissen dann mit Hinweis „Zum Weitererzählen“).

## Wo im Code

- Daten je Sorte: `src/lib/wundertuete/data/*.ts` (feste IDs `aw-`, `pl-`,
  `ra-`, `h1-`, `ti-`, `sm-`, `wz-` + dreistellige Nummer), gebündelt in
  `pool.ts` (`POOL`, `eintragVon`, `eintraegeDer`, `BEISPIEL_KARTE`).
- Sorten, Typen, Fett/Teilen: `sorten.ts` (`SORTEN`, `antwortTeile`,
  `teilText`, `wundertueteName`).
- Wechsel (rein): `auswahl.ts` (`erlaubteSorten`, `passt`, `naechste`,
  `anzeigen`, `karteGilt`, `tippAktion`, `migrateWt`); Lage aus Wetter,
  Gericht, Feiertag: `lage.ts`; Speicher: `store.ts`.
- Kachel: `src/components/wundertuete/WundertueteTile.tsx`, CSS `.wt-karte`,
  `.wt-dreh`, `.wt-neu` in `globals.css`.
- Mia: Werkzeug `wundertuete_karte` (`src/lib/begleitung/wundertueteTools.ts`),
  Prüfstand-Sätze in `pruefstand/saetze.ts`.

## Verhalten

- Antippen dreht die Karte (0,8 s, nur transform; reduced-motion =
  Überblenden), nochmal antippen = nächste Karte. Tischrunde und Wer zuerst
  haben keine Rückseite: Antippen = nächste. Rückseite: weiß mit farbigem
  Rand, Antwort mit EINEM fetten Wort (`**…**`), „Nochmal tippen = Neues“,
  oben rechts Teilen („Wusstest du? …“ + „Von <Name>“ über das Teilen-Menü,
  sonst Kopieren).
- Nicht angetippt: nach 3 Anzeigen (Öffnungen mit sichtbarer Kachel,
  höchstens eine je halbe Stunde) von selbst die nächste.
- Nie zweimal dieselbe Sorte hintereinander. Die Sorte wird nach dem gewählt,
  was in ihr noch übrig ist, so sind alle Sorten etwa gleichzeitig durch.
- Passendes zuerst: ein Eintrag mit `anlass` (Wetter Regen/Schnee/Sonne,
  Jahreszeit, Wochentag, Gericht des Tages, Feiertag) kommt NUR, wenn er
  passt, und dann vor allem anderen; „Schietwedder“ nur an Regentagen.
  Heute vor 100 Jahren: nur am Tag (`tag` „MM-TT“, `jahr` + 100) und dann zuerst.
- Gilt die aktuelle Karte nicht mehr (17 Uhr, Haushalt gewechselt, Anlass
  vorbei), kommt beim nächsten Anzeigen die passende nächste.
- Beispiel-Tag: feste Karte Angeberwissen (Regentropfen) mit leisem
  „Beispiel“, nie gespeichert; das erste „nochmal tippen“ leert das Beispiel.
- S und M: dieselbe Karte, M nur breiter mit größerer Frage. Keine
  Farbwahl im Bearbeiten (die Farbe kommt mit der Sorte). XS gibt es nicht.

## Daten und Speicher

| Schlüssel | Version | Inhalt | Sicherung |
|---|---|---|---|
| `wasgibts.wundertuete` | v1 | `{ karte, anzeigen (1–3), zuletzt (ms), gezeigt: { <sorte>: id[] } }` | ja |

- `migrateWt`: unbekannte IDs und Sorten fallen still weg, alles andere
  bleibt. Gezeigtes erst wieder, wenn alle Einträge der Sorte durch sind
  (dann neu gemischt, die letzte Karte nie sofort).

## Zählung je Sorte (Stand A-022)

| Sorte | Einträge | Ziel laut Auftrag |
|---|---|---|
| Angeberwissen | 145 | ~365 |
| Platt för Plietsche | 90 | ~100 |
| Rätselstunde | 55 | ~80 |
| Heute vor 100 Jahren | 14 (Tage 1926) | jeder sicher belegte Tag |
| Tischrunde | 80 | ~100 |
| Schätz mal! | 35 | ~60 |
| Wer zuerst … | 40 | ~40 |

Tagsüber reichen die Karten für über 200 Karten am Stück ohne Wiederholung,
abends für über 100 (Test `tests/wundertuete/wechsel.test.ts`), bei drei
bis fünf Karten am Tag also mehrere Wochen.

## Nachfüllen („Wundertüte nachfüllen“, kleiner Monats-Auftrag)

- Rund 60 neue Einträge im Monat, vor allem Angeberwissen, Rätsel und Schätz
  mal, bis die Ziel-Zahlen oben erreicht sind; danach nach Bedarf.
- Neue IDs immer hinten anhängen (nächste freie Nummer), nie eine ID ändern
  oder neu vergeben (sie stehen in gespeicherten Ständen).
- Jede Zahl und jeden Fakt beim Schreiben gegen die Quelle prüfen und die
  Quelle ins Feld `quelle` schreiben (seriös: Behörden, Museen, Fachlexika,
  Fachzeitschriften). Im Zweifel weglassen. Platt nur mit echter Bedeutung
  aus einem Wörterbuch.
- Vorne höchstens 64 Zeichen (3 Zeilen auf S), hinten 1–2 Sätze mit genau
  einem `**fetten**` Wort.
- Heute vor 100 Jahren: jedes Jahr die Tage des Jahres vor 100 Jahren
  ergänzen (nur Kindgerechtes, keine Politik, Kriege, Religion, Unglücke).
- Nach dem Nachfüllen: `npm test` (Dubletten- und Ton-Prüfung in
  `tests/wundertuete/pool.test.ts`) und die Zählung oben aktualisieren.
- Falls je die KI Vorschläge liefern soll: nur serverseitig über den Guard
  (`begleitung/guard.ts`), Ergebnis von Hand gegen Quellen prüfen, dann als
  Datendatei einchecken. Die App braucht dafür nie die KI.

## Begleitung

- „Erzähl mir was Unnützes“, „Angeberwissen“, „Gib uns eine Tischfrage“,
  „Rätsel!“ → `wundertuete_karte`: Frage, dann Antwort als eigener Satz;
  Rätsel und Schätzfrage erst die Frage mit Knopf „Lösung“, die Lösung kommt
  über die vorgelesene Frage. Mia ändert dabei nichts.

## Tests

- `tests/wundertuete/pool.test.ts`: IDs, Dubletten (normalisiert und
  Stichwort-Überschneidung), Quelle Pflicht, Ton, Längen, Fettes, Zählung,
  Teilen, Beispiel-Karte.
- `tests/wundertuete/wechsel.test.ts`: Sortenwechsel, keine Wiederholung,
  3 Anzeigen, Antippen, Tageszeit und Haushalt, Regen/Gericht/100 Jahre,
  Wetter aus der Vorhersage, Speicher.
- `tests/wundertuete/baustein.test.ts`: neu an / bestehend aus, erste
  Startseite, Migration, Haushaltswechsel, S/M, Farbwahl, Beispiel-Tag,
  Oberfläche (Tokens, reduced-motion), Werkzeug, Prüfstand.
- Durchklick `e2e/ablaeufe/wundertuete.mjs`.
