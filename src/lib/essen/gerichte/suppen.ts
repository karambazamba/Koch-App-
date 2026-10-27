// Suppen & Eintöpfe (11)

import type { GerichtEintrag } from "@/lib/essen/gerichte/types";

export const SUPPEN: GerichtEintrag[] = [
  { title: "Tomatensuppe mit Toast", minutes: 15, category: "vegetarisch", needs: ["Tomaten", "Toast"], beliebt: 4, kind: true },
  { title: "Kartoffelsuppe", minutes: 30, category: "vegetarisch", needs: ["Kartoffeln", "Möhren"], season: "herbst", beliebt: 5, kind: true },
  {
    title: "Kürbissuppe", minutes: 35, category: "vegetarisch", needs: ["Kürbis", "Kartoffeln"], season: "herbst", beliebt: 4, kind: true,
    zutaten: [[1, "", "Hokkaido-Kürbis"], [2, "", "Kartoffeln"], [1, "", "Zwiebel"], [1, "l", "Gemüsebrühe"], [200, "ml", "Kokosmilch oder Sahne"], [null, "", "Salz, Pfeffer, Ingwer"]],
    schritte: ["Kürbis mit Schale würfeln, Kartoffeln und Zwiebel schälen und würfeln.", "Zwiebel andünsten, Kürbis und Kartoffeln kurz mitdünsten.", "Brühe angießen und 20 Minuten weich kochen.", "Kokosmilch dazu, fein pürieren und abschmecken."],
  },
  {
    title: "Linsensuppe", minutes: 35, category: "vegetarisch", needs: ["Linsen", "Möhren", "Kartoffeln"], season: "winter", beliebt: 4, kind: true,
    zutaten: [[250, "g", "Tellerlinsen"], [3, "", "Möhren"], [3, "", "Kartoffeln"], [1, "", "Zwiebel"], [1.2, "l", "Gemüsebrühe"], [2, "EL", "Essig"]],
    schritte: ["Zwiebel, Möhren und Kartoffeln würfeln.", "Zwiebel andünsten, Gemüse und Linsen dazu.", "Brühe angießen und 25 Minuten köcheln.", "Mit Essig, Salz und Pfeffer abschmecken."],
  },
  {
    title: "Brokkolisuppe", minutes: 25, category: "vegetarisch", needs: ["Brokkoli", "Kartoffeln", "Sahne"], beliebt: 3, kind: true,
    zutaten: [[1, "", "großer Brokkoli"], [2, "", "Kartoffeln"], [1, "", "Zwiebel"], [1, "l", "Gemüsebrühe"], [150, "ml", "Sahne"], [null, "", "Salz, Muskat"]],
    schritte: ["Brokkoli in Röschen teilen, Kartoffeln und Zwiebel würfeln.", "Zwiebel andünsten, Gemüse und Brühe dazu.", "15 Minuten köcheln.", "Sahne dazu, pürieren und mit Muskat abschmecken."],
  },
  {
    title: "Gemüsesuppe mit Nudeln", minutes: 30, category: "vegetarisch", needs: ["Suppennudeln", "Möhren", "Lauch"], beliebt: 3, kind: true,
    zutaten: [[100, "g", "Suppennudeln"], [3, "", "Möhren"], [1, "Stange", "Lauch"], [2, "", "Kartoffeln"], [1.5, "l", "Gemüsebrühe"], [1, "Bund", "Petersilie"]],
    schritte: ["Möhren und Kartoffeln würfeln, Lauch in Ringe schneiden.", "Gemüse in der Brühe 15 Minuten köcheln.", "Nudeln dazu und nach Packung garen.", "Mit Petersilie bestreuen."],
  },
  {
    title: "Minestrone", minutes: 35, category: "vegetarisch", needs: ["Nudeln", "Bohnen", "Zucchini", "Tomaten"], season: "herbst", beliebt: 3, kind: true,
    zutaten: [[100, "g", "kleine Nudeln"], [1, "Dose", "weiße Bohnen"], [1, "", "Zucchini"], [2, "", "Möhren"], [1, "Dose", "gehackte Tomaten"], [1.2, "l", "Gemüsebrühe"], [40, "g", "Parmesan"]],
    schritte: ["Möhren und Zucchini würfeln und in Öl andünsten.", "Tomaten und Brühe dazu und 10 Minuten köcheln.", "Nudeln und Bohnen dazugeben und 10 Minuten weiterköcheln.", "Mit Parmesan servieren."],
  },
  {
    title: "Erbsensuppe", minutes: 35, category: "vegetarisch", needs: ["Erbsen", "Kartoffeln", "Möhren"], season: "winter", beliebt: 4, kind: true,
    zutaten: [[600, "g", "Erbsen (TK)"], [3, "", "Kartoffeln"], [2, "", "Möhren"], [1, "", "Zwiebel"], [1.2, "l", "Gemüsebrühe"], [1, "TL", "Majoran"]],
    schritte: ["Zwiebel, Kartoffeln und Möhren würfeln und andünsten.", "Brühe angießen und 15 Minuten köcheln.", "Erbsen dazu und 5 Minuten mitkochen.", "Die Hälfte pürieren und mit Majoran abschmecken."],
  },
  {
    title: "Gemüseeintopf", minutes: 40, category: "vegetarisch", needs: ["Kartoffeln", "Möhren", "Bohnen"], season: "winter", beliebt: 3, kind: true,
    zutaten: [[600, "g", "Kartoffeln"], [3, "", "Möhren"], [300, "g", "grüne Bohnen"], [1, "Stange", "Lauch"], [1.5, "l", "Gemüsebrühe"], [1, "Bund", "Petersilie"]],
    schritte: ["Kartoffeln und Möhren würfeln, Bohnen in Stücke, Lauch in Ringe schneiden.", "Lauch andünsten, übriges Gemüse und Brühe dazu.", "25 Minuten köcheln.", "Mit Salz, Pfeffer und Petersilie abschmecken."],
  },
  {
    title: "Hühnersuppe mit Nudeln", minutes: 40, category: "fleisch", needs: ["Hähnchenschenkel", "Suppennudeln", "Möhren"], season: "winter", beliebt: 4, kind: true,
    zutaten: [[4, "", "Hähnchenschenkel"], [150, "g", "Suppennudeln"], [3, "", "Möhren"], [0.5, "", "Sellerieknolle"], [1, "Stange", "Lauch"], [1, "Bund", "Petersilie"]],
    schritte: ["Hähnchen mit 2 Litern Salzwasser aufkochen und 25 Minuten ziehen lassen.", "Fleisch herausnehmen, von den Knochen lösen und zerzupfen.", "Gemüse würfeln und in der Brühe 10 Minuten garen.", "Nudeln und Fleisch dazu, Nudeln garen und mit Petersilie servieren."],
  },
  {
    title: "Linseneintopf mit Würstchen", minutes: 45, category: "fleisch", needs: ["Linsen", "Kartoffeln", "Würstchen", "Möhren"], season: "winter", beliebt: 4, kind: true,
    zutaten: [[300, "g", "Tellerlinsen"], [4, "", "Wiener Würstchen"], [3, "", "Kartoffeln"], [2, "", "Möhren"], [1, "", "Zwiebel"], [1.5, "l", "Gemüsebrühe"], [2, "EL", "Essig"]],
    schritte: ["Zwiebel, Kartoffeln und Möhren würfeln.", "Zwiebel andünsten, Gemüse, Linsen und Brühe dazu.", "30 Minuten köcheln, bis die Linsen weich sind.", "Würstchen in Scheiben darin erwärmen und mit Essig abschmecken."],
  },
];
