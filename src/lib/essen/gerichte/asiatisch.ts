// Asiatisch (20)

import type { GerichtEintrag } from "@/lib/essen/gerichte/types";

export const ASIATISCH: GerichtEintrag[] = [
  { title: "Reispfanne mit Ei", minutes: 20, category: "vegetarisch", needs: ["Reis", "Eier", "Erbsen"], usual: true, beliebt: 3, kind: true },
  { title: "Pad Thai", minutes: 30, category: "vegetarisch", needs: ["Reisbandnudeln", "Eier", "Sojasprossen", "Erdnüsse"], beliebt: 4, kind: true },
  { title: "Teriyaki-Hähnchen", minutes: 25, category: "fleisch", needs: ["Hähnchenbrust", "Reis", "Brokkoli"], beliebt: 4, kind: true },
  { title: "Kichererbsen-Curry", minutes: 30, category: "vegetarisch", needs: ["Kichererbsen", "Kokosmilch", "Spinat", "Reis"], beliebt: 3, kind: true },
  { title: "Bibimbap", minutes: 35, category: "fleisch", needs: ["Reis", "Hackfleisch", "Möhren", "Spinat"], beliebt: 2, kind: true },
  { title: "Ramen mit Ei", minutes: 35, category: "fleisch", needs: ["Ramen-Nudeln", "Hähnchenbrust", "Eier"], beliebt: 3, kind: true },
  { title: "Mango-Curry mit Reis", minutes: 30, category: "fleisch", needs: ["Hähnchenbrust", "Mango", "Kokosmilch", "Reis"], beliebt: 2, kind: true },
  {
    title: "Gebratene Nudeln mit Gemüse", minutes: 20, category: "vegetarisch", needs: ["Mie-Nudeln", "Möhren", "Paprika", "Eier"], beliebt: 4, kind: true,
    zutaten: [[250, "g", "Mie-Nudeln"], [2, "", "Möhren"], [1, "", "Paprika"], [200, "g", "Weißkohl"], [2, "", "Eier"], [4, "EL", "Sojasoße"], [1, "EL", "Öl"]],
    schritte: ["Mie-Nudeln nach Packung einweichen und abtropfen lassen.", "Möhren, Paprika und Kohl in feine Streifen schneiden.", "Gemüse im heißen Öl 4 Minuten unter Rühren braten.", "Eier dazugeben und stocken lassen, Nudeln und Sojasoße unterschwenken."],
  },
  {
    title: "Gemüsecurry mit Reis", minutes: 30, category: "vegetarisch", needs: ["Reis", "Kokosmilch", "Paprika", "Zucchini"], beliebt: 3, kind: true,
    zutaten: [[250, "g", "Reis"], [400, "ml", "Kokosmilch"], [1, "", "Paprika"], [1, "", "Zucchini"], [2, "", "Möhren"], [1, "", "Zwiebel"], [1, "EL", "Currypulver"]],
    schritte: ["Reis kochen.", "Zwiebel würfeln und andünsten, Currypulver kurz mitrösten.", "Gemüse würfeln, dazugeben und 3 Minuten braten.", "Kokosmilch angießen und 12 Minuten köcheln, würzen."],
  },
  {
    title: "Rote-Linsen-Dal mit Reis", minutes: 30, category: "vegetarisch", needs: ["Linsen", "Kokosmilch", "Reis"], beliebt: 3, kind: true,
    zutaten: [[250, "g", "rote Linsen"], [400, "ml", "Kokosmilch"], [1, "Dose", "gehackte Tomaten"], [1, "", "Zwiebel"], [1, "Stück", "Ingwer"], [1, "EL", "Currypulver"], [250, "g", "Reis"]],
    schritte: ["Reis kochen.", "Zwiebel und Ingwer fein hacken und mit dem Curry andünsten.", "Linsen, Tomaten, Kokosmilch und 300 ml Wasser dazu.", "15 Minuten köcheln, bis die Linsen zerfallen, salzen."],
  },
  {
    title: "Knuspriger Tofu mit Reis und Brokkoli", minutes: 30, category: "vegetarisch", needs: ["Tofu", "Reis", "Brokkoli"], beliebt: 2, kind: true,
    zutaten: [[400, "g", "Tofu"], [3, "EL", "Speisestärke"], [250, "g", "Reis"], [1, "", "Brokkoli"], [4, "EL", "Sojasoße"], [1, "EL", "Honig"], [1, "EL", "Sesam"]],
    schritte: ["Reis kochen, Brokkoli in Röschen die letzten 5 Minuten darüber dämpfen.", "Tofu trocken tupfen, würfeln und in Stärke wenden.", "Im heißen Öl rundherum knusprig braten.", "Sojasoße und Honig dazu, kurz schwenken und mit Sesam bestreuen."],
  },
  {
    title: "Hähnchen-Curry mit Reis", minutes: 30, category: "fleisch", needs: ["Hähnchenbrust", "Kokosmilch", "Reis", "Erbsen"], beliebt: 4, kind: true,
    zutaten: [[500, "g", "Hähnchenbrust"], [400, "ml", "Kokosmilch"], [150, "g", "Erbsen"], [1, "", "Zwiebel"], [1, "EL", "Currypulver"], [250, "g", "Reis"]],
    schritte: ["Reis kochen.", "Hähnchen würfeln und anbraten, Zwiebel dazu.", "Currypulver kurz mitrösten, Kokosmilch angießen.", "Erbsen dazu, 10 Minuten köcheln und abschmecken."],
  },
  {
    title: "Wok-Nudeln mit Hähnchen", minutes: 20, category: "fleisch", needs: ["Mie-Nudeln", "Hähnchenbrust", "Paprika"], beliebt: 4, kind: true,
    zutaten: [[250, "g", "Mie-Nudeln"], [400, "g", "Hähnchenbrust"], [1, "", "Paprika"], [2, "", "Möhren"], [3, "", "Frühlingszwiebeln"], [5, "EL", "Sojasoße"]],
    schritte: ["Nudeln nach Packung einweichen.", "Hähnchen in Streifen schneiden und im Wok scharf anbraten.", "Gemüse in Streifen dazu und 4 Minuten mitbraten.", "Nudeln und Sojasoße unterschwenken."],
  },
  {
    title: "Nasi Goreng", minutes: 25, category: "fleisch", needs: ["Reis", "Hähnchenbrust", "Eier", "Erbsen"], beliebt: 4, kind: true,
    zutaten: [[250, "g", "Reis (am besten vom Vortag)"], [300, "g", "Hähnchenbrust"], [4, "", "Eier"], [150, "g", "Erbsen"], [2, "", "Möhren"], [4, "EL", "Sojasoße"], [1, "TL", "Sambal Oelek"]],
    schritte: ["Reis kochen und auskühlen lassen.", "Hähnchen würfeln und anbraten, Möhrenwürfel und Erbsen dazu.", "Reis dazugeben und mit Sojasoße und Sambal braten.", "Spiegeleier braten und auf den Reis legen."],
  },
  {
    title: "Süßkartoffel-Curry", minutes: 30, category: "vegetarisch", needs: ["Süßkartoffeln", "Kokosmilch", "Spinat", "Reis"], season: "herbst", beliebt: 3, kind: true,
    zutaten: [[600, "g", "Süßkartoffeln"], [400, "ml", "Kokosmilch"], [150, "g", "Blattspinat"], [1, "", "Zwiebel"], [1, "EL", "Currypaste"], [250, "g", "Reis"]],
    schritte: ["Reis kochen.", "Zwiebel würfeln und mit der Currypaste andünsten.", "Süßkartoffeln würfeln, mit Kokosmilch und 200 ml Wasser 15 Minuten köcheln.", "Spinat unterheben, zusammenfallen lassen und abschmecken."],
  },
  {
    title: "Hähnchen süß-sauer mit Reis", minutes: 30, category: "fleisch", needs: ["Hähnchenbrust", "Paprika", "Ananas", "Reis"], beliebt: 4, kind: true,
    zutaten: [[500, "g", "Hähnchenbrust"], [2, "", "Paprika"], [1, "Dose", "Ananasstücke"], [4, "EL", "Ketchup"], [3, "EL", "Essig"], [2, "EL", "Sojasoße"], [2, "EL", "Speisestärke"], [250, "g", "Reis"]],
    schritte: ["Reis kochen.", "Hähnchen würfeln, in 1 EL Stärke wenden und knusprig anbraten.", "Paprika in Stücken dazu und 3 Minuten mitbraten.", "Ananassaft, Ketchup, Essig, Sojasoße und restliche Stärke verrühren.", "Mit den Ananasstücken in den Wok geben und aufkochen, bis die Soße glänzt."],
  },
  {
    title: "Butter Chicken mit Reis", minutes: 35, category: "fleisch", needs: ["Hähnchenbrust", "Tomaten", "Sahne", "Reis"], beliebt: 4, kind: true, besonders: true,
    zutaten: [[600, "g", "Hähnchenbrust"], [150, "g", "Joghurt"], [400, "g", "passierte Tomaten"], [150, "ml", "Sahne"], [2, "EL", "Butter"], [1, "Stück", "Ingwer"], [2, "TL", "Garam Masala"], [250, "g", "Reis"]],
    schritte: ["Hähnchen würfeln und mit Joghurt und 1 TL Garam Masala mischen.", "Reis kochen.", "Hähnchen in Butter rundherum anbraten.", "Ingwer reiben, mit Tomaten und restlichem Gewürz dazu und 10 Minuten köcheln.", "Sahne einrühren und abschmecken."],
  },
  {
    title: "Rotes Thai-Curry mit Hähnchen", minutes: 30, category: "fleisch", needs: ["Hähnchenbrust", "Kokosmilch", "Paprika", "Reis"], beliebt: 3, kind: false, besonders: true,
    zutaten: [[500, "g", "Hähnchenbrust"], [400, "ml", "Kokosmilch"], [1, "EL", "rote Currypaste"], [1, "", "Paprika"], [150, "g", "Zuckerschoten"], [1, "", "Limette"], [250, "g", "Jasminreis"]],
    schritte: ["Reis kochen.", "Currypaste in etwas Kokosmilch anrösten.", "Hähnchen in Streifen dazu und rundherum anbraten.", "Restliche Kokosmilch und Gemüse dazu, 8 Minuten köcheln.", "Mit Limettensaft und etwas Sojasoße abschmecken."],
  },
  {
    title: "Rindfleisch mit Brokkoli aus dem Wok", minutes: 25, category: "fleisch", needs: ["Rindfleisch", "Brokkoli", "Reis"], beliebt: 3, kind: true, besonders: true,
    zutaten: [[500, "g", "Rinderhüfte"], [1, "", "Brokkoli"], [2, "", "Knoblauchzehen"], [5, "EL", "Sojasoße"], [2, "EL", "Austernsoße"], [1, "EL", "Speisestärke"], [250, "g", "Reis"]],
    schritte: ["Reis kochen.", "Fleisch in dünne Streifen schneiden und mit 1 EL Sojasoße und Stärke mischen.", "Im sehr heißen Wok portionsweise kurz anbraten und herausnehmen.", "Brokkoli und Knoblauch 4 Minuten braten, etwas Wasser dazu.", "Fleisch und Soßen zurück in den Wok und kurz durchschwenken."],
  },
  {
    title: "Mie-Nudelsuppe mit Hähnchen", minutes: 25, category: "fleisch", needs: ["Mie-Nudeln", "Hähnchenbrust", "Möhren"], season: "winter", beliebt: 3, kind: true, besonders: true,
    zutaten: [[200, "g", "Mie-Nudeln"], [300, "g", "Hähnchenbrust"], [1.5, "l", "Hühnerbrühe"], [2, "", "Möhren"], [150, "g", "Pak Choi"], [3, "EL", "Sojasoße"], [1, "Stück", "Ingwer"]],
    schritte: ["Brühe mit Ingwerscheiben aufkochen.", "Hähnchen in dünne Streifen schneiden und 8 Minuten in der Brühe garen.", "Möhren in Streifen und Pak Choi dazu und 3 Minuten mitgaren.", "Nudeln in der Suppe ziehen lassen und mit Sojasoße abschmecken."],
  },
];
