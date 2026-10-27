// Nudeln & Italienisch (25)

import type { GerichtEintrag } from "@/lib/essen/gerichte/types";

export const NUDELN: GerichtEintrag[] = [
  { title: "Nudeln mit Pesto", minutes: 15, category: "vegetarisch", needs: ["Nudeln", "Pesto"], usual: true, beliebt: 5, kind: true },
  { title: "Nudeln mit Tomatensoße", minutes: 20, category: "vegetarisch", needs: ["Nudeln", "Tomaten"], usual: true, beliebt: 5, kind: true },
  { title: "Spaghetti Bolognese", minutes: 30, category: "fleisch", needs: ["Spaghetti", "Hackfleisch", "Tomaten"], beliebt: 5, kind: true },
  { title: "Lasagne", minutes: 75, category: "fleisch", needs: ["Lasagneplatten", "Hackfleisch", "Tomaten", "Käse"], beliebt: 5, kind: true },
  {
    title: "Spaghetti Carbonara", minutes: 20, category: "fleisch", needs: ["Spaghetti", "Speck", "Eier", "Parmesan"], beliebt: 5, kind: true,
    zutaten: [[500, "g", "Spaghetti"], [150, "g", "Speckwürfel"], [4, "", "Eigelb"], [80, "g", "Parmesan"], [null, "", "Pfeffer, Salz"]],
    schritte: ["Spaghetti in Salzwasser kochen.", "Speck in einer großen Pfanne knusprig braten.", "Eigelb mit geriebenem Parmesan und Pfeffer verrühren.", "Nudeln tropfnass in die Pfanne geben, vom Herd nehmen und die Eimasse unterrühren."],
  },
  {
    title: "Pizza Margherita", minutes: 30, category: "vegetarisch", needs: ["Pizzateig", "Tomaten", "Mozzarella"], beliebt: 5, kind: true,
    zutaten: [[2, "Rollen", "Pizzateig"], [400, "g", "passierte Tomaten"], [250, "g", "Mozzarella"], [1, "TL", "Oregano"], [1, "Bund", "Basilikum"], [null, "", "Salz, Olivenöl"]],
    schritte: ["Ofen auf 230 Grad vorheizen.", "Tomaten mit Salz und Oregano würzen und auf den Teig streichen.", "Mozzarella zupfen und verteilen, etwas Öl darüber.", "12 Minuten backen und mit Basilikum belegen."],
  },
  {
    title: "Nudelauflauf", minutes: 35, category: "vegetarisch", needs: ["Nudeln", "Käse", "Sahne"], beliebt: 4, kind: true,
    zutaten: [[400, "g", "Nudeln"], [200, "ml", "Sahne"], [200, "ml", "Milch"], [2, "", "Eier"], [200, "g", "Käse"], [150, "g", "Erbsen"], [null, "", "Salz, Muskat"]],
    schritte: ["Ofen auf 200 Grad vorheizen, Nudeln knapp gar kochen.", "Sahne, Milch und Eier verquirlen und würzen.", "Nudeln mit Erbsen in eine Form geben und die Soße darübergießen.", "Mit Käse bestreuen und 20 Minuten goldbraun backen."],
  },
  {
    title: "Tortellini in Sahnesoße", minutes: 15, category: "vegetarisch", needs: ["Tortellini", "Sahne", "Erbsen"], beliebt: 4, kind: true,
    zutaten: [[500, "g", "Tortellini"], [200, "ml", "Sahne"], [150, "g", "Erbsen"], [50, "g", "Parmesan"], [null, "", "Salz, Pfeffer, Muskat"]],
    schritte: ["Tortellini nach Packung kochen.", "Sahne mit Erbsen aufkochen und 3 Minuten köcheln.", "Parmesan einrühren und würzen.", "Tortellini in der Soße schwenken."],
  },
  {
    title: "Makkaroni mit Käsesoße", minutes: 25, category: "vegetarisch", needs: ["Makkaroni", "Käse", "Milch"], beliebt: 4, kind: true,
    zutaten: [[500, "g", "Makkaroni"], [2, "EL", "Butter"], [2, "EL", "Mehl"], [500, "ml", "Milch"], [200, "g", "Cheddar oder Gouda"], [null, "", "Salz, Muskat"]],
    schritte: ["Makkaroni in Salzwasser kochen.", "Butter schmelzen, Mehl einrühren und nach und nach die Milch dazugießen.", "Käse reiben und in der Soße schmelzen lassen, würzen.", "Nudeln abgießen und mit der Käsesoße mischen."],
  },
  {
    title: "Nudeln mit Schinken-Sahne-Soße", minutes: 20, category: "fleisch", needs: ["Nudeln", "Kochschinken", "Sahne", "Erbsen"], beliebt: 4, kind: true,
    zutaten: [[500, "g", "Nudeln"], [200, "g", "Kochschinken"], [250, "ml", "Sahne"], [150, "g", "Erbsen"], [1, "", "Zwiebel"], [null, "", "Salz, Pfeffer"]],
    schritte: ["Nudeln in Salzwasser kochen.", "Zwiebel würfeln und andünsten, Schinkenwürfel kurz mitbraten.", "Sahne und Erbsen dazu und 5 Minuten köcheln.", "Würzen und mit den Nudeln mischen."],
  },
  {
    title: "Schinken-Pizza", minutes: 30, category: "fleisch", needs: ["Pizzateig", "Kochschinken", "Tomaten", "Käse"], beliebt: 4, kind: true,
    zutaten: [[2, "Rollen", "Pizzateig"], [400, "g", "passierte Tomaten"], [200, "g", "Kochschinken"], [200, "g", "geriebener Käse"], [150, "g", "Champignons"], [1, "TL", "Oregano"]],
    schritte: ["Ofen auf 230 Grad vorheizen.", "Tomaten würzen und auf den Teig streichen.", "Mit Schinken und Pilzscheiben belegen, Käse darüber.", "12 Minuten backen."],
  },
  {
    title: "Spaghetti aglio e olio", minutes: 15, category: "vegetarisch", needs: ["Spaghetti", "Parmesan"], usual: true, beliebt: 4, kind: false,
    zutaten: [[500, "g", "Spaghetti"], [4, "", "Knoblauchzehen"], [6, "EL", "Olivenöl"], [1, "", "Chilischote"], [1, "Bund", "Petersilie"], [50, "g", "Parmesan"]],
    schritte: ["Spaghetti in Salzwasser kochen.", "Knoblauch in Scheiben schneiden und im Öl sanft goldgelb werden lassen.", "Chili und gehackte Petersilie dazugeben.", "Nudeln mit etwas Kochwasser in der Pfanne schwenken, Parmesan drüber."],
  },
  {
    title: "Nudeln mit Zucchini", minutes: 20, category: "vegetarisch", needs: ["Nudeln", "Zucchini"], beliebt: 3, kind: true,
    zutaten: [[500, "g", "Nudeln"], [2, "", "Zucchini"], [2, "", "Knoblauchzehen"], [100, "g", "Frischkäse"], [50, "g", "Parmesan"], [null, "", "Salz, Pfeffer, Zitrone"]],
    schritte: ["Nudeln in Salzwasser kochen.", "Zucchini grob raspeln und mit Knoblauch in Öl 5 Minuten braten.", "Frischkäse und etwas Nudelwasser einrühren.", "Mit den Nudeln mischen, mit Zitrone und Parmesan abschmecken."],
  },
  {
    title: "Penne mit Brokkoli", minutes: 20, category: "vegetarisch", needs: ["Penne", "Brokkoli", "Parmesan"], beliebt: 3, kind: true,
    zutaten: [[500, "g", "Penne"], [1, "", "Brokkoli"], [2, "", "Knoblauchzehen"], [3, "EL", "Olivenöl"], [60, "g", "Parmesan"]],
    schritte: ["Brokkoli in kleine Röschen teilen.", "Penne kochen, Brokkoli die letzten 4 Minuten mitkochen.", "Knoblauch in Öl kurz anbraten.", "Nudeln und Brokkoli darin schwenken und mit Parmesan bestreuen."],
  },
  {
    title: "Gnocchi-Pfanne mit Tomaten", minutes: 20, category: "vegetarisch", needs: ["Gnocchi", "Tomaten", "Mozzarella"], beliebt: 3, kind: true,
    zutaten: [[800, "g", "Gnocchi"], [400, "g", "Kirschtomaten"], [250, "g", "Mozzarella"], [2, "EL", "Olivenöl"], [1, "Bund", "Basilikum"]],
    schritte: ["Gnocchi im Öl von allen Seiten goldbraun braten.", "Tomaten halbieren, dazugeben und 3 Minuten mitbraten.", "Mozzarella zupfen und darauf schmelzen lassen.", "Mit Basilikum, Salz und Pfeffer servieren."],
  },
  {
    title: "Linsen-Spaghetti mit Tomatensoße", minutes: 30, category: "vegetarisch", needs: ["Spaghetti", "Linsen", "Tomaten", "Möhren"], beliebt: 2, kind: true,
    zutaten: [[500, "g", "Spaghetti"], [150, "g", "rote Linsen"], [2, "Dosen", "gehackte Tomaten"], [2, "", "Möhren"], [1, "", "Zwiebel"], [1, "EL", "Tomatenmark"]],
    schritte: ["Zwiebel und Möhren fein würfeln und andünsten.", "Tomatenmark kurz mitrösten, Linsen, Tomaten und 200 ml Wasser dazu.", "15 Minuten köcheln, bis die Linsen weich sind, würzen.", "Spaghetti kochen und mit der Soße servieren."],
  },
  {
    title: "Gemüse-Lasagne", minutes: 50, category: "vegetarisch", needs: ["Lasagneplatten", "Zucchini", "Tomaten", "Käse"], beliebt: 3, kind: true,
    zutaten: [[250, "g", "Lasagneplatten"], [2, "", "Zucchini"], [2, "", "Möhren"], [2, "Dosen", "gehackte Tomaten"], [400, "ml", "Béchamelsoße"], [150, "g", "Käse"]],
    schritte: ["Ofen auf 190 Grad vorheizen.", "Zucchini und Möhren würfeln, anbraten und mit den Tomaten 10 Minuten köcheln.", "Gemüsesoße, Platten und Béchamel abwechselnd in eine Form schichten.", "Mit Käse bestreuen und 35 Minuten backen."],
  },
  {
    title: "Spinat-Ricotta-Cannelloni", minutes: 45, category: "vegetarisch", needs: ["Cannelloni", "Spinat", "Ricotta", "Tomaten"], beliebt: 3, kind: true,
    zutaten: [[250, "g", "Cannelloni"], [450, "g", "Blattspinat (TK)"], [250, "g", "Ricotta"], [500, "g", "passierte Tomaten"], [125, "g", "Mozzarella"], [null, "", "Salz, Muskat"]],
    schritte: ["Ofen auf 200 Grad vorheizen, Spinat auftauen und gut ausdrücken.", "Spinat mit Ricotta, Salz und Muskat mischen und in die Röhren füllen.", "Gewürzte Tomaten in eine Form geben und die Cannelloni hineinlegen.", "Mozzarella darauf verteilen und 30 Minuten backen."],
  },
  {
    title: "Gemüsepizza vom Blech", minutes: 40, category: "vegetarisch", needs: ["Pizzateig", "Paprika", "Champignons", "Käse"], beliebt: 3, kind: true,
    zutaten: [[1, "Rolle", "Pizzateig (Blech)"], [400, "g", "passierte Tomaten"], [2, "", "Paprika"], [200, "g", "Champignons"], [150, "g", "Mais"], [200, "g", "geriebener Käse"]],
    schritte: ["Ofen auf 220 Grad vorheizen, Teig auf ein Blech legen.", "Tomaten würzen und aufstreichen.", "Paprika und Pilze in Streifen schneiden und mit dem Mais verteilen.", "Käse darüber und 20 Minuten backen."],
  },
  {
    title: "Spaghetti mit Bärlauchpesto", minutes: 15, category: "vegetarisch", needs: ["Spaghetti", "Bärlauch", "Parmesan"], season: "fruehling", beliebt: 3, kind: false,
    zutaten: [[500, "g", "Spaghetti"], [100, "g", "Bärlauch"], [50, "g", "Parmesan"], [40, "g", "Sonnenblumenkerne"], [120, "ml", "Olivenöl"], [null, "", "Salz"]],
    schritte: ["Spaghetti in Salzwasser kochen.", "Bärlauch waschen und grob schneiden.", "Mit Parmesan, Kernen, Öl und Salz fein pürieren.", "Pesto mit den Nudeln und etwas Kochwasser mischen."],
  },
  {
    title: "Spargel-Risotto", minutes: 35, category: "vegetarisch", needs: ["Risottoreis", "Spargel", "Parmesan"], season: "fruehling", beliebt: 3, kind: true,
    zutaten: [[300, "g", "Risottoreis"], [500, "g", "grüner Spargel"], [1, "", "Zwiebel"], [1, "l", "Gemüsebrühe"], [60, "g", "Parmesan"], [2, "EL", "Butter"]],
    schritte: ["Zwiebel würfeln und in Butter glasig dünsten, Reis kurz mitdünsten.", "Nach und nach heiße Brühe angießen und 20 Minuten rühren.", "Spargel in Stücke schneiden und die letzten 8 Minuten mitgaren.", "Parmesan und etwas Butter unterrühren."],
  },
  {
    title: "Pasta mit grünem Spargel", minutes: 20, category: "vegetarisch", needs: ["Nudeln", "Spargel", "Zitronen"], season: "fruehling", beliebt: 3, kind: true,
    zutaten: [[500, "g", "Nudeln"], [500, "g", "grüner Spargel"], [1, "", "Zitrone"], [150, "ml", "Sahne"], [50, "g", "Parmesan"]],
    schritte: ["Nudeln in Salzwasser kochen.", "Spargel schräg in Stücke schneiden und in Öl 5 Minuten braten.", "Sahne, Zitronenschale und etwas Saft dazugeben.", "Mit den Nudeln mischen und mit Parmesan servieren."],
  },
  {
    title: "Erbsen-Risotto", minutes: 35, category: "vegetarisch", needs: ["Risottoreis", "Erbsen", "Parmesan"], season: "fruehling", beliebt: 2, kind: true,
    zutaten: [[300, "g", "Risottoreis"], [300, "g", "Erbsen"], [1, "", "Zwiebel"], [1, "l", "Gemüsebrühe"], [60, "g", "Parmesan"], [2, "EL", "Butter"]],
    schritte: ["Zwiebel würfeln und in Butter glasig dünsten, Reis kurz mitdünsten.", "Nach und nach heiße Brühe angießen und 20 Minuten rühren.", "Erbsen die letzten 5 Minuten mitgaren.", "Parmesan und etwas Butter unterrühren."],
  },
  {
    title: "Kürbis-Pasta", minutes: 25, category: "vegetarisch", needs: ["Nudeln", "Kürbis", "Sahne"], season: "herbst", beliebt: 3, kind: true,
    zutaten: [[500, "g", "Nudeln"], [600, "g", "Hokkaido-Kürbis"], [1, "", "Zwiebel"], [200, "ml", "Sahne"], [200, "ml", "Gemüsebrühe"], [50, "g", "Parmesan"]],
    schritte: ["Kürbis mit Schale klein würfeln, Zwiebel würfeln.", "Beides andünsten, mit Brühe 15 Minuten weich köcheln.", "Sahne dazu und fein pürieren, würzen.", "Nudeln kochen und mit der Soße und Parmesan mischen."],
  },
  {
    title: "Bandnudeln mit Pilzrahm", minutes: 25, category: "vegetarisch", needs: ["Bandnudeln", "Champignons", "Sahne"], season: "herbst", beliebt: 3, kind: true,
    zutaten: [[500, "g", "Bandnudeln"], [400, "g", "Champignons"], [1, "", "Zwiebel"], [250, "ml", "Sahne"], [1, "Bund", "Petersilie"], [null, "", "Salz, Pfeffer"]],
    schritte: ["Bandnudeln in Salzwasser kochen.", "Pilze in Scheiben schneiden und scharf anbraten, Zwiebelwürfel dazu.", "Sahne angießen und 5 Minuten einkochen lassen.", "Würzen, Petersilie dazu und mit den Nudeln mischen."],
  },
];
