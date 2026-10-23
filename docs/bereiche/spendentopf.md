# Spendentopf

Kurz: Die App ist kostenlos. Wer mag, sagt einen kleinen Beitrag für einen
Topf in seiner Region zu; die Familie stimmt im November ab, wohin das Geld
geht. Eine Zahlung gibt es (noch) nicht.

## FESTE REGELN

- KEINE Zahlung in der App. Beiträge sind nur „zugesagt“
  (`pledge.status: "zugesagt"`), keine Zahlungsanbindung.
- Texte nur aus `POT_TEXTS` (`src/lib/spendentopf/model.ts`):
  - `share` „100 % für Projekte in deiner Region“
  - `everyEuro` „Jeder Euro geht in deine Region“
  - `free` „Die App ist kostenlos. KARAMBA zahlt Server & KI. Keine Werbung,
    kein Abo, keine Daten verkauft.“
  - `together(region)` „Gemeinsam für Ostholstein“ (nie „App wert“), `askText`, `thanks` „Danke! Wir
    melden uns, sobald Beiträge möglich sind.“, `stillFree` „Die App bleibt für
    dich trotzdem komplett kostenlos.“
- Nie „an KARAMBA“: Das Geld geht in die Region, verwaltet von einer Stiftung
  vor Ort; die Spendenquittung kommt von der Stiftung.
- Ohne Beitrag bleibt die App komplett kostenlos.
- Beispielwerte (Ostholstein) tragen sichtbar „Beispiel“.

## Wo im Code

- Logik (rein): `src/lib/spendentopf/model.ts` (`regionForPlace`,
  `searchRegions`, `potPhase`, `voteDaysLeft`, `activePot`, `projectsFor`,
  `projectVotes`, `canVote`, `potTotal`, `euro`, `askDue`, `askLater`,
  `POT_TEXTS`, `fallbackRegion`).
- Daten: `src/lib/spendentopf/regions.ts` (`REGIONS`, `POT_PROJECTS`,
  `SCHEDULE`, `FALLBACK_REGION`, `PATE_MAIL`).
- Speicher: `src/lib/spendentopf/store.ts` (`migratePot`, `changePot`,
  `usePotState`, `notePotStart`, `useFamilyRegion`).
- Oberfläche: `src/components/spendentopf/SpendentopfView.tsx`
  (`/spendentopf`), `SpendentopfTile.tsx`, `PotHintCard.tsx` (`usePotHint`),
  `PledgeChoice.tsx`, `RegionSheet.tsx`, `PotGraphic.tsx`.
- Startseite: Hinweis in `src/components/heute/TodayPage.tsx`; Migration der
  Kachel `withPotTile` in `src/lib/core/homeLayout.ts`.
- Einstellungen: Zeile „Spendentopf“ und `POT_TEXTS.free` in
  `src/components/einstellungen/FamilyOverview.tsx`.

## Daten und Speicher

| Schlüssel | Version | Inhalt | Sicherung |
|---|---|---|---|
| `wasgibts.spendentopf` | v1 | `PotState` | ja |
| `wasgibts.startseite` | v4 | v3 → v4 hängt die Kachel einmal an | ja |

- `PotState`: `region` (selbst gewählt), `support` (unterstützte Region ohne
  eigenen Topf), `interest` („Bescheid geben“ je Region), `votes` (Jahr →
  Projekt), `pledge` (`betrag`, `monat`, `status: "zugesagt"`), `ask`
  (`since`, `asked`, `next`, `done`), `voteCardHidden` (Jahre).
- Feldnamen wie die späteren Supabase-Tabellen: `regions` (id, name,
  plz_list, orte, status, pate_name, pate_text, stiftung_name, bisher),
  `pot_projects`, `pot_votes`, `pot_contributions`, `region_interest`.
- Neue Region = nur ein Datensatz in `REGIONS`, kein neuer Code.

## So verhält es sich

Region (`useFamilyRegion`):
- Selbst gewählt → sonst PLZ aus dem Profil (`weather.postcode`) → sonst
  Wetter-Ort.
- `regionForPlace`: PLZ mit dem längsten passenden Anfang aus `plz_list`,
  sonst Name oder Ort.
- Änderbar über den Chip ▾ oben rechts → `RegionSheet` („Region wählen“, Suche
  „Ort oder Postleitzahl“, aktive zuerst, Status aktiv · bald · sucht Paten).
- Regionen: Ostholstein (aktiv, Pate KARAMBA, 2.344 €, Beispiel), Kreis Plön
  und Lübeck (bald), Kiel und Hamburg-Nord (sucht Paten).
- `activePot`: eigener Topf, wenn aktiv – sonst der unterstützte.

Zeitplan je Jahr (`SCHEDULE`, `potPhase`):
- Vorschlagen 1.–14.11., Abstimmen 15.–30.11., Übergabe 12.12., sonst Ruhe.
- „noch X Tage“ nur während der Abstimmung (`voteDaysLeft`).

Abstimmen:
- Nur in der Abstimmzeit (`canVote`) für ein Projekt dieses Jahres. Eine
  Stimme je Familie und Jahr (`votes[Jahr]`); in der Abstimmzeit lässt sie
  sich umsetzen.
- Balken relativ zum stärksten Projekt (`projectVotes`), eigene Wahl orange
  umrandet mit „✓ Gewählt“. Außerhalb: „Abgestimmt wird vom 15. bis 30.
  November – eine Stimme pro Familie.“

Seite `/spendentopf` (`SpendentopfView`):
- Mit Topf: Gold-Karte „2026 bisher“ + Betrag + `share`; Pate (KARAMBA in
  Pink), „Verwaltet von … / einer Stiftung vor Ort“, „Wohin geht der Topf?“,
  „Zeitplan 2026“, Beitrag (`PledgeChoice`), unten `free`. Unterstützt man
  eine andere Region, steht das dabei.
- Ohne Topf (`NoPot`): blasser Topf, Schalter „Bescheid geben, wenn es einen
  gibt“, „Ostholstein unterstützen“ (`FALLBACK_REGION`), „Pate werden“
  (mailto an `PATE_MAIL`), unten `stillFree`.
- Ohne Region: „Wähl oben eure Region – dann siehst du euren Topf.“

Beitrag (`PledgeChoice`): 2 € · 4 € · 7 € im Monat. Antippen speichert nur die
Zusage, zeigt `thanks` und eine fallende Münze. Der Betrag im Topf =
`bisher` + eigene Zusage (`potTotal`).

Kachel `spendentopf` (nur M, Gold, standardmäßig an, entfernbar): Topf,
Region (mit „· Beispiel“), Betrag, Statuszeile – in der Abstimmzeit
„Abstimmen: noch X Tage“ und Knopf „Abstimmen“, sonst „Euer Beitrag: 4 € im
Monat · zugesagt“ bzw. „Gemeinsam für <Region>“; ohne Topf „<Region> –
noch kein Topf“. Antippen → Seite.

Hinweis unter der Jetzt-Karte (`usePotHint`, höchstens einer, vor dem
Dunkel-Tipp, nicht im Beispiel-Tag):
- Abstimmzeit, aktiver Topf, noch keine Stimme: „2.344 € im Topf – stimmt
  jetzt ab!“ mit „Abstimmen“; ✕ blendet ihn für dieses Jahr aus.
- Sonst die Beitrags-Frage (`askDue`): 28 Tage nach dem ersten Öffnen
  (`notePotStart`), „Später“ = in 28 Tagen wieder, höchstens 3×; nie mit
  Zusage. Nach der Wahl Danke, dann blendet sich die Karte aus.

### Vorschau („bald verfügbar“, v0.76)
- `POT_STATUS` in `lib/spendentopf/regions.ts` (Standard „vorschau“): oben
  ein ruhiges Band „Vorschau – der Spendentopf startet bald. Noch wird kein
  Geld gesammelt.“, Summe mit Etikett „BEISPIEL“ (ohne eigenen Beitrag),
  Projekte als „Beispiel-Projekt“, Kachel „Spendentopf · bald“.
- Beitrag (`PledgeChoice`): Monatlich/Einmalig, 3 € · 6 € · 10 € oder eigener
  Betrag (Standard 6 € im Monat), EIN Knopf „6 € im Monat vormerken“ →
  „Danke! Wir melden uns, sobald der Spendentopf startet …“; gespeichert als
  „vorgemerkt“ (Speicher v2 mit `art`), löschbar mit „Gelöscht · Rückgängig“,
  klein „Bis zum Start fließt kein Geld.“
- „live“: echte Summe, „… zusagen“ (gespeichert „zugesagt“). Wer vorgemerkt
  hat, sieht einmal sanft in der Jetzt-Karte „Der Spendentopf ist gestartet –
  Magst du deine 6 € im Monat jetzt einrichten?“ (bis die Seite geöffnet
  wurde, `liveAsked`). Push folgt mit dem Push-Auftrag.
- Texte ohne „Keine Werbung“ (`POT_TEXTS.free`).

## Mit Konto (seit v0.80)

- Region, Stimme und Beitrag teilt der Haushalt (eine Stimme pro Familie),
  über `entries` (Eintrag `pot:haushalt`). Fragen und weggetippte Karten
  bleiben pro Gerät. Siehe `konten.md` „Sichtbar machen“.

## Begleitung (Mia)

Die Begleitung kennt den Spendentopf noch nicht: kein Werkzeug, keine Regel,
kein Kontext.

## Tests

- `tests/spendentopf/spendentopf.test.ts` – Region aus Wohnort/PLZ,
  Zeitplan, Topf/Stimmen/Betrag, Beitrags-Frage, Speicher v1.
- `tests/spendentopf/topf.test.ts` – Region, Zeitplan und Abstimmung,
  Beitrags-Frage, feste Texte, Kachel standardmäßig an.
- Durchklick `e2e/ablaeufe/mehr.mjs` → `spendentopf` („100 % für Projekte in
  deiner Region“).
