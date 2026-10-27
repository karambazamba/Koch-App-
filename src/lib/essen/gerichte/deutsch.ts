// Deutsche Hausmannskost (30)

import type { GerichtEintrag } from "@/lib/essen/gerichte/types";

export const DEUTSCH: GerichtEintrag[] = [
  { title: "Pfannkuchen", minutes: 20, category: "vegetarisch", needs: ["Eier", "Milch"], usual: true, beliebt: 5, kind: true },
  {
    title: "Käsebrot mit Rohkost", minutes: 10, category: "vegetarisch", needs: ["Brot", "Käse"], usual: true, beliebt: 3, kind: true,
    zutaten: [[8, "Scheiben", "Brot"], [200, "g", "Käse"], [2, "EL", "Butter"], [3, "", "Möhren"], [1, "", "Gurke"], [1, "", "Paprika"]],
    schritte: ["Brot mit Butter bestreichen und mit Käse belegen.", "Möhren, Gurke und Paprika in Sticks schneiden.", "Alles auf einem Brett anrichten."],
  },
  {
    title: "Bratkartoffeln mit Spiegelei", minutes: 25, category: "vegetarisch", needs: ["Kartoffeln", "Eier"], usual: true, beliebt: 4, kind: true,
    zutaten: [[1, "kg", "Kartoffeln"], [4, "", "Eier"], [1, "", "Zwiebel"], [3, "EL", "Öl"], [null, "", "Salz, Pfeffer"]],
    schritte: ["Kartoffeln kochen, abkühlen lassen und in Scheiben schneiden.", "Im Öl von beiden Seiten goldbraun braten.", "Zwiebel würfeln, dazugeben und kurz mitbraten, würzen.", "Spiegeleier braten und auf die Kartoffeln legen."],
  },
  {
    title: "Pellkartoffeln mit Quark", minutes: 30, category: "vegetarisch", needs: ["Kartoffeln", "Quark"], beliebt: 4, kind: true,
    zutaten: [[1, "kg", "Kartoffeln"], [500, "g", "Quark"], [100, "ml", "Milch"], [1, "Bund", "Schnittlauch"], [null, "", "Salz, Pfeffer"]],
    schritte: ["Kartoffeln mit Schale in Salzwasser 20 Minuten kochen.", "Quark mit Milch glatt rühren.", "Schnittlauch schneiden, unterrühren und würzen.", "Kartoffeln pellen und mit dem Quark essen."],
  },
  {
    title: "Flammkuchen", minutes: 25, category: "vegetarisch", needs: ["Flammkuchenteig", "Schmand"], beliebt: 4, kind: true,
    zutaten: [[2, "Rollen", "Flammkuchenteig"], [200, "g", "Schmand"], [2, "", "Zwiebeln"], [100, "g", "Käse"], [null, "", "Salz, Pfeffer"]],
    schritte: ["Ofen auf 220 Grad vorheizen.", "Teig auf Bleche legen und mit gewürztem Schmand bestreichen.", "Zwiebeln in feine Ringe schneiden und mit dem Käse darauf verteilen.", "12 Minuten backen, bis der Rand knusprig ist."],
  },
  {
    title: "Frikadellen mit Kartoffeln", minutes: 35, category: "fleisch", needs: ["Hackfleisch", "Eier", "Kartoffeln"], beliebt: 5, kind: true,
    zutaten: [[500, "g", "Hackfleisch"], [1, "", "Ei"], [1, "", "Brötchen vom Vortag"], [1, "", "Zwiebel"], [1, "kg", "Kartoffeln"], [1, "TL", "Senf"], [null, "", "Salz, Pfeffer, Paprikapulver"]],
    schritte: ["Kartoffeln schälen und in Salzwasser 20 Minuten kochen.", "Brötchen einweichen und ausdrücken, Zwiebel fein würfeln.", "Hack mit Ei, Brötchen, Zwiebel, Senf und Gewürzen verkneten.", "Acht Frikadellen formen und in Öl von jeder Seite 5 Minuten braten."],
  },
  {
    title: "Spargel mit Kartoffeln", minutes: 35, category: "vegetarisch", needs: ["Spargel", "Kartoffeln"], season: "fruehling", beliebt: 5, kind: true,
    zutaten: [[1.5, "kg", "weißer Spargel"], [1, "kg", "Kartoffeln"], [100, "g", "Butter"], [1, "Prise", "Zucker"], [null, "", "Salz"]],
    schritte: ["Kartoffeln schälen und in Salzwasser 20 Minuten kochen.", "Spargel schälen und die Enden abschneiden.", "Spargel in Salzwasser mit Zucker 12 bis 15 Minuten garen.", "Butter schmelzen und über Spargel und Kartoffeln geben."],
  },
  {
    title: "Senfeier mit Kartoffeln", minutes: 25, category: "vegetarisch", needs: ["Eier", "Kartoffeln", "Sahne"], usual: true, beliebt: 3, kind: true,
    zutaten: [[8, "", "Eier"], [1, "kg", "Kartoffeln"], [2, "EL", "Butter"], [2, "EL", "Mehl"], [400, "ml", "Gemüsebrühe"], [100, "ml", "Sahne"], [3, "EL", "Senf"]],
    schritte: ["Kartoffeln schälen und in Salzwasser 20 Minuten kochen.", "Eier 9 Minuten hart kochen, abschrecken und pellen.", "Butter schmelzen, Mehl einrühren, mit Brühe und Sahne aufgießen.", "Senf einrühren, kurz köcheln lassen und die halbierten Eier hineinlegen."],
  },
  {
    title: "Kartoffelpuffer mit Apfelmus", minutes: 30, category: "vegetarisch", needs: ["Kartoffeln", "Eier", "Apfelmus"], beliebt: 5, kind: true,
    zutaten: [[1, "kg", "Kartoffeln"], [1, "", "Zwiebel"], [2, "", "Eier"], [3, "EL", "Mehl"], [1, "Glas", "Apfelmus"], [null, "", "Öl, Salz"]],
    schritte: ["Kartoffeln und Zwiebel schälen und fein reiben.", "Masse gut ausdrücken, mit Eiern, Mehl und Salz mischen.", "Kleine Puffer in reichlich Öl von beiden Seiten knusprig braten.", "Auf Küchenpapier abtropfen lassen und mit Apfelmus servieren."],
  },
  {
    title: "Kartoffelrösti mit Spiegelei", minutes: 25, category: "vegetarisch", needs: ["Kartoffeln", "Eier"], beliebt: 3, kind: true,
    zutaten: [[800, "g", "Kartoffeln"], [4, "", "Eier"], [1, "EL", "Mehl"], [3, "EL", "Öl"], [null, "", "Salz, Pfeffer"]],
    schritte: ["Kartoffeln schälen, grob reiben und gut ausdrücken.", "Mit Mehl, Salz und Pfeffer mischen.", "Flache Rösti im Öl von jeder Seite 5 Minuten goldbraun braten.", "Spiegeleier braten und auf die Rösti legen."],
  },
  {
    title: "Rahmspinat mit Spiegelei und Kartoffeln", minutes: 25, category: "vegetarisch", needs: ["Spinat", "Eier", "Kartoffeln"], beliebt: 4, kind: true,
    zutaten: [[600, "g", "Rahmspinat (TK)"], [4, "", "Eier"], [1, "kg", "Kartoffeln"], [1, "EL", "Butter"], [null, "", "Salz, Muskat"]],
    schritte: ["Kartoffeln schälen und in Salzwasser 20 Minuten kochen.", "Rahmspinat in einem Topf langsam erhitzen, mit Muskat würzen.", "Spiegeleier in Butter braten.", "Kartoffeln mit Spinat und Ei auf Tellern anrichten."],
  },
  {
    title: "Schnitzel mit Kartoffelsalat", minutes: 35, category: "fleisch", needs: ["Schnitzel", "Kartoffeln", "Gurke"], beliebt: 5, kind: true,
    zutaten: [[4, "", "Schweineschnitzel"], [2, "", "Eier"], [100, "g", "Paniermehl"], [50, "g", "Mehl"], [1, "kg", "festkochende Kartoffeln"], [1, "", "Gurke"], [250, "ml", "Gemüsebrühe"], [3, "EL", "Essig"], [null, "", "Öl, Salz, Pfeffer"]],
    schritte: ["Kartoffeln kochen, pellen und in Scheiben schneiden.", "Mit warmer Brühe, Essig, Öl und Gurkenscheiben mischen und ziehen lassen.", "Schnitzel flach klopfen, salzen, in Mehl, Ei und Paniermehl wenden.", "In reichlich Öl von jeder Seite 3 Minuten goldbraun braten."],
  },
  {
    title: "Königsberger Klopse", minutes: 45, category: "fleisch", needs: ["Hackfleisch", "Kapern", "Kartoffeln"], beliebt: 4, kind: true,
    zutaten: [[600, "g", "Hackfleisch"], [1, "", "Ei"], [1, "", "Brötchen vom Vortag"], [1, "", "Zwiebel"], [1, "l", "Gemüsebrühe"], [2, "EL", "Butter"], [3, "EL", "Mehl"], [100, "ml", "Sahne"], [2, "EL", "Kapern"], [1, "kg", "Kartoffeln"]],
    schritte: ["Kartoffeln schälen und in Salzwasser kochen.", "Hack mit Ei, eingeweichtem Brötchen und Zwiebelwürfeln verkneten, Klopse formen.", "Klopse in leicht siedender Brühe 15 Minuten ziehen lassen und herausnehmen.", "Butter schmelzen, Mehl einrühren, mit 500 ml Brühe und Sahne aufgießen.", "Kapern dazu, Klopse in der Soße erwärmen und mit Kartoffeln servieren."],
  },
  {
    title: "Bratwurst mit Kartoffelpüree", minutes: 25, category: "fleisch", needs: ["Bratwurst", "Kartoffeln", "Milch"], beliebt: 4, kind: true,
    zutaten: [[4, "", "Bratwürste"], [1, "kg", "mehligkochende Kartoffeln"], [200, "ml", "Milch"], [2, "EL", "Butter"], [null, "", "Salz, Muskat"]],
    schritte: ["Kartoffeln schälen und in Salzwasser 20 Minuten kochen.", "Bratwürste in etwas Öl rundherum 10 Minuten braten.", "Kartoffeln abgießen, mit warmer Milch und Butter stampfen.", "Püree mit Salz und Muskat abschmecken."],
  },
  {
    title: "Currywurst mit Pommes", minutes: 25, category: "fleisch", needs: ["Bratwurst", "Pommes"], beliebt: 5, kind: true,
    zutaten: [[4, "", "Bratwürste"], [750, "g", "Pommes (TK)"], [300, "ml", "Ketchup"], [2, "EL", "Currypulver"], [1, "EL", "Honig"], [null, "", "Paprikapulver"]],
    schritte: ["Pommes nach Packung im Ofen backen.", "Bratwürste rundherum braten.", "Ketchup mit Currypulver, Honig und Paprika kurz aufkochen.", "Würste in Stücke schneiden, Soße drüber und mit Currypulver bestreuen."],
  },
  {
    title: "Gulasch mit Nudeln", minutes: 60, category: "fleisch", needs: ["Rindergulasch", "Paprika", "Nudeln"], beliebt: 5, kind: true,
    zutaten: [[800, "g", "Rindergulasch"], [3, "", "Zwiebeln"], [2, "", "Paprika"], [2, "EL", "Tomatenmark"], [500, "ml", "Rinderbrühe"], [2, "EL", "Paprikapulver"], [400, "g", "Bandnudeln"]],
    schritte: ["Fleisch portionsweise scharf anbraten.", "Zwiebeln würfeln, dazugeben und mit Tomatenmark und Paprikapulver anrösten.", "Mit Brühe ablöschen und zugedeckt 40 Minuten schmoren.", "Paprika würfeln und die letzten 15 Minuten mitgaren.", "Nudeln kochen und mit dem Gulasch servieren."],
  },
  {
    title: "Toast Hawaii", minutes: 15, category: "fleisch", needs: ["Toast", "Kochschinken", "Ananas", "Käse"], beliebt: 4, kind: true,
    zutaten: [[8, "Scheiben", "Toast"], [8, "Scheiben", "Kochschinken"], [1, "Dose", "Ananas"], [8, "Scheiben", "Käse"], [1, "EL", "Butter"]],
    schritte: ["Ofen auf 200 Grad vorheizen.", "Toast dünn mit Butter bestreichen und mit Schinken belegen.", "Je eine Ananasscheibe und eine Scheibe Käse darauflegen.", "10 Minuten backen, bis der Käse schmilzt."],
  },
  {
    title: "Flammkuchen mit Speck", minutes: 25, category: "fleisch", needs: ["Flammkuchenteig", "Schmand", "Speck"], beliebt: 4, kind: true,
    zutaten: [[2, "Rollen", "Flammkuchenteig"], [200, "g", "Schmand"], [150, "g", "Speckwürfel"], [2, "", "Zwiebeln"], [null, "", "Salz, Pfeffer"]],
    schritte: ["Ofen auf 220 Grad vorheizen.", "Teig auf Bleche legen und mit gewürztem Schmand bestreichen.", "Zwiebelringe und Speck darauf verteilen.", "12 Minuten backen, bis der Rand knusprig ist."],
  },
  {
    title: "Maultaschen in Brühe", minutes: 15, category: "fleisch", needs: ["Maultaschen", "Lauch"], beliebt: 4, kind: true,
    zutaten: [[600, "g", "Maultaschen"], [1.2, "l", "Gemüsebrühe"], [1, "Stange", "Lauch"], [2, "", "Möhren"], [1, "Bund", "Schnittlauch"]],
    schritte: ["Lauch in Ringe, Möhren in Scheiben schneiden.", "Brühe aufkochen, Gemüse 5 Minuten darin garen.", "Maultaschen dazu und 8 Minuten ziehen lassen, nicht kochen.", "Mit Schnittlauch bestreuen."],
  },
  {
    title: "Würstchen mit Kartoffelsalat", minutes: 30, category: "fleisch", needs: ["Würstchen", "Kartoffeln", "Gurke"], season: "sommer", beliebt: 4, kind: true,
    zutaten: [[8, "", "Wiener Würstchen"], [1, "kg", "festkochende Kartoffeln"], [4, "", "Gewürzgurken"], [1, "", "Zwiebel"], [150, "g", "Mayonnaise"], [150, "g", "Joghurt"], [null, "", "Salz, Pfeffer"]],
    schritte: ["Kartoffeln kochen, pellen, abkühlen lassen und in Scheiben schneiden.", "Gurken und Zwiebel fein würfeln.", "Mayonnaise mit Joghurt und etwas Gurkenwasser verrühren, alles mischen und würzen.", "Würstchen in heißem Wasser 5 Minuten ziehen lassen."],
  },
  {
    title: "Grünkohl mit Kartoffeln", minutes: 60, category: "fleisch", needs: ["Grünkohl", "Kochwurst", "Kartoffeln"], season: "winter", beliebt: 4, kind: false,
    zutaten: [[1, "kg", "Grünkohl (TK)"], [4, "", "Kochwürste"], [1, "kg", "Kartoffeln"], [2, "", "Zwiebeln"], [2, "EL", "Schmalz"], [500, "ml", "Brühe"], [2, "EL", "Haferflocken"], [1, "TL", "Senf"]],
    schritte: ["Zwiebeln würfeln und im Schmalz glasig dünsten.", "Grünkohl und Brühe dazu, zugedeckt 30 Minuten köcheln.", "Kochwürste auf den Kohl legen und 20 Minuten mitziehen lassen.", "Kartoffeln schälen und kochen.", "Kohl mit Haferflocken binden und mit Senf abschmecken."],
  },
  { title: "Käsespätzle", minutes: 50, category: "vegetarisch", needs: ["Spätzle", "Käse", "Zwiebeln"], beliebt: 5, kind: true },
  { title: "Hackbraten mit Kartoffelpüree", minutes: 80, category: "fleisch", needs: ["Hackfleisch", "Eier", "Kartoffeln"], beliebt: 4, kind: true },
  {
    title: "Leberkäse mit Spiegelei", minutes: 20, category: "fleisch", needs: ["Leberkäse", "Eier", "Kartoffeln"], beliebt: 4, kind: true,
    zutaten: [[4, "Scheiben", "Leberkäse"], [4, "", "Eier"], [800, "g", "Kartoffeln"], [2, "EL", "Öl"], [null, "", "Senf, Salz"]],
    schritte: ["Kartoffeln kochen, in Scheiben schneiden und knusprig braten.", "Leberkäse in einer zweiten Pfanne von beiden Seiten braten.", "Spiegeleier braten.", "Alles anrichten und mit Senf servieren."],
  },
  {
    title: "Rinderrouladen mit Rotkohl", minutes: 90, category: "fleisch", needs: ["Rinderrouladen", "Speck", "Rotkohl", "Kartoffeln"], season: "winter", beliebt: 5, kind: false,
    zutaten: [[4, "", "Rinderrouladen"], [4, "Scheiben", "Bacon"], [2, "", "Gewürzgurken"], [2, "", "Zwiebeln"], [2, "EL", "Senf"], [500, "ml", "Rinderbrühe"], [1, "Glas", "Rotkohl"], [1, "kg", "Kartoffeln"]],
    schritte: ["Rouladen ausbreiten, salzen und mit Senf bestreichen.", "Mit Bacon, Gurkenstreifen und Zwiebelringen belegen, aufrollen und feststecken.", "Rundherum scharf anbraten, mit Brühe ablöschen und zugedeckt 75 Minuten schmoren.", "Kartoffeln kochen, Rotkohl erwärmen.", "Soße mit etwas Stärke binden und abschmecken."],
  },
  {
    title: "Bauernfrühstück", minutes: 25, category: "fleisch", needs: ["Kartoffeln", "Eier", "Speck"], usual: true, beliebt: 3, kind: true,
    zutaten: [[800, "g", "gekochte Kartoffeln"], [6, "", "Eier"], [100, "g", "Speckwürfel"], [1, "", "Zwiebel"], [3, "", "Gewürzgurken"], [null, "", "Salz, Pfeffer, Schnittlauch"]],
    schritte: ["Kartoffeln in Scheiben schneiden und goldbraun braten.", "Speck und Zwiebelwürfel dazugeben und mitbraten.", "Eier verquirlen, würzen, darübergießen und bei kleiner Hitze stocken lassen.", "Mit Schnittlauch bestreuen und mit Gewürzgurken servieren."],
  },
  {
    title: "Hühnerfrikassee mit Reis", minutes: 40, category: "fleisch", needs: ["Hähnchenbrust", "Champignons", "Erbsen", "Reis"], beliebt: 4, kind: true,
    zutaten: [[600, "g", "Hähnchenbrust"], [250, "g", "Champignons"], [150, "g", "Erbsen"], [1, "Glas", "Spargelstücke"], [2, "EL", "Butter"], [3, "EL", "Mehl"], [500, "ml", "Hühnerbrühe"], [100, "ml", "Sahne"], [250, "g", "Reis"], [1, "", "Zitrone"]],
    schritte: ["Hähnchen in der Brühe 15 Minuten garen, herausnehmen und klein schneiden.", "Reis kochen.", "Butter schmelzen, Mehl einrühren, mit der Brühe und Sahne aufgießen.", "Pilze, Erbsen, Spargel und Hähnchen dazu und 5 Minuten köcheln.", "Mit Zitronensaft, Salz und Pfeffer abschmecken."],
  },
  {
    title: "Kassler mit Sauerkraut und Püree", minutes: 40, category: "fleisch", needs: ["Kassler", "Sauerkraut", "Kartoffeln"], season: "winter", beliebt: 3, kind: false,
    zutaten: [[4, "Scheiben", "Kassler"], [800, "g", "Sauerkraut"], [1, "kg", "Kartoffeln"], [200, "ml", "Milch"], [2, "EL", "Butter"], [1, "", "Zwiebel"], [1, "", "Apfel"]],
    schritte: ["Zwiebel würfeln, andünsten, Sauerkraut und Apfelstücke dazu und 20 Minuten köcheln.", "Kassler auf das Kraut legen und 15 Minuten mitziehen lassen.", "Kartoffeln kochen und mit warmer Milch und Butter zu Püree stampfen.", "Alles zusammen anrichten."],
  },
  {
    title: "Jägerschnitzel mit Spätzle", minutes: 35, category: "fleisch", needs: ["Schnitzel", "Champignons", "Spätzle", "Sahne"], beliebt: 4, kind: true,
    zutaten: [[4, "", "Schweineschnitzel"], [300, "g", "Champignons"], [1, "", "Zwiebel"], [200, "ml", "Sahne"], [200, "ml", "Brühe"], [500, "g", "Spätzle"], [null, "", "Öl, Salz, Pfeffer"]],
    schritte: ["Schnitzel flach klopfen, würzen und von jeder Seite 3 Minuten braten, warm stellen.", "Pilze und Zwiebel in Scheiben im Bratfett anbraten.", "Mit Brühe und Sahne ablöschen und 5 Minuten einkochen.", "Spätzle nach Packung erhitzen und mit Schnitzel und Soße servieren."],
  },
  {
    title: "Strammer Max", minutes: 15, category: "fleisch", needs: ["Brot", "Kochschinken", "Eier"], usual: true, beliebt: 3, kind: true,
    zutaten: [[4, "Scheiben", "Bauernbrot"], [8, "Scheiben", "Kochschinken"], [4, "", "Eier"], [2, "EL", "Butter"], [2, "", "Tomaten"], [null, "", "Salz, Pfeffer, Schnittlauch"]],
    schritte: ["Brot mit Butter bestreichen und mit Schinken belegen.", "Spiegeleier braten und auf die Brote legen.", "Mit Salz, Pfeffer und Schnittlauch würzen, Tomatenscheiben dazu."],
  },
];
