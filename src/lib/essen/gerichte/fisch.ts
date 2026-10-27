// Fisch (15)

import type { GerichtEintrag } from "@/lib/essen/gerichte/types";

export const FISCH: GerichtEintrag[] = [
  { title: "Thunfisch-Nudeln", minutes: 20, category: "fisch", needs: ["Nudeln", "Thunfisch", "Tomaten"], beliebt: 3, kind: true },
  { title: "Fischstäbchen mit Kartoffelpüree", minutes: 25, category: "fisch", needs: ["Fischstäbchen", "Kartoffeln", "Milch"], beliebt: 5, kind: true },
  {
    title: "Lachs mit Ofenkartoffeln", minutes: 35, category: "fisch", needs: ["Lachs", "Kartoffeln"], beliebt: 4, kind: true,
    zutaten: [[4, "", "Lachsfilets"], [1, "kg", "kleine Kartoffeln"], [3, "EL", "Olivenöl"], [1, "", "Zitrone"], [200, "g", "Joghurt"], [1, "Bund", "Dill"]],
    schritte: ["Ofen auf 200 Grad vorheizen.", "Kartoffeln halbieren, mit Öl und Salz aufs Blech geben und 20 Minuten backen.", "Lachs salzen, mit Zitronenscheiben dazulegen und 12 Minuten mitbacken.", "Joghurt mit Dill und Zitronensaft verrühren und dazu reichen."],
  },
  {
    title: "Seelachs mit Kartoffelpüree", minutes: 25, category: "fisch", needs: ["Seelachsfilet", "Kartoffeln", "Milch"], beliebt: 3, kind: true,
    zutaten: [[600, "g", "Seelachsfilet"], [1, "kg", "mehligkochende Kartoffeln"], [200, "ml", "Milch"], [2, "EL", "Butter"], [2, "EL", "Mehl"], [1, "", "Zitrone"]],
    schritte: ["Kartoffeln schälen und in Salzwasser 20 Minuten kochen.", "Fisch salzen, in Mehl wenden und in Butter von jeder Seite 3 Minuten braten.", "Kartoffeln mit warmer Milch und Butter zu Püree stampfen.", "Fisch mit Zitrone und Püree servieren."],
  },
  {
    title: "Lachs-Sahne-Nudeln", minutes: 20, category: "fisch", needs: ["Nudeln", "Lachs", "Sahne", "Spinat"], beliebt: 4, kind: true,
    zutaten: [[500, "g", "Nudeln"], [300, "g", "Lachsfilet"], [250, "ml", "Sahne"], [150, "g", "Blattspinat"], [1, "", "Zitrone"], [null, "", "Salz, Pfeffer"]],
    schritte: ["Nudeln in Salzwasser kochen.", "Lachs würfeln und kurz anbraten.", "Sahne angießen, Spinat dazu und zusammenfallen lassen.", "Mit Zitrone abschmecken und mit den Nudeln mischen."],
  },
  {
    title: "Backfisch mit Kartoffeln", minutes: 30, category: "fisch", needs: ["Backfisch", "Kartoffeln", "Gurke"], beliebt: 4, kind: true,
    zutaten: [[4, "", "Backfisch-Filets (TK)"], [1, "kg", "Kartoffeln"], [1, "", "Gurke"], [150, "g", "Joghurt"], [2, "EL", "Remoulade"], [1, "", "Zitrone"]],
    schritte: ["Backfisch nach Packung im Ofen backen.", "Kartoffeln schälen und kochen.", "Gurke in dünne Scheiben hobeln und mit Joghurt, Salz und Pfeffer mischen.", "Fisch mit Zitrone, Remoulade, Kartoffeln und Gurkensalat servieren."],
  },
  {
    title: "Fischstäbchen-Wraps", minutes: 20, category: "fisch", needs: ["Wraps", "Fischstäbchen", "Gurke", "Joghurt"], beliebt: 3, kind: true,
    zutaten: [[15, "", "Fischstäbchen"], [8, "", "Wraps"], [1, "", "Gurke"], [1, "", "Salatherz"], [200, "g", "Joghurt"], [null, "", "Salz, Dill"]],
    schritte: ["Fischstäbchen nach Packung knusprig braten oder backen.", "Gurke in Streifen schneiden, Salat zupfen.", "Joghurt mit Dill und Salz verrühren.", "Wraps kurz erwärmen, belegen und aufrollen."],
  },
  {
    title: "Thunfisch-Pizza", minutes: 30, category: "fisch", needs: ["Pizzateig", "Thunfisch", "Tomaten", "Mais"], beliebt: 3, kind: true,
    zutaten: [[2, "Rollen", "Pizzateig"], [400, "g", "passierte Tomaten"], [2, "Dosen", "Thunfisch"], [150, "g", "Mais"], [1, "", "rote Zwiebel"], [200, "g", "geriebener Käse"]],
    schritte: ["Ofen auf 230 Grad vorheizen.", "Tomaten würzen und auf den Teig streichen.", "Thunfisch, Mais und Zwiebelringe verteilen, Käse darüber.", "12 Minuten backen."],
  },
  {
    title: "Lachs-Spinat-Auflauf", minutes: 40, category: "fisch", needs: ["Lachs", "Spinat", "Kartoffeln", "Sahne"], beliebt: 3, kind: true,
    zutaten: [[400, "g", "Lachsfilet"], [450, "g", "Blattspinat (TK)"], [800, "g", "Kartoffeln"], [200, "ml", "Sahne"], [100, "g", "Käse"], [null, "", "Salz, Muskat"]],
    schritte: ["Ofen auf 200 Grad vorheizen, Kartoffeln in Scheiben 8 Minuten vorkochen.", "Spinat auftauen und ausdrücken, Lachs würfeln.", "Alles in eine Form schichten, gewürzte Sahne darübergießen.", "Mit Käse bestreuen und 25 Minuten backen."],
  },
  {
    title: "Kabeljau mit Senfsoße und Kartoffeln", minutes: 30, category: "fisch", needs: ["Kabeljau", "Kartoffeln", "Sahne"], beliebt: 3, kind: false,
    zutaten: [[600, "g", "Kabeljaufilet"], [1, "kg", "Kartoffeln"], [200, "ml", "Sahne"], [150, "ml", "Gemüsebrühe"], [2, "EL", "mittelscharfer Senf"], [1, "Bund", "Dill"]],
    schritte: ["Kartoffeln schälen und in Salzwasser kochen.", "Brühe und Sahne aufkochen, Senf einrühren.", "Fisch in Stücken in die Soße legen und 8 Minuten gar ziehen lassen.", "Mit Dill bestreuen und mit den Kartoffeln servieren."],
  },
  {
    title: "Fischcurry mit Reis", minutes: 30, category: "fisch", needs: ["Seelachsfilet", "Kokosmilch", "Reis", "Paprika"], beliebt: 3, kind: true,
    zutaten: [[600, "g", "Seelachsfilet"], [400, "ml", "Kokosmilch"], [1, "", "Paprika"], [1, "", "Zwiebel"], [1, "EL", "Currypulver"], [250, "g", "Reis"], [1, "", "Limette"]],
    schritte: ["Reis kochen.", "Zwiebel und Paprika würfeln und mit dem Curry andünsten.", "Kokosmilch angießen und 5 Minuten köcheln.", "Fisch in Stücken hineinlegen und 6 Minuten ziehen lassen, mit Limette abschmecken."],
  },
  {
    title: "Ofenfisch mit Tomaten", minutes: 30, category: "fisch", needs: ["Seelachsfilet", "Tomaten", "Kartoffeln"], beliebt: 3, kind: true,
    zutaten: [[600, "g", "Seelachsfilet"], [400, "g", "Kirschtomaten"], [800, "g", "kleine Kartoffeln"], [2, "EL", "Olivenöl"], [1, "", "Zitrone"], [null, "", "Salz, Oregano"]],
    schritte: ["Ofen auf 200 Grad vorheizen, Kartoffeln halbieren und 15 Minuten vorbacken.", "Fisch salzen und mit den halbierten Tomaten in eine Form legen.", "Mit Öl, Oregano und Zitronensaft beträufeln.", "15 Minuten zusammen mit den Kartoffeln backen."],
  },
  {
    title: "Thunfisch-Bowl mit Reis", minutes: 15, category: "fisch", needs: ["Thunfisch", "Reis", "Gurke", "Mais"], beliebt: 2, kind: true,
    zutaten: [[250, "g", "Reis"], [2, "Dosen", "Thunfisch"], [1, "", "Gurke"], [150, "g", "Mais"], [1, "", "Avocado"], [3, "EL", "Sojasoße"], [1, "EL", "Sesam"]],
    schritte: ["Reis kochen.", "Gurke und Avocado würfeln, Thunfisch abtropfen lassen.", "Reis in Schalen geben und alles darauf verteilen.", "Mit Sojasoße und Sesam servieren."],
  },
  {
    title: "Lachs mit Spargel und Kartoffeln", minutes: 35, category: "fisch", needs: ["Lachs", "Spargel", "Kartoffeln"], season: "fruehling", beliebt: 4, kind: true,
    zutaten: [[4, "", "Lachsfilets"], [1, "kg", "weißer Spargel"], [800, "g", "Kartoffeln"], [80, "g", "Butter"], [1, "", "Zitrone"]],
    schritte: ["Kartoffeln schälen und kochen.", "Spargel schälen und in Salzwasser 12 Minuten garen.", "Lachs salzen und von jeder Seite 4 Minuten braten.", "Butter mit Zitronensaft schmelzen und über alles geben."],
  },
  {
    title: "Garnelen-Pfanne mit Reis", minutes: 25, category: "fisch", needs: ["Garnelen", "Paprika", "Zucchini", "Reis"], beliebt: 3, kind: false,
    zutaten: [[400, "g", "Garnelen (TK)"], [1, "", "Paprika"], [1, "", "Zucchini"], [2, "", "Knoblauchzehen"], [250, "g", "Reis"], [1, "", "Zitrone"], [2, "EL", "Olivenöl"]],
    schritte: ["Reis kochen, Garnelen auftauen und trocken tupfen.", "Paprika und Zucchini würfeln und im Öl 5 Minuten braten.", "Garnelen und Knoblauch dazu und 3 Minuten braten, bis sie rosa sind.", "Mit Zitrone, Salz und Pfeffer abschmecken."],
  },
];
