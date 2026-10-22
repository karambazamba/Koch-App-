import type { Tip } from "@/lib/essen/tips/types";

// Spartipps: Geld sparen beim Kochen und Einkaufen – als Angebot, nie als Pflicht.

export const SPAR_TIPS: Tip[] = [
  {
    id: "s-saisongemuese",
    category: "sparen",
    text: "Was gerade Saison hat, ist meist günstiger und schmeckt auch noch besser. Im Herbst etwa Kürbis, Kohl und Äpfel.",
    detail:
      "Saisonware kommt oft aus der Nähe und ist reichlich da – das drückt den Preis. Ein Saisonkalender am Kühlschrank hilft beim Planen.",
  },
  {
    id: "s-eigenmarken",
    category: "sparen",
    text: "Eigenmarken vom Supermarkt sind bei Nudeln, Mehl, Dosentomaten und Co. oft genauso gut wie Markenware.",
    detail:
      "Bei Grundzutaten steckt häufig derselbe Inhalt in der Packung, nur ohne teure Werbung. Einfach mal nebeneinander probieren.",
  },
  {
    id: "s-huelsenfruechte-tag",
    category: "sparen",
    text: "Wie wär’s mit einem Linsen- oder Bohnentag pro Woche? Chili, Dal oder Linsenbolognese machen satt und kosten wenig.",
    detail:
      "Getrocknete Hülsenfrüchte und Dosenware sind sehr günstig und lange haltbar. Mit kräftigen Gewürzen vermisst kaum jemand das Fleisch.",
    steps: [
      "Einen festen Tag aussuchen",
      "Ein Lieblingsgericht in Linsen-Version probieren",
      "Gewürze ruhig großzügig nehmen",
    ],
  },
  {
    id: "s-ganzes-haehnchen",
    category: "sparen",
    text: "Ein ganzes Hähnchen ist pro Kilo meist günstiger als Brustfilet – und reicht für mehrere Mahlzeiten.",
    detail:
      "Keulen in den Ofen, Brust in die Pfanne, aus dem Gerippe wird Brühe. So wird aus einem Einkauf ein halber Wochenplan.",
    steps: [
      "Hähnchen zerlegen oder im Ganzen braten",
      "Reste vom Fleisch für Wraps oder Suppe nehmen",
      "Knochen mit Gemüse zu Brühe auskochen",
    ],
  },
  {
    id: "s-grosspackung-haltbar",
    category: "sparen",
    text: "Großpackungen lohnen sich bei Haltbarem wie Reis, Nudeln oder Haferflocken. Bei Frischem lieber nur so viel, wie ihr schafft.",
    detail:
      "Der günstige Kilopreis bringt nur etwas, wenn alles aufgebraucht wird. Trockenware wartet geduldig, Salat leider nicht.",
  },
  {
    id: "s-liste-nach-plan",
    category: "sparen",
    text: "Mit einer Einkaufsliste nach Wochenplan landet nur im Wagen, was wirklich gebraucht wird.",
    detail:
      "Spontankäufe summieren sich schnell. Die Liste in der App entsteht direkt aus dem Plan – das erledige ich gern für euch.",
  },
  {
    id: "s-satt-einkaufen",
    category: "sparen",
    text: "Satt einkaufen ist ein kleiner Trick mit großer Wirkung: Mit leerem Magen wandern plötzlich Chips und Kekse in den Wagen.",
    detail:
      "Hunger macht spontan. Ein Apfel oder Brot vor dem Einkauf hält den Wagen schlank und die Laune gut.",
  },
  {
    id: "s-gemuesebruehe",
    category: "sparen",
    text: "Zwiebelschalen, Möhrenenden und Lauchgrün im Gefrierbeutel sammeln – ist er voll, wird daraus Brühe.",
    detail:
      "Saubere Gemüsereste geben viel Geschmack ab. Die Brühe lässt sich portionsweise einfrieren und ersetzt Brühwürfel.",
    steps: [
      "Gemüsereste im Gefrierfach sammeln",
      "Mit Wasser bedecken, 45 Minuten leise köcheln",
      "Absieben und portionsweise einfrieren",
    ],
  },
  {
    id: "s-tiefkuehlgemuese",
    category: "sparen",
    text: "Tiefkühlgemüse ist oft günstiger als frisches und verdirbt nicht. Erbsen, Spinat und Brokkoli sind echte Alltagshelden.",
    detail:
      "Es wird direkt nach der Ernte eingefroren und bleibt dadurch lange gut. Man nimmt genau so viel, wie man braucht.",
  },
  {
    id: "s-ofen-voll",
    category: "sparen",
    text: "Wenn der Ofen schon heiß ist, gleich mehr reinschieben: Ofengemüse fürs Mittagessen morgen oder Kartoffeln für Bratkartoffeln.",
    detail:
      "Das Aufheizen kostet am meisten Strom. Zwei Bleche auf einmal machen kaum mehr Aufwand.",
  },
  {
    id: "s-restwaerme",
    category: "sparen",
    text: "Herd und Ofen ein paar Minuten früher ausschalten – die Restwärme gart in Ruhe weiter.",
    detail:
      "Besonders Elektroplatten und Öfen bleiben noch lange warm. Bei Nudeln, Reis und Aufläufen klappt das prima.",
  },
  {
    id: "s-deckel-drauf",
    category: "sparen",
    text: "Deckel drauf, und das Wasser kocht deutlich schneller. Klingt banal, merkt man aber auf der Stromrechnung.",
    detail:
      "Ohne Deckel entweicht viel Wärme mit dem Dampf. Mit Deckel reicht danach oft eine kleinere Stufe.",
  },
  {
    id: "s-wasserkocher",
    category: "sparen",
    text: "Nudelwasser im Wasserkocher vorkochen und dann in den Topf gießen – geht schneller und braucht weniger Strom.",
    detail:
      "Der Wasserkocher bringt Wasser effizienter zum Kochen als die meisten Herdplatten. Besonders bei Glaskeramik lohnt sich das.",
  },
  {
    id: "s-doppelt-kochen",
    category: "sparen",
    text: "Einmal kochen, zweimal essen: Eintopf, Bolognese oder Curry gleich in doppelter Menge und eine Portion einfrieren.",
    detail:
      "Größere Mengen sind pro Portion günstiger, und an stressigen Tagen wartet schon ein fertiges Essen.",
  },
  {
    id: "s-vorrat-zuerst",
    category: "sparen",
    text: "Vor dem Einkauf kurz in Kühlschrank und Vorrat schauen – manchmal ist das halbe Rezept schon da.",
    detail:
      "So landet nichts doppelt im Schrank. Was noch da ist, könnt ihr mir einfach erzählen, dann plane ich es mit ein.",
  },
  {
    id: "s-gruenes-mitessen",
    category: "sparen",
    text: "Kohlrabiblätter, Brokkolistrunk und Radieschengrün sind essbar und lecker – geschält, gehackt oder als Pesto.",
    detail:
      "Ein Teil vom Gemüse, das man ohnehin bezahlt hat, landet oft im Müll. Der Brokkolistrunk schmeckt geschält fast süß.",
  },
  {
    id: "s-hackfleisch-strecken",
    category: "sparen",
    text: "Hackfleisch lässt sich wunderbar strecken: mit geriebener Möhre, Haferflocken oder roten Linsen.",
    detail:
      "Das macht Frikadellen saftig und Soßen sämig. Die Kinder merken meist nichts davon.",
  },
  {
    id: "s-kraeuter-topf",
    category: "sparen",
    text: "Ein Topf Basilikum oder Petersilie auf der Fensterbank hält viel länger als ein Bund aus dem Kühlregal.",
    detail:
      "Regelmäßig von oben ernten und gießen, dann wächst er weiter. Kinder kümmern sich oft gern darum.",
  },
  {
    id: "s-preis-pro-kilo",
    category: "sparen",
    text: "Ein Blick auf den Kilopreis am Regal zeigt schnell, welche Packung wirklich günstiger ist.",
    detail:
      "Größer ist nicht immer billiger, und Angebote sind manchmal nur kleinere Packungen. Der Grundpreis steht klein auf jedem Schild.",
  },
  {
    id: "s-unten-im-regal",
    category: "sparen",
    text: "Die günstigen Produkte stehen oft ganz unten oder ganz oben im Regal – auf Augenhöhe liegen die teuren.",
    detail:
      "Läden platzieren gern das, was sie am liebsten verkaufen, in Griffhöhe. Kurz bücken lohnt sich.",
  },
  {
    id: "s-ganzes-gemuese",
    category: "sparen",
    text: "Ganzer Kohl, ganze Möhren, lose Zwiebeln: Unverarbeitetes Gemüse ist meist günstiger als geschnittenes oder abgepacktes.",
    detail:
      "Fürs Schneiden und Verpacken bezahlt man mit. Ein paar Minuten Schnippeln kann man auch gut mit den Kindern teilen.",
  },
  {
    id: "s-eintopf-tag",
    category: "sparen",
    text: "Ein Eintopf am Wochenende nimmt fast alles auf, was noch da ist, und schmeckt am zweiten Tag oft noch besser.",
    detail:
      "Kartoffeln, Möhren, Sellerie und Hülsenfrüchte sind günstige Basis. Ein großer Topf reicht für die ganze Familie und mehr.",
    steps: [
      "Zwiebeln und Gemüse anbraten",
      "Mit Brühe auffüllen, Kartoffeln oder Linsen dazu",
      "Eine Stunde köcheln lassen, abschmecken",
    ],
  },
  {
    id: "s-brot-selbst",
    category: "sparen",
    text: "Ein einfaches Brot aus Mehl, Wasser, Hefe und Salz ist schnell angerührt und kostet nur einen Bruchteil vom Bäckerbrot.",
    detail:
      "Ein Topfbrot im geschlossenen Bräter braucht kein Kneten, nur Zeit. Der Duft am Morgen ist gratis dazu.",
    steps: [
      "Teig abends kurz verrühren",
      "Über Nacht gehen lassen",
      "Morgens im heißen Topf backen",
    ],
  },
  {
    id: "s-getraenke-leitung",
    category: "sparen",
    text: "Leitungswasser ist in Deutschland gut und fast kostenlos. Mit Zitrone, Gurke oder Minze wird’s ein kleines Extra.",
    detail:
      "Kästen schleppen entfällt auch noch. Eine schöne Karaffe auf dem Tisch macht’s für Kinder spannender.",
  },
  {
    id: "s-pausenbrot",
    category: "sparen",
    text: "Pausenbrot und Snacks für unterwegs von zu Hause mitnehmen – Bäcker und Kiosk unterwegs gehen ganz schön ins Geld.",
    detail:
      "Am Vorabend schnell vorbereitet, morgens nur noch greifen. Reste vom Abendessen passen oft prima in die Brotdose.",
    steps: [
      "Abends Dosen und Obst bereitlegen",
      "Reste oder Brot einpacken",
      "Eine Flasche Wasser dazu",
    ],
  },
];
