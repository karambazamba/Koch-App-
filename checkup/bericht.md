# Check-up 24. Oktober 2026

Stand: `main` 28831e6 (Version 0.91.0). Nichts am Code geändert, kein PR, kein Merge.
Bilder: iPhone 15 Pro, Testmodus (Mock-KI, Mock-Wetter, Demo-Tipps, Test-Konten), feste Zeit Mi 21.10.2026 10:30, hell; Startseite und 5 wichtige Seiten zusätzlich dunkel und „Schlicht“. Breite 750 px, zusammen 23 MB.

## Ergebnisse

| Prüfung | Ergebnis | Kurz |
|---|---|---|
| `npm test` | 🟢 grün | 151 Dateien, 2058 Tests |
| `npm run test:abdeckung` | 🟢 grün | Zeilen 92,16 %, Anweisungen 90,88 %, Zweige 86,69 %, Funktionen 88,86 % |
| `npx tsc --noEmit` | 🟢 grün | |
| `npm run lint` | 🟢 grün | |
| `npx knip` | 🟢 grün | nur ein Konfig-Hinweis: `public/sw.js` steht unnötig in `ignore` |
| `npm run build` | 🟢 grün | |
| Geheimnis-Suche `.next/static` | 🟢 grün | keine Treffer für `sk-ant`, `service_role`, `SUPABASE_SECRET` |
| `npm run test:datenbank` | 🟢 grün | Migrationen, RLS, Sicherheit |
| `npm run durchklick` | 🟢 grün | 62 Abläufe × 2 Geräte (iPhone 15 Pro, Pixel 7), 1094 s |
| `npm run pruefen` (vollständig) | 🔴 1 Befund | 696 Seiten in 1467 s |
| `npm run knoepfe` | 🔴 2 Befunde | 361 Knöpfe auf 21 Seiten |

## Befunde `pruefen`

- **Knopf über Text** (4×, nur iPhone SE, abends 21:30 und 23:30, hell, Browser und App, Startseite):
  „Aufnahme starten“ (Mikro in der Pinnwand-Kachel) verdeckt den Leer-Text „Hinterlasst euch hier Nachrichten …“.
  Gleiche Stelle wie Punkt 4 im Auftrag „Essen-Kachel mit Bild“ (Pinnwand-Etikett überlappt Text).

## Befunde `knoepfe`

- **/pinnwand · „Antworten“** und **/pinnwand · „Reagieren“** gelten als „tot“.
  Das sind die unsichtbaren Ersatzknöpfe für VoiceOver/Tastatur (`sr-only`, `src/components/pinnwand/SwipeRow.tsx`).
  Das Prüfskript tippt echt per Touch; auf 1 px landet der Tipp sehr wahrscheinlich daneben. Vermutlich Messfehler,
  mit VoiceOver gegenprüfen; sonst `knoepfe` sr-only-Knöpfe überspringen lassen.

## Beim Durchsehen der Bilder aufgefallen

- Startseite Beispiel-Tag (003): drei Hinweise gleichzeitig: Karte „Das ist ein Beispiel-Tag“, Leiste „BEISPIEL · So sieht ein Tag aus · Eigenen starten“ und die Blase „Tippen & sprechen“. Die Blase liegt über der Termine-Kachel und dem ＋ der Aufgaben. Gehört zu Tafel 85 B4 (Hinweis-Warteschlange).
- Pinnwand-Kachel: Etikett „schreiben“ unter dem ＋ liegt über „Bring…“ (bekannt, Auftrag Essen-Kachel Punkt 4).
- Einladen (117): der gezeigte Link ist ein Test-Link des lokalen Testservers, kein echtes Geheimnis.

## Bilder

Alle unter `checkup/bilder/`, nummeriert. Lücken in der Nummerierung = Szene nicht erreicht (siehe unten).

| Bild | Was zu sehen ist | Wie man hinkommt |
|---|---|---|
| [001-hallo-bildschirm.png](bilder/001-hallo-bildschirm.png) | Hallo-Bildschirm „Moin!“ mit „Los geht’s“, „Schon ein Konto? Anmelden“, unten „Gemacht in Eutin von KARAMBA Eis“ und „Datenschutz · Impressum“. | App zum ersten Mal öffnen. |
| [002-look-frage.png](bilder/002-look-frage.png) | Die eine Frage nach dem Start: Look „Farbig“ oder „Schlicht“. | Hallo-Bildschirm → „Los geht’s“. |
| [003-startseite-beispieltag.png](bilder/003-startseite-beispieltag.png) | Startseite mit Beispiel-Tag (erster Start), Jetzt-Karte oben, Kacheln im Look „Farbig“. | „Los geht’s“ → „Weiter“. |
| [004-startseite-neu-leer.png](bilder/004-startseite-neu-leer.png) | Startseite ganz neu ohne Beispiele: leere Kacheln mit freundlichen Leer-Texten. | Beispiel-Tag in allen Kacheln wegräumen (bzw. erster Start, alles leer). |
| [005-startseite-familie-hell.png](bilder/005-startseite-familie-hell.png) | Startseite mit Beispiel-Familie (alle Kacheln eingeblendet), hell. | Eigene Daten, alle Kacheln eingeschaltet. |
| [006-startseite-bearbeiten.png](bilder/006-startseite-bearbeiten.png) | Startseite im Bearbeiten-Modus (Kacheln wackeln, „–“, Größen S/M/L, „+ Kachel“, „Fertig“). | Startseite → eine Kachel lange drücken. |
| [007-startseite-familie-dunkel.png](bilder/007-startseite-familie-dunkel.png) | Startseite mit Beispiel-Familie (alle Kacheln eingeblendet), dunkel. | Eigene Daten, alle Kacheln eingeschaltet, Design Dunkel. |
| [008-startseite-familie-schlicht.png](bilder/008-startseite-familie-schlicht.png) | Startseite mit Beispiel-Familie (alle Kacheln eingeblendet), Look „Schlicht“. | Eigene Daten, alle Kacheln eingeschaltet, Einstellungen → Startseite → Schlicht. |
| [009-kachel-pinnwand-geoeffnet.png](bilder/009-kachel-pinnwand-geoeffnet.png) | Was sich nach Antippen der Kachel „pinnwand“ öffnet. | Startseite → Kachel „pinnwand“ antippen (oben links auf die Überschrift). |
| [010-kachel-wetter-geoeffnet.png](bilder/010-kachel-wetter-geoeffnet.png) | Was sich nach Antippen der Kachel „wetter“ öffnet. | Startseite → Kachel „wetter“ antippen (oben links auf die Überschrift). |
| [011-kachel-termine-geoeffnet.png](bilder/011-kachel-termine-geoeffnet.png) | Was sich nach Antippen der Kachel „termine“ öffnet. | Startseite → Kachel „termine“ antippen (oben links auf die Überschrift). |
| [012-kachel-aufgaben-geoeffnet.png](bilder/012-kachel-aufgaben-geoeffnet.png) | Was sich nach Antippen der Kachel „aufgaben“ öffnet. | Startseite → Kachel „aufgaben“ antippen (oben links auf die Überschrift). |
| [013-kachel-essen-geoeffnet.png](bilder/013-kachel-essen-geoeffnet.png) | Was sich nach Antippen der Kachel „essen“ öffnet. | Startseite → Kachel „essen“ antippen (oben links auf die Überschrift). |
| [014-kachel-einkauf-geoeffnet.png](bilder/014-kachel-einkauf-geoeffnet.png) | Was sich nach Antippen der Kachel „einkauf“ öffnet. | Startseite → Kachel „einkauf“ antippen (oben links auf die Überschrift). |
| [015-kachel-spendentopf-geoeffnet.png](bilder/015-kachel-spendentopf-geoeffnet.png) | Was sich nach Antippen der Kachel „spendentopf“ öffnet. | Startseite → Kachel „spendentopf“ antippen (oben links auf die Überschrift). |
| [016-kachel-tipps-geoeffnet.png](bilder/016-kachel-tipps-geoeffnet.png) | Was sich nach Antippen der Kachel „tipps“ öffnet. | Startseite → Kachel „tipps“ antippen (oben links auf die Überschrift). |
| [017-kachel-timer-geoeffnet.png](bilder/017-kachel-timer-geoeffnet.png) | Kachel „timer“ angetippt – es öffnete sich keine neue Seite/kein Fenster (Bild zeigt den Stand danach). | Startseite → Kachel „timer“ antippen (oben links auf die Überschrift). |
| [018-kachel-sport-geoeffnet.png](bilder/018-kachel-sport-geoeffnet.png) | Was sich nach Antippen der Kachel „sport“ öffnet. | Startseite → Kachel „sport“ antippen (oben links auf die Überschrift). |
| [019-kachel-notizen-geoeffnet.png](bilder/019-kachel-notizen-geoeffnet.png) | Was sich nach Antippen der Kachel „notizen“ öffnet. | Startseite → Kachel „notizen“ antippen (oben links auf die Überschrift). |
| [020-kachel-vorrat-geoeffnet.png](bilder/020-kachel-vorrat-geoeffnet.png) | Was sich nach Antippen der Kachel „vorrat“ öffnet. | Startseite → Kachel „vorrat“ antippen (oben links auf die Überschrift). |
| [021-kachel-morgen-geoeffnet.png](bilder/021-kachel-morgen-geoeffnet.png) | Kachel „morgen“ angetippt – es öffnete sich keine neue Seite/kein Fenster (Bild zeigt den Stand danach). | Startseite → Kachel „morgen“ antippen (oben links auf die Überschrift). |
| [023-plus-startseite-nachricht-an-die-pinnwand.png](bilder/023-plus-startseite-nachricht-an-die-pinnwand.png) | Schnelleingabe nach Antippen von „Nachricht an die Pinnwand“ auf der Startseite. | Startseite → ＋ „Nachricht an die Pinnwand“. |
| [024-plus-startseite-neuer-termin.png](bilder/024-plus-startseite-neuer-termin.png) | Schnelleingabe nach Antippen von „Neuer Termin“ auf der Startseite. | Startseite → ＋ „Neuer Termin“. |
| [025-plus-startseite-neue-aufgabe.png](bilder/025-plus-startseite-neue-aufgabe.png) | Schnelleingabe nach Antippen von „Neue Aufgabe“ auf der Startseite. | Startseite → ＋ „Neue Aufgabe“. |
| [026-plus-startseite-etwas-auf-die-einkaufsliste-setzen.png](bilder/026-plus-startseite-etwas-auf-die-einkaufsliste-setzen.png) | Schnelleingabe nach Antippen von „Etwas auf die Einkaufsliste setzen“ auf der Startseite. | Startseite → ＋ „Etwas auf die Einkaufsliste setzen“. |
| [027-plus-startseite-neuer-timer.png](bilder/027-plus-startseite-neuer-timer.png) | Schnelleingabe nach Antippen von „Neuer Timer“ auf der Startseite. | Startseite → ＋ „Neuer Timer“. |
| [028-plus-startseite-training-planen.png](bilder/028-plus-startseite-training-planen.png) | Schnelleingabe nach Antippen von „Training planen“ auf der Startseite. | Startseite → ＋ „Training planen“. |
| [029-plus-startseite-tag-oeffnen.png](bilder/029-plus-startseite-tag-oeffnen.png) | Schnelleingabe nach Antippen von „Mi: frei (heute) – öffnen“ auf der Startseite. | Startseite → ＋ „Mi: frei (heute) – öffnen“. |
| [030-jetzt-karte-thema-1.png](bilder/030-jetzt-karte-thema-1.png) | Jetzt-Karte, Thema 1 von 1: „Alles ruhig. Ich sag Bescheid.“. | Startseite → Jetzt-Karte oben, nach links wischen. |
| [031-dein-tag.png](bilder/031-dein-tag.png) | Seite „Dein Tag“ (Jetzt-Karte angetippt). | Startseite → Jetzt-Karte antippen. |
| [032-seite-kalender-woche.png](bilder/032-seite-kalender-woche.png) | Kalender (Startansicht Woche/Monat). | Startseite → Reiter „Kalender“ bzw. nach rechts wischen. |
| [033-seite-tag.png](bilder/033-seite-tag.png) | Tag-Seite Mittwoch 21.10. mit Terminen und Aufgaben. | Kalender → Tag antippen. |
| [034-seite-essen.png](bilder/034-seite-essen.png) | Essen-Seite mit Ideen-Karussell, Woche, Im Haus, Rezepten, Einkauf. | Startseite → Reiter „Essen“. |
| [035-seite-rezept.png](bilder/035-seite-rezept.png) | Rezept „Spaghetti Bolognese“. | Essen → Unsere Rezepte → Rezept antippen. |
| [036-seite-kochbuch.png](bilder/036-seite-kochbuch.png) | Rezepte-Übersicht. | Essen → „Unsere Rezepte · Alle“. |
| [037-seite-wochenplan.png](bilder/037-seite-wochenplan.png) | Wochenplan. | Essen → „Plan öffnen“. |
| [038-seite-einkauf.png](bilder/038-seite-einkauf.png) | Einkaufsliste. | Startseite → Kachel Einkauf. |
| [039-seite-im-haus.png](bilder/039-seite-im-haus.png) | „Im Haus“ mit Kühlschrank, Schrank, Tiefkühler. | Essen → „Das ist da · Im Haus“. |
| [040-seite-pinnwand.png](bilder/040-seite-pinnwand.png) | Pinnwand mit Nachricht und Leiste für Sprachnachricht. | Startseite → Kachel Pinnwand. |
| [041-seite-wetter.png](bilder/041-seite-wetter.png) | Wetter-Seite (Testdaten). | Startseite → Kachel Wetter. |
| [042-seite-spendentopf.png](bilder/042-seite-spendentopf.png) | Spendentopf (Vorschau mit Beispiel-Summe). | Startseite → Kachel Spendentopf. |
| [043-seite-sport.png](bilder/043-seite-sport.png) | Sport-Seite. | Startseite → Kachel Sport. |
| [044-seite-tipps.png](bilder/044-seite-tipps.png) | Tipps aus der Region (Demo-Quelle). | Startseite → Kachel Tipps. |
| [045-seite-aufgaben.png](bilder/045-seite-aufgaben.png) | Aufgaben-Seite („Jetzt dran“). | Startseite → Kachel Aufgaben. |
| [046-seite-notizen.png](bilder/046-seite-notizen.png) | Notizen. | Startseite → Kachel Notizen. |
| [047-seite-mails.png](bilder/047-seite-mails.png) | „Aus euren Mails“ (leer, ohne Konto). | Jetzt-Karte bei Mail-Vorschlägen bzw. /mails. |
| [048-seite-marke.png](bilder/048-seite-marke.png) | Markenseite (Logo-Varianten). | Nur per Adresse /brand. |
| [049-kachel-timer-nah.png](bilder/049-kachel-timer-nah.png) | Timer-Kachel auf der Startseite (keine eigene Seite). | Startseite → zur Timer-Kachel scrollen. |
| [050-seite-kalender-woche-dunkel.png](bilder/050-seite-kalender-woche-dunkel.png) | Kalender (Startansicht Woche/Monat). (Dunkel) | Startseite → Reiter „Kalender“ bzw. nach rechts wischen. |
| [051-seite-essen-dunkel.png](bilder/051-seite-essen-dunkel.png) | Essen-Seite mit Ideen-Karussell, Woche, Im Haus, Rezepten, Einkauf. (Dunkel) | Startseite → Reiter „Essen“. |
| [052-seite-einkauf-dunkel.png](bilder/052-seite-einkauf-dunkel.png) | Einkaufsliste. (Dunkel) | Startseite → Kachel Einkauf. |
| [053-seite-pinnwand-dunkel.png](bilder/053-seite-pinnwand-dunkel.png) | Pinnwand mit Nachricht und Leiste für Sprachnachricht. (Dunkel) | Startseite → Kachel Pinnwand. |
| [054-seite-aufgaben-dunkel.png](bilder/054-seite-aufgaben-dunkel.png) | Aufgaben-Seite („Jetzt dran“). (Dunkel) | Startseite → Kachel Aufgaben. |
| [055-seite-kalender-woche-schlicht.png](bilder/055-seite-kalender-woche-schlicht.png) | Kalender (Startansicht Woche/Monat). (Look „Schlicht“) | Startseite → Reiter „Kalender“ bzw. nach rechts wischen. |
| [056-seite-essen-schlicht.png](bilder/056-seite-essen-schlicht.png) | Essen-Seite mit Ideen-Karussell, Woche, Im Haus, Rezepten, Einkauf. (Look „Schlicht“) | Startseite → Reiter „Essen“. |
| [057-seite-einkauf-schlicht.png](bilder/057-seite-einkauf-schlicht.png) | Einkaufsliste. (Look „Schlicht“) | Startseite → Kachel Einkauf. |
| [058-seite-pinnwand-schlicht.png](bilder/058-seite-pinnwand-schlicht.png) | Pinnwand mit Nachricht und Leiste für Sprachnachricht. (Look „Schlicht“) | Startseite → Kachel Pinnwand. |
| [059-seite-aufgaben-schlicht.png](bilder/059-seite-aufgaben-schlicht.png) | Aufgaben-Seite („Jetzt dran“). (Look „Schlicht“) | Startseite → Kachel Aufgaben. |
| [060-kalender-monat.png](bilder/060-kalender-monat.png) | Kalender in der Monatsansicht. | Kalender → „Monat“. |
| [061-termin-detail.png](bilder/061-termin-detail.png) | Termin „Zahnarzt“ geöffnet (Detail/Bearbeiten). | Tag-Seite → Termin antippen. |
| [062-kochmodus.png](bilder/062-kochmodus.png) | Kochmodus Schritt für Schritt (Spaghetti Bolognese). | Rezept → „Kochen“. |
| [063-kochidee-start.png](bilder/063-kochidee-start.png) | Kochidee auf der Mia-Bühne (Start, Vorschläge zum Durchschieben). | Startseite → Essen-Kachel → „Idee“. |
| [064-kochidee-ergebnis.png](bilder/064-kochidee-ergebnis.png) | Kochidee: Vorschlag aus dem Erzählten. | Kochidee → „Lieber tippen“ → Satz eingeben. |
| [066-mia-zuhoeren.png](bilder/066-mia-zuhoeren.png) | Mia-Bühne: Mia hört zu (Startseite verschwommen dahinter). | Startseite → runder Mia-Knopf unten rechts. |
| [067-mia-antwort.png](bilder/067-mia-antwort.png) | Mia-Bühne: Antwort mit Bestätigung und „Rückgängig“ (Testmodus ohne echte KI). | Mia → „Lieber tippen“ → „Milch auf die Liste“. |
| [068-mia-hat-schon.png](bilder/068-mia-hat-schon.png) | Startseite danach: Hinweis „Mia hat schon …“ (bzw. Jetzt-Karte). | Nach einer erledigten Mia-Aufgabe zurück auf die Startseite. |
| [069-plus-kalender.png](bilder/069-plus-kalender.png) | Schnelleingabe nach ＋ auf „kalender“ („Neuer Termin“). | kalender → ＋ oben bzw. im Abschnitt. |
| [071-plus-einkauf.png](bilder/071-plus-einkauf.png) | Schnelleingabe nach ＋ auf „einkauf“ („Etwas auf die Einkaufsliste setzen“). | einkauf → ＋ oben bzw. im Abschnitt. |
| [072-plus-im-haus.png](bilder/072-plus-im-haus.png) | Schnelleingabe nach ＋ auf „im-haus“ („Ins Haus eintragen“). | im-haus → ＋ oben bzw. im Abschnitt. |
| [073-plus-pinnwand.png](bilder/073-plus-pinnwand.png) | Schnelleingabe nach ＋ auf „pinnwand“ („Nachricht an die Pinnwand“). | pinnwand → ＋ oben bzw. im Abschnitt. |
| [074-plus-aufgaben.png](bilder/074-plus-aufgaben.png) | Schnelleingabe nach ＋ auf „aufgaben“ („Neue Aufgabe“). | aufgaben → ＋ oben bzw. im Abschnitt. |
| [075-plus-notizen.png](bilder/075-plus-notizen.png) | Schnelleingabe nach ＋ auf „notizen“ („Neue Notiz“). | notizen → ＋ oben bzw. im Abschnitt. |
| [076-plus-tag.png](bilder/076-plus-tag.png) | Schnelleingabe nach ＋ auf „tag“ („Neuer Termin an diesem Tag“). | tag → ＋ oben bzw. im Abschnitt. |
| [077-einstellungen.png](bilder/077-einstellungen.png) | Einstellungen (Übersicht, sortiert nach Häufigkeit, unten Datenschutz · Impressum · Nutzungsbedingungen). | Startseite → Zahnrad bzw. /profil. |
| [078-einstellungen-familie.png](bilder/078-einstellungen-familie.png) | Einstellungen → Unterseite „familie“. | Einstellungen → familie (Adresse /profil/familie). |
| [079-einstellungen-person.png](bilder/079-einstellungen-person.png) | Einstellungen → Unterseite „person“. | Einstellungen → person (Adresse /profil/person). |
| [080-einstellungen-startseite.png](bilder/080-einstellungen-startseite.png) | Einstellungen → Unterseite „startseite“. | Einstellungen → startseite (Adresse /profil/startseite). |
| [081-einstellungen-tagesablauf.png](bilder/081-einstellungen-tagesablauf.png) | Einstellungen → Unterseite „tagesablauf“. | Einstellungen → tagesablauf (Adresse /profil/tagesablauf). |
| [082-einstellungen-mitteilungen.png](bilder/082-einstellungen-mitteilungen.png) | Einstellungen → Unterseite „mitteilungen“. | Einstellungen → mitteilungen (Adresse /profil/mitteilungen). |
| [083-einstellungen-wetter.png](bilder/083-einstellungen-wetter.png) | Einstellungen → Unterseite „wetter“. | Einstellungen → wetter (Adresse /profil/wetter). |
| [084-einstellungen-kalender.png](bilder/084-einstellungen-kalender.png) | Einstellungen → Unterseite „kalender“. | Einstellungen → kalender (Adresse /profil/kalender). |
| [085-einstellungen-essen.png](bilder/085-einstellungen-essen.png) | Einstellungen → Unterseite „essen“. | Einstellungen → essen (Adresse /profil/essen). |
| [086-einstellungen-kochstil.png](bilder/086-einstellungen-kochstil.png) | Einstellungen → Unterseite „kochstil“. | Einstellungen → kochstil (Adresse /profil/kochstil). |
| [087-einstellungen-das-moegt-ihr.png](bilder/087-einstellungen-das-moegt-ihr.png) | Einstellungen → Unterseite „das-moegt-ihr“. | Einstellungen → das-moegt-ihr (Adresse /profil/das-moegt-ihr). |
| [088-einstellungen-nie-wieder.png](bilder/088-einstellungen-nie-wieder.png) | Einstellungen → Unterseite „nie-wieder“. | Einstellungen → nie-wieder (Adresse /profil/nie-wieder). |
| [089-einstellungen-lieblingsgerichte.png](bilder/089-einstellungen-lieblingsgerichte.png) | Einstellungen → Unterseite „lieblingsgerichte“. | Einstellungen → lieblingsgerichte (Adresse /profil/lieblingsgerichte). |
| [090-einstellungen-warme-mahlzeit.png](bilder/090-einstellungen-warme-mahlzeit.png) | Einstellungen → Unterseite „warme-mahlzeit“. | Einstellungen → warme-mahlzeit (Adresse /profil/warme-mahlzeit). |
| [091-einstellungen-einkaufstag.png](bilder/091-einstellungen-einkaufstag.png) | Einstellungen → Unterseite „einkaufstag“. | Einstellungen → einkaufstag (Adresse /profil/einkaufstag). |
| [092-einstellungen-standardwoche.png](bilder/092-einstellungen-standardwoche.png) | Einstellungen → Unterseite „standardwoche“. | Einstellungen → standardwoche (Adresse /profil/standardwoche). |
| [093-einstellungen-produkte.png](bilder/093-einstellungen-produkte.png) | Einstellungen → Unterseite „produkte“. | Einstellungen → produkte (Adresse /profil/produkte). |
| [094-einstellungen-basen.png](bilder/094-einstellungen-basen.png) | Einstellungen → Unterseite „basen“. | Einstellungen → basen (Adresse /profil/basen). |
| [095-einstellungen-gesundheit.png](bilder/095-einstellungen-gesundheit.png) | Einstellungen → Unterseite „gesundheit“. | Einstellungen → gesundheit (Adresse /profil/gesundheit). |
| [096-einstellungen-haushalt.png](bilder/096-einstellungen-haushalt.png) | Einstellungen → Unterseite „haushalt“. | Einstellungen → haushalt (Adresse /profil/haushalt). |
| [097-einstellungen-pause.png](bilder/097-einstellungen-pause.png) | Einstellungen → Unterseite „pause“. | Einstellungen → pause (Adresse /profil/pause). |
| [098-einstellungen-regiontipps.png](bilder/098-einstellungen-regiontipps.png) | Einstellungen → Unterseite „regiontipps“. | Einstellungen → regiontipps (Adresse /profil/regiontipps). |
| [099-einstellungen-bausteine.png](bilder/099-einstellungen-bausteine.png) | Einstellungen → Unterseite „bausteine“. | Einstellungen → bausteine (Adresse /profil/bausteine). |
| [100-einstellungen-kuechenhelfer.png](bilder/100-einstellungen-kuechenhelfer.png) | Einstellungen → Unterseite „kuechenhelfer“. | Einstellungen → kuechenhelfer (Adresse /profil/kuechenhelfer). |
| [101-einstellungen-mails.png](bilder/101-einstellungen-mails.png) | Einstellungen → Unterseite „mails“. | Einstellungen → mails (Adresse /profil/mails). |
| [102-einstellungen-mails-an-mia.png](bilder/102-einstellungen-mails-an-mia.png) | Einstellungen → Unterseite „mails-an-mia“. | Einstellungen → mails-an-mia (Adresse /profil/mails-an-mia). |
| [103-einstellungen-deine-daten.png](bilder/103-einstellungen-deine-daten.png) | Einstellungen → Unterseite „deine-daten“. | Einstellungen → deine-daten (Adresse /profil/deine-daten). |
| [104-einstellungen-daten.png](bilder/104-einstellungen-daten.png) | Einstellungen → Unterseite „daten“. | Einstellungen → daten (Adresse /profil/daten). |
| [105-einstellungen-admin.png](bilder/105-einstellungen-admin.png) | Einstellungen → Unterseite „admin“. | Einstellungen → admin (Adresse /profil/admin). |
| [106-seite-datenschutz.png](bilder/106-seite-datenschutz.png) | Datenschutzerklärung (Entwurf) mit „Kurz gesagt“. | Adresse /datenschutz. |
| [107-seite-impressum.png](bilder/107-seite-impressum.png) | Impressum (Entwurf mit Platzhaltern). | Adresse /impressum. |
| [108-seite-nutzungsbedingungen.png](bilder/108-seite-nutzungsbedingungen.png) | Nutzungsbedingungen (Entwurf). | Adresse /nutzungsbedingungen. |
| [109-seite-konto.png](bilder/109-seite-konto.png) | „Familie verbinden“ / Konto: Anmelden per E-Mail-Code mit Pflicht-Häkchen. | Adresse /konto. |
| [110-seite-anmelden.png](bilder/110-seite-anmelden.png) | Anmelden (Willkommen-Ablauf). | Adresse /anmelden. |
| [111-seite-beitreten.png](bilder/111-seite-beitreten.png) | Beitreten mit Code (älterer Weg). | Adresse /beitreten. |
| [112-seite-einladung-unbekannt.png](bilder/112-seite-einladung-unbekannt.png) | Einladungs-Link, der nicht (mehr) gültig ist: freundliche Seite. | Adresse /e/00000000000000000000000000000000. |
| [113-deine-daten-loeschen-frage.png](bilder/113-deine-daten-loeschen-frage.png) | Sicherheitsfrage „Alles auf diesem Gerät löschen?“ (nicht bestätigt). | Einstellungen → Deine Daten → „Auf diesem Gerät löschen“. |
| [114-konto-code-eingeben.png](bilder/114-konto-code-eingeben.png) | Anmelden: Code-Eingabe (Testmodus, keine echte Mail). | Einstellungen → Familie verbinden → E-Mail → „Code schicken“. |
| [115-konto-familie.png](bilder/115-konto-familie.png) | Konto verbunden: Familie mit Mitgliedern, „Familie einladen“ (E-Mail ist eine Test-Adresse). | Code eingeben (Testmodus). |
| [116-einladen-fenster.png](bilder/116-einladen-fenster.png) | Fenster „Familie einladen“ (Erwachsene/Kind). | Konto → „Familie einladen“. |
| [117-einladen-link.png](bilder/117-einladen-link.png) | Einladungs-Link erstellt (Test-Server, Link nur lokal gültig). | „Einladungs-Link erstellen“. |
| [118-leer-kalender.png](bilder/118-leer-kalender.png) | Leerer Kalender mit Angebot „Kalender mitbringen“. | Ohne eigene Daten, Adresse /?seite=kalender. |
| [119-leer-einkauf.png](bilder/119-leer-einkauf.png) | Leere Einkaufsliste. | Ohne eigene Daten, Adresse /einkaufsliste. |
| [120-leer-aufgaben.png](bilder/120-leer-aufgaben.png) | Keine Aufgaben. | Ohne eigene Daten, Adresse /aufgaben. |
| [121-leer-notizen.png](bilder/121-leer-notizen.png) | Keine Notizen. | Ohne eigene Daten, Adresse /notizen. |
| [122-leer-pinnwand.png](bilder/122-leer-pinnwand.png) | Leere Pinnwand. | Ohne eigene Daten, Adresse /pinnwand. |
| [123-leer-im-haus.png](bilder/123-leer-im-haus.png) | „Im Haus“ ohne Einträge. | Ohne eigene Daten, Adresse /vorrat. |
| [124-leer-mails.png](bilder/124-leer-mails.png) | „Aus euren Mails“ leer. | Ohne eigene Daten, Adresse /mails. |
| [125-kalender-mitbringen-google.png](bilder/125-kalender-mitbringen-google.png) | „Kalender mitbringen“ → Schritte für Google. | Leerer Kalender → Karte „Termine schon woanders?“ → „Google“. |
| [126-fehler-404.png](bilder/126-fehler-404.png) | Seite nicht gefunden (404). | Adresse /gibt-es-nicht. |
| [127-fehler-rezept-unbekannt.png](bilder/127-fehler-rezept-unbekannt.png) | Rezept mit unbekannter Kennung. | Adresse /kochbuch/rezept?id=unbekannt. |
| [128-fehler-offline-mia.png](bilder/128-fehler-offline-mia.png) | Mia ohne Netz: freundlicher Satz statt Fehler. | Flugmodus → Mia → Frage tippen. |
| [129-ki-einwilligung.png](bilder/129-ki-einwilligung.png) | Mia-Bühne ohne KI-Einwilligung: „Mia braucht kurz dein OK“ mit „Erlauben“ / „Nicht jetzt“. | Erster Start → Mia-Knopf (noch nicht erlaubt). |
| [130-konto-ohne-haekchen.png](bilder/130-konto-ohne-haekchen.png) | Anmelden ohne Häkchen: „Code schicken“ ist noch aus. | Einstellungen → Familie verbinden (Bedingungen noch nicht bestätigt). |

### Nicht erreicht

- **kachel-post**: locator.scrollIntoViewIfNeeded: Timeout 30000ms exceeded.
- **pinnwand-memo**: locator.click: Timeout 30000ms exceeded.
- **plus-essen**: locator.click: Timeout 30000ms exceeded.
