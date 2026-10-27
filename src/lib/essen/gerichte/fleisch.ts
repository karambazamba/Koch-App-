// Geflügel & Fleisch schnell (14)

import type { GerichtEintrag } from "@/lib/essen/gerichte/types";

export const FLEISCH: GerichtEintrag[] = [
  { title: "Hähnchenpfanne mit Reis", minutes: 25, category: "fleisch", needs: ["Hähnchenbrust", "Reis", "Paprika"], beliebt: 3, kind: true },
  { title: "Ofen-Hähnchen mit Kartoffeln", minutes: 70, category: "fleisch", needs: ["Hähnchenkeulen", "Kartoffeln", "Möhren"], beliebt: 4, kind: true },
  {
    title: "Hack-Paprika-Pfanne mit Reis", minutes: 25, category: "fleisch", needs: ["Hackfleisch", "Paprika", "Reis"], beliebt: 3, kind: true,
    zutaten: [[500, "g", "Hackfleisch"], [3, "", "Paprika"], [1, "", "Zwiebel"], [1, "Dose", "gehackte Tomaten"], [250, "g", "Reis"], [null, "", "Salz, Pfeffer, Paprikapulver"]],
    schritte: ["Reis kochen.", "Hack krümelig anbraten, Zwiebelwürfel dazu.", "Paprika in Streifen dazugeben und 5 Minuten mitbraten.", "Tomaten dazu, 5 Minuten köcheln und kräftig würzen."],
  },
  {
    title: "Gefüllte Paprika", minutes: 45, category: "fleisch", needs: ["Paprika", "Hackfleisch", "Reis"], beliebt: 4, kind: true,
    zutaten: [[4, "", "große Paprika"], [400, "g", "Hackfleisch"], [100, "g", "Reis"], [1, "", "Zwiebel"], [500, "g", "passierte Tomaten"], [100, "g", "Käse"]],
    schritte: ["Ofen auf 200 Grad vorheizen, Reis 10 Minuten vorkochen.", "Hack mit Reis, Zwiebelwürfeln, Salz und Paprikapulver verkneten.", "Deckel der Paprika abschneiden, Kerne entfernen und füllen.", "In eine Form mit den gewürzten Tomaten stellen, Käse drauf und 30 Minuten backen."],
  },
  {
    title: "Köttbullar mit Kartoffelpüree", minutes: 30, category: "fleisch", needs: ["Hackfleisch", "Kartoffeln", "Preiselbeeren"], beliebt: 4, kind: true,
    zutaten: [[500, "g", "Hackfleisch"], [1, "", "Ei"], [3, "EL", "Paniermehl"], [1, "kg", "Kartoffeln"], [200, "ml", "Milch"], [200, "ml", "Sahne"], [200, "ml", "Brühe"], [4, "EL", "Preiselbeeren"]],
    schritte: ["Kartoffeln kochen und mit Milch und Butter zu Püree stampfen.", "Hack mit Ei, Paniermehl, Salz und Pfeffer verkneten und kleine Bällchen formen.", "Bällchen rundherum braun braten und herausnehmen.", "Bratensatz mit Brühe und Sahne ablöschen, einkochen und die Bällchen hineingeben.", "Mit Püree und Preiselbeeren servieren."],
  },
  {
    title: "Hähnchen-Nuggets mit Ofenkartoffeln", minutes: 35, category: "fleisch", needs: ["Hähnchenbrust", "Cornflakes", "Kartoffeln"], beliebt: 4, kind: true,
    zutaten: [[500, "g", "Hähnchenbrust"], [100, "g", "Cornflakes"], [2, "", "Eier"], [50, "g", "Mehl"], [1, "kg", "Kartoffeln"], [3, "EL", "Öl"]],
    schritte: ["Ofen auf 210 Grad vorheizen, Kartoffeln in Spalten mit Öl und Salz aufs Blech geben.", "Kartoffeln 10 Minuten vorbacken.", "Hähnchen in Stücke schneiden, in Mehl, Ei und zerbröselten Cornflakes wenden.", "Nuggets aufs Blech legen und 15 Minuten mitbacken."],
  },
  {
    title: "Hähnchenkeulen mit Ofengemüse", minutes: 50, category: "fleisch", needs: ["Hähnchenkeulen", "Paprika", "Kartoffeln"], beliebt: 4, kind: true,
    zutaten: [[4, "", "Hähnchenkeulen"], [2, "", "Paprika"], [800, "g", "Kartoffeln"], [2, "", "Zwiebeln"], [3, "EL", "Öl"], [null, "", "Salz, Paprikapulver, Rosmarin"]],
    schritte: ["Ofen auf 200 Grad vorheizen.", "Keulen mit Öl, Salz und Paprikapulver einreiben.", "Kartoffeln, Paprika und Zwiebeln grob schneiden, würzen und aufs Blech geben.", "Keulen darauflegen und 40 Minuten knusprig backen."],
  },
  {
    title: "Hähnchen-Geschnetzeltes mit Reis", minutes: 30, category: "fleisch", needs: ["Hähnchenbrust", "Champignons", "Sahne", "Reis"], beliebt: 4, kind: true,
    zutaten: [[500, "g", "Hähnchenbrust"], [250, "g", "Champignons"], [1, "", "Zwiebel"], [200, "ml", "Sahne"], [100, "ml", "Brühe"], [250, "g", "Reis"]],
    schritte: ["Reis kochen.", "Hähnchen in Streifen schneiden und portionsweise anbraten.", "Pilze und Zwiebel in Scheiben dazugeben und mitbraten.", "Mit Brühe und Sahne ablöschen, 5 Minuten köcheln und abschmecken."],
  },
  {
    title: "Gyros-Pfanne mit Reis", minutes: 25, category: "fleisch", needs: ["Gyrosfleisch", "Paprika", "Reis", "Joghurt"], beliebt: 4, kind: true,
    zutaten: [[600, "g", "Gyrosfleisch"], [1, "", "Paprika"], [2, "", "Zwiebeln"], [250, "g", "Reis"], [250, "g", "Joghurt"], [0.5, "", "Gurke"], [1, "", "Knoblauchzehe"]],
    schritte: ["Reis kochen.", "Gurke reiben, ausdrücken und mit Joghurt, Knoblauch und Salz zu Tzatziki verrühren.", "Gyros portionsweise scharf anbraten.", "Zwiebel- und Paprikastreifen dazu und 5 Minuten mitbraten."],
  },
  {
    title: "Hähnchen-Wraps", minutes: 20, category: "fleisch", needs: ["Wraps", "Hähnchenbrust", "Gurke", "Tomaten"], beliebt: 3, kind: true,
    zutaten: [[8, "", "Wraps"], [400, "g", "Hähnchenbrust"], [1, "", "Gurke"], [2, "", "Tomaten"], [1, "", "Salatherz"], [200, "g", "Joghurt"], [null, "", "Salz, Paprikapulver"]],
    schritte: ["Hähnchen in Streifen schneiden, würzen und braten.", "Gurke und Tomaten in Streifen schneiden, Salat zupfen.", "Joghurt mit Salz verrühren.", "Wraps erwärmen, belegen und aufrollen."],
  },
  {
    title: "Hamburger zum Selberbauen", minutes: 25, category: "fleisch", needs: ["Burgerbrötchen", "Hackfleisch", "Tomaten", "Gurke"], beliebt: 5, kind: true,
    zutaten: [[4, "", "Burgerbrötchen"], [500, "g", "Rinderhack"], [2, "", "Tomaten"], [1, "", "Gurke"], [4, "Scheiben", "Cheddar"], [1, "", "Salatherz"], [null, "", "Ketchup, Senf"]],
    schritte: ["Hack salzen, pfeffern und vier flache Patties formen.", "Von jeder Seite 3 Minuten braten, zum Schluss Käse darauf schmelzen lassen.", "Brötchen aufschneiden und kurz rösten.", "Tomaten, Gurke und Salat schneiden und alles zum Selberbauen auf den Tisch stellen."],
  },
  {
    title: "Zucchini-Hack-Auflauf", minutes: 40, category: "fleisch", needs: ["Zucchini", "Hackfleisch", "Tomaten", "Käse"], beliebt: 3, kind: true,
    zutaten: [[3, "", "Zucchini"], [400, "g", "Hackfleisch"], [1, "", "Zwiebel"], [500, "g", "passierte Tomaten"], [150, "g", "Käse"], [null, "", "Salz, Oregano"]],
    schritte: ["Ofen auf 200 Grad vorheizen.", "Hack mit Zwiebel anbraten, Tomaten dazu und würzen.", "Zucchini in Scheiben schneiden und abwechselnd mit der Hacksoße in eine Form schichten.", "Mit Käse bestreuen und 25 Minuten backen."],
  },
  {
    title: "Hähnchen-Gemüse vom Blech", minutes: 40, category: "fleisch", needs: ["Hähnchenbrust", "Paprika", "Zucchini", "Kartoffeln"], beliebt: 3, kind: true,
    zutaten: [[500, "g", "Hähnchenbrust"], [2, "", "Paprika"], [1, "", "Zucchini"], [600, "g", "Kartoffeln"], [3, "EL", "Öl"], [null, "", "Salz, Paprikapulver, Kräuter"]],
    schritte: ["Ofen auf 200 Grad vorheizen.", "Kartoffeln würfeln, mit Öl und Salz aufs Blech geben und 15 Minuten backen.", "Hähnchen und Gemüse würfeln, würzen und dazugeben.", "Weitere 20 Minuten backen."],
  },
  {
    title: "Hähnchenspieße mit Reis", minutes: 30, category: "fleisch", needs: ["Hähnchenbrust", "Paprika", "Zucchini", "Reis"], season: "sommer", beliebt: 3, kind: true,
    zutaten: [[600, "g", "Hähnchenbrust"], [1, "", "Paprika"], [1, "", "Zucchini"], [1, "", "rote Zwiebel"], [250, "g", "Reis"], [3, "EL", "Öl"], [null, "", "Salz, Paprikapulver"]],
    schritte: ["Reis kochen.", "Hähnchen und Gemüse in Stücke schneiden und abwechselnd auf Spieße stecken.", "Mit Öl und Gewürzen bestreichen.", "In der Grillpfanne oder auf dem Grill rundherum 10 Minuten braten."],
  },
];
