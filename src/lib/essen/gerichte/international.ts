// Mexikanisch, Orient & mehr (10)

import type { GerichtEintrag } from "@/lib/essen/gerichte/types";

export const INTERNATIONAL: GerichtEintrag[] = [
  { title: "Shakshuka", minutes: 25, category: "vegetarisch", needs: ["Tomaten", "Paprika", "Eier", "Feta"], beliebt: 3, kind: true },
  { title: "Falafel-Wraps", minutes: 30, category: "vegetarisch", needs: ["Falafel-Mischung", "Wraps", "Joghurt", "Gurke"], beliebt: 3, kind: true },
  { title: "Enchiladas aus dem Ofen", minutes: 55, category: "fleisch", needs: ["Tortillas", "Hackfleisch", "Kidneybohnen", "Käse"], beliebt: 3, kind: true },
  {
    title: "Chili con Carne", minutes: 40, category: "fleisch", needs: ["Hackfleisch", "Kidneybohnen", "Tomaten", "Paprika"], beliebt: 5, kind: true,
    zutaten: [[500, "g", "Rinderhack"], [1, "Dose", "Kidneybohnen"], [1, "Dose", "Mais"], [2, "Dosen", "gehackte Tomaten"], [1, "", "Paprika"], [1, "", "Zwiebel"], [null, "", "Salz, Kreuzkümmel, Chili"]],
    schritte: ["Hack krümelig anbraten, Zwiebel und Paprika gewürfelt dazu.", "Tomaten und Gewürze dazugeben.", "Bohnen und Mais abtropfen lassen und unterrühren.", "20 Minuten köcheln lassen und abschmecken."],
  },
  {
    title: "Wraps mit Gemüse", minutes: 15, category: "vegetarisch", needs: ["Wraps", "Paprika", "Gurke"], beliebt: 3, kind: true,
    zutaten: [[8, "", "Wraps"], [1, "", "Paprika"], [1, "", "Gurke"], [150, "g", "Mais"], [200, "g", "Frischkäse"], [100, "g", "geriebener Käse"]],
    schritte: ["Paprika und Gurke in Streifen schneiden, Mais abtropfen lassen.", "Wraps dünn mit Frischkäse bestreichen.", "Gemüse und Käse darauf verteilen.", "Fest aufrollen und schräg halbieren."],
  },
  {
    title: "Chili sin Carne", minutes: 35, category: "vegetarisch", needs: ["Kidneybohnen", "Mais", "Tomaten"], season: "winter", beliebt: 3, kind: true,
    zutaten: [[2, "Dosen", "Kidneybohnen"], [1, "Dose", "Mais"], [2, "Dosen", "gehackte Tomaten"], [1, "", "Paprika"], [1, "", "Süßkartoffel"], [1, "", "Zwiebel"], [null, "", "Salz, Kreuzkümmel, Chili"]],
    schritte: ["Zwiebel, Paprika und Süßkartoffel würfeln und andünsten.", "Tomaten und Gewürze dazu und 10 Minuten köcheln.", "Bohnen und Mais abtropfen lassen und unterrühren.", "Weitere 15 Minuten köcheln, bis die Süßkartoffel weich ist."],
  },
  {
    title: "Couscous-Pfanne mit Gemüse", minutes: 20, category: "vegetarisch", needs: ["Couscous", "Paprika", "Zucchini", "Feta"], beliebt: 3, kind: true,
    zutaten: [[250, "g", "Couscous"], [1, "", "Paprika"], [1, "", "Zucchini"], [1, "", "Zwiebel"], [150, "g", "Feta"], [300, "ml", "Gemüsebrühe"], [1, "TL", "Kreuzkümmel"]],
    schritte: ["Couscous mit heißer Brühe übergießen und 5 Minuten quellen lassen.", "Gemüse würfeln und mit dem Kreuzkümmel in Öl braten.", "Couscous auflockern und unter das Gemüse mischen.", "Feta darüberbröseln."],
  },
  {
    title: "Quesadillas mit Bohnen", minutes: 20, category: "vegetarisch", needs: ["Tortillas", "Kidneybohnen", "Mais", "Käse"], beliebt: 3, kind: true,
    zutaten: [[8, "", "Tortillas"], [1, "Dose", "Kidneybohnen"], [1, "Dose", "Mais"], [200, "g", "geriebener Käse"], [1, "", "Paprika"], [150, "g", "Schmand"]],
    schritte: ["Bohnen leicht zerdrücken, Mais abtropfen lassen und Paprika fein würfeln.", "Auf vier Tortillas verteilen, Käse darüber und je eine Tortilla darauflegen.", "In einer Pfanne ohne Fett von jeder Seite 3 Minuten goldbraun backen.", "In Stücke schneiden und mit Schmand servieren."],
  },
  {
    title: "Tacos mit Hack", minutes: 25, category: "fleisch", needs: ["Tacoschalen", "Hackfleisch", "Mais", "Tomaten"], beliebt: 4, kind: true,
    zutaten: [[12, "", "Tacoschalen"], [500, "g", "Hackfleisch"], [1, "Dose", "Mais"], [3, "", "Tomaten"], [1, "", "Salatherz"], [150, "g", "geriebener Käse"], [150, "g", "Schmand"]],
    schritte: ["Hack krümelig braten und mit Salz, Paprikapulver und Kreuzkümmel würzen.", "Tomaten würfeln, Salat in Streifen schneiden.", "Tacoschalen nach Packung im Ofen erwärmen.", "Alles auf den Tisch stellen und selbst füllen."],
  },
  {
    title: "Fajitas mit Hähnchen", minutes: 25, category: "fleisch", needs: ["Wraps", "Hähnchenbrust", "Paprika", "Schmand"], beliebt: 3, kind: true, besonders: true,
    zutaten: [[8, "", "Wraps"], [500, "g", "Hähnchenbrust"], [2, "", "Paprika"], [1, "", "rote Zwiebel"], [150, "g", "Schmand"], [1, "", "Limette"], [null, "", "Salz, Paprikapulver, Kreuzkümmel"]],
    schritte: ["Hähnchen in Streifen schneiden und mit den Gewürzen mischen.", "In einer heißen Pfanne 5 Minuten scharf anbraten.", "Paprika und Zwiebel in Streifen dazu und 4 Minuten mitbraten, mit Limette beträufeln.", "Wraps erwärmen, füllen und mit Schmand servieren."],
  },
];
