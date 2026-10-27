// Vegetarisch (20)

import type { GerichtEintrag } from "@/lib/essen/gerichte/types";

export const VEGETARISCH: GerichtEintrag[] = [
  { title: "Omelett mit Gemüse", minutes: 15, category: "vegetarisch", needs: ["Eier", "Paprika"], beliebt: 3, kind: true },
  { title: "Gemüsepfanne mit Reis", minutes: 25, category: "vegetarisch", needs: ["Reis", "Möhren"], beliebt: 3, kind: true },
  {
    title: "Rührei mit Brot", minutes: 10, category: "vegetarisch", needs: ["Eier", "Brot"], usual: true, beliebt: 3, kind: true,
    zutaten: [[8, "", "Eier"], [100, "ml", "Milch"], [1, "EL", "Butter"], [8, "Scheiben", "Brot"], [1, "Bund", "Schnittlauch"], [null, "", "Salz, Pfeffer"]],
    schritte: ["Eier mit Milch, Salz und Pfeffer verquirlen.", "Butter in der Pfanne schmelzen, Eier hineingeben.", "Bei mittlerer Hitze langsam rühren, bis sie gerade stocken.", "Mit Schnittlauch bestreuen und mit Brot servieren."],
  },
  {
    title: "Ofen-Baguette", minutes: 15, category: "vegetarisch", needs: ["Baguette", "Käse"], beliebt: 3, kind: true,
    zutaten: [[2, "", "Baguettes"], [200, "g", "Schmand"], [2, "", "Tomaten"], [1, "", "Paprika"], [150, "g", "geriebener Käse"], [null, "", "Salz, Oregano"]],
    schritte: ["Ofen auf 220 Grad vorheizen.", "Baguettes längs halbieren und mit gewürztem Schmand bestreichen.", "Tomaten und Paprika klein würfeln und verteilen, Käse darüber.", "10 Minuten backen, bis der Käse goldbraun ist."],
  },
  {
    title: "Zucchini-Puffer", minutes: 25, category: "vegetarisch", needs: ["Zucchini", "Eier"], beliebt: 3, kind: true,
    zutaten: [[3, "", "Zucchini"], [2, "", "Eier"], [6, "EL", "Mehl"], [50, "g", "Parmesan"], [200, "g", "Joghurt"], [null, "", "Öl, Salz, Pfeffer"]],
    schritte: ["Zucchini grob raspeln, salzen und nach 5 Minuten gut ausdrücken.", "Mit Eiern, Mehl und Parmesan mischen.", "Kleine Puffer im Öl von jeder Seite 3 Minuten braten.", "Mit gewürztem Joghurt servieren."],
  },
  {
    title: "Kartoffel-Gemüse-Pfanne", minutes: 30, category: "vegetarisch", needs: ["Kartoffeln", "Paprika", "Zucchini"], beliebt: 3, kind: true,
    zutaten: [[800, "g", "Kartoffeln"], [1, "", "Paprika"], [1, "", "Zucchini"], [1, "", "Zwiebel"], [3, "EL", "Öl"], [null, "", "Salz, Paprikapulver, Kräuter"]],
    schritte: ["Kartoffeln in kleine Würfel schneiden und im Öl 15 Minuten braten.", "Paprika, Zucchini und Zwiebel würfeln und dazugeben.", "Weitere 8 Minuten braten, bis alles weich ist.", "Mit Salz, Paprikapulver und Kräutern würzen."],
  },
  {
    title: "Ofengemüse mit Feta", minutes: 35, category: "vegetarisch", needs: ["Paprika", "Zucchini", "Feta"], beliebt: 3, kind: false,
    zutaten: [[2, "", "Paprika"], [2, "", "Zucchini"], [2, "", "rote Zwiebeln"], [300, "g", "Kirschtomaten"], [200, "g", "Feta"], [3, "EL", "Olivenöl"], [null, "", "Salz, Oregano"]],
    schritte: ["Ofen auf 200 Grad vorheizen.", "Gemüse grob schneiden, mit Öl, Salz und Oregano auf einem Blech mischen.", "20 Minuten backen.", "Feta darüberbröseln und 10 Minuten weiterbacken."],
  },
  {
    title: "Nudelsalat", minutes: 20, category: "vegetarisch", needs: ["Nudeln", "Gurke", "Tomaten"], season: "sommer", beliebt: 4, kind: true,
    zutaten: [[400, "g", "Nudeln"], [1, "", "Gurke"], [250, "g", "Kirschtomaten"], [150, "g", "Mais"], [150, "g", "Joghurt"], [3, "EL", "Mayonnaise"], [null, "", "Salz, Pfeffer"]],
    schritte: ["Nudeln kochen und kalt abspülen.", "Gurke würfeln, Tomaten halbieren.", "Joghurt mit Mayonnaise verrühren und würzen.", "Alles mischen und kurz durchziehen lassen."],
  },
  {
    title: "Tomaten-Mozzarella mit Brot", minutes: 10, category: "vegetarisch", needs: ["Tomaten", "Mozzarella", "Brot"], season: "sommer", beliebt: 3, kind: true,
    zutaten: [[6, "", "Tomaten"], [250, "g", "Mozzarella"], [1, "Bund", "Basilikum"], [3, "EL", "Olivenöl"], [1, "", "Baguette"], [null, "", "Salz, Pfeffer"]],
    schritte: ["Tomaten und Mozzarella in Scheiben schneiden.", "Abwechselnd auf eine Platte legen.", "Mit Basilikum, Öl, Salz und Pfeffer anmachen.", "Mit Brot servieren."],
  },
  {
    title: "Kartoffel-Brokkoli-Auflauf", minutes: 45, category: "vegetarisch", needs: ["Kartoffeln", "Brokkoli", "Käse", "Sahne"], beliebt: 3, kind: true,
    zutaten: [[800, "g", "Kartoffeln"], [1, "", "Brokkoli"], [200, "ml", "Sahne"], [100, "ml", "Milch"], [150, "g", "Käse"], [null, "", "Salz, Muskat"]],
    schritte: ["Ofen auf 200 Grad vorheizen.", "Kartoffeln in Scheiben 8 Minuten vorkochen, Brokkoli die letzten 3 Minuten dazu.", "In eine Form schichten, Sahne und Milch würzen und darübergießen.", "Mit Käse bestreuen und 25 Minuten backen."],
  },
  {
    title: "Kartoffelgratin", minutes: 50, category: "vegetarisch", needs: ["Kartoffeln", "Sahne", "Käse"], beliebt: 4, kind: true,
    zutaten: [[1, "kg", "festkochende Kartoffeln"], [300, "ml", "Sahne"], [100, "ml", "Milch"], [1, "", "Knoblauchzehe"], [100, "g", "Käse"], [null, "", "Salz, Pfeffer, Muskat"]],
    schritte: ["Ofen auf 190 Grad vorheizen, eine Form mit Knoblauch ausreiben.", "Kartoffeln schälen und in dünne Scheiben hobeln.", "Dachziegelartig einschichten, Sahne und Milch würzen und darübergießen.", "Käse darüber und 40 Minuten backen."],
  },
  {
    title: "Kartoffelecken mit Kräuterquark", minutes: 40, category: "vegetarisch", needs: ["Kartoffeln", "Quark"], beliebt: 3, kind: true,
    zutaten: [[1, "kg", "Kartoffeln"], [3, "EL", "Öl"], [1, "TL", "Paprikapulver"], [500, "g", "Quark"], [100, "ml", "Milch"], [1, "Bund", "Kräuter"]],
    schritte: ["Ofen auf 220 Grad vorheizen.", "Kartoffeln waschen, in Spalten schneiden und mit Öl, Salz und Paprika mischen.", "Auf dem Blech 30 Minuten knusprig backen.", "Quark mit Milch und gehackten Kräutern verrühren und würzen."],
  },
  {
    title: "Gemüse-Frittata", minutes: 25, category: "vegetarisch", needs: ["Eier", "Kartoffeln", "Paprika"], beliebt: 2, kind: true,
    zutaten: [[8, "", "Eier"], [3, "", "gekochte Kartoffeln"], [1, "", "Paprika"], [100, "g", "Erbsen"], [50, "g", "Käse"], [null, "", "Salz, Pfeffer"]],
    schritte: ["Kartoffeln und Paprika würfeln und in einer ofenfesten Pfanne anbraten.", "Erbsen dazugeben.", "Eier mit Käse verquirlen, würzen und darübergießen.", "Bei kleiner Hitze zugedeckt 10 Minuten stocken lassen."],
  },
  {
    title: "Bunte Bowl mit Kichererbsen", minutes: 25, category: "vegetarisch", needs: ["Reis", "Kichererbsen", "Gurke", "Avocado"], beliebt: 3, kind: false,
    zutaten: [[250, "g", "Reis"], [1, "Dose", "Kichererbsen"], [1, "", "Gurke"], [2, "", "Avocados"], [2, "", "Möhren"], [200, "g", "Joghurt"], [null, "", "Salz, Paprikapulver, Zitrone"]],
    schritte: ["Reis kochen.", "Kichererbsen abtropfen lassen und mit Paprikapulver knusprig braten.", "Gurke, Avocado und Möhren klein schneiden.", "Alles in Schalen anrichten, Joghurt mit Zitrone und Salz darüber."],
  },
  {
    title: "Griechischer Salat mit Brot", minutes: 15, category: "vegetarisch", needs: ["Gurke", "Tomaten", "Feta", "Brot"], season: "sommer", beliebt: 3, kind: false,
    zutaten: [[1, "", "Gurke"], [4, "", "Tomaten"], [1, "", "Paprika"], [1, "", "rote Zwiebel"], [200, "g", "Feta"], [80, "g", "Oliven"], [1, "", "Fladenbrot"], [4, "EL", "Olivenöl"]],
    schritte: ["Gurke, Tomaten und Paprika in grobe Stücke schneiden.", "Zwiebel in Ringe schneiden, Oliven dazu.", "Mit Öl, Salz und Oregano anmachen.", "Feta in Würfeln darauf und mit Brot servieren."],
  },
  {
    title: "Reissalat mit Mais", minutes: 25, category: "vegetarisch", needs: ["Reis", "Mais", "Paprika", "Erbsen"], season: "sommer", beliebt: 2, kind: true,
    zutaten: [[250, "g", "Reis"], [150, "g", "Mais"], [1, "", "Paprika"], [150, "g", "Erbsen"], [150, "g", "Joghurt"], [2, "EL", "Mayonnaise"], [null, "", "Salz, Curry"]],
    schritte: ["Reis kochen und abkühlen lassen.", "Erbsen kurz kochen, Paprika würfeln.", "Joghurt mit Mayonnaise, Salz und Curry verrühren.", "Alles mischen und kalt stellen."],
  },
  {
    title: "Kartoffelsalat mit Gurke", minutes: 30, category: "vegetarisch", needs: ["Kartoffeln", "Gurke", "Eier"], season: "sommer", beliebt: 3, kind: true,
    zutaten: [[1, "kg", "festkochende Kartoffeln"], [1, "", "Gurke"], [3, "", "Eier"], [1, "", "Zwiebel"], [250, "ml", "Gemüsebrühe"], [3, "EL", "Essig"], [3, "EL", "Öl"]],
    schritte: ["Kartoffeln kochen, pellen und in Scheiben schneiden, Eier hart kochen.", "Zwiebel fein würfeln und mit warmer Brühe, Essig und Öl verrühren.", "Über die Kartoffeln gießen und ziehen lassen.", "Gurkenscheiben und Eier dazu und abschmecken."],
  },
  {
    title: "Gefüllte Zucchini", minutes: 40, category: "vegetarisch", needs: ["Zucchini", "Reis", "Feta", "Tomaten"], season: "sommer", beliebt: 3, kind: true,
    zutaten: [[4, "", "Zucchini"], [125, "g", "Reis"], [200, "g", "Feta"], [2, "", "Tomaten"], [1, "", "Zwiebel"], [null, "", "Salz, Pfeffer, Oregano"]],
    schritte: ["Ofen auf 200 Grad vorheizen, Reis kochen.", "Zucchini längs halbieren und aushöhlen, das Innere würfeln.", "Zucchiniwürfel mit Zwiebel und Tomaten anbraten, mit Reis und Feta mischen.", "In die Hälften füllen und 20 Minuten backen."],
  },
  {
    title: "Ratatouille mit Reis", minutes: 40, category: "vegetarisch", needs: ["Zucchini", "Auberginen", "Paprika", "Reis"], season: "sommer", beliebt: 3, kind: true,
    zutaten: [[1, "", "Aubergine"], [2, "", "Zucchini"], [2, "", "Paprika"], [1, "", "Zwiebel"], [1, "Dose", "gehackte Tomaten"], [250, "g", "Reis"], [null, "", "Olivenöl, Kräuter der Provence"]],
    schritte: ["Reis kochen.", "Gemüse in Würfel schneiden.", "Zwiebel und Aubergine in Öl anbraten, dann Zucchini und Paprika dazu.", "Tomaten und Kräuter dazugeben und 20 Minuten schmoren."],
  },
  {
    title: "Kürbis vom Blech mit Feta", minutes: 40, category: "vegetarisch", needs: ["Kürbis", "Feta", "Kartoffeln"], season: "herbst", beliebt: 2, kind: true,
    zutaten: [[1, "", "Hokkaido-Kürbis"], [500, "g", "Kartoffeln"], [2, "", "rote Zwiebeln"], [200, "g", "Feta"], [3, "EL", "Olivenöl"], [1, "EL", "Honig"]],
    schritte: ["Ofen auf 200 Grad vorheizen.", "Kürbis mit Schale in Spalten, Kartoffeln und Zwiebeln in Stücke schneiden.", "Mit Öl, Honig und Salz mischen und 25 Minuten backen.", "Feta darüberbröseln und 5 Minuten weiterbacken."],
  },
];
