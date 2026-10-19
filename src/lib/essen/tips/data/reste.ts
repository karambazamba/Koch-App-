import type { Tip } from "../types";

// Reste-Ideen: Aus dem, was noch da ist, wird ein neues Essen.

export const RESTE_TIPS: Tip[] = [
  {
    id: "r-nudelpfanne",
    category: "reste",
    text: "Nudeln vom Vortag in der Pfanne knusprig anbraten, Gemüse und ein Ei dazu – fertig ist die Nudelpfanne.",
    detail:
      "Gekochte Nudeln werden in heißem Fett schön kross. Ein bisschen Käse obendrauf, und alle sind zufrieden.",
    steps: [
      "Nudeln in Öl kräftig anbraten",
      "Gemüse dazu, kurz mitbraten",
      "Ei unterrühren, würzen",
    ],
  },
  {
    id: "r-nudel-frittata",
    category: "reste",
    text: "Aus übrigen Nudeln wird eine Frittata: mit verquirlten Eiern und Käse in die Pfanne, langsam stocken lassen.",
    detail:
      "Funktioniert sogar mit Nudeln, die schon Soße haben. In Stücke geschnitten passt sie auch prima in die Brotdose.",
    steps: [
      "Eier mit Käse verquirlen, über die Nudeln gießen",
      "Bei kleiner Hitze mit Deckel stocken lassen",
      "Wenden oder kurz unter den Grill",
    ],
  },
  {
    id: "r-gebratener-reis",
    category: "reste",
    text: "Reis vom Vortag ist perfekt für gebratenen Reis – mit Ei, Erbsen und einem Schuss Sojasoße.",
    detail:
      "Kalter Reis klebt weniger und brät schön körnig. Reisreste nach dem Kochen schnell abkühlen, in den Kühlschrank stellen, innerhalb eines Tages essen und nur einmal aufwärmen.",
    steps: [
      "Reis in heißem Öl anbraten",
      "Gemüse und Ei dazu",
      "Mit Sojasoße abschmecken",
    ],
  },
  {
    id: "r-bratkartoffeln",
    category: "reste",
    text: "Gekochte Kartoffeln von gestern ergeben die besten Bratkartoffeln. Zwiebeln und etwas Speck oder Paprika dazu.",
    detail:
      "Abgekühlte Kartoffeln zerfallen nicht und werden außen richtig knusprig. Geduld beim Braten lohnt sich – nicht zu oft wenden.",
  },
  {
    id: "r-roesti",
    category: "reste",
    text: "Übrige Pellkartoffeln grob reiben, salzen und als kleine Rösti in der Pfanne goldbraun braten.",
    detail:
      "Gekochte Kartoffeln halten ohne Ei zusammen. Dazu passt Apfelmus, ein Spiegelei oder Kräuterquark.",
  },
  {
    id: "r-croutons",
    category: "reste",
    text: "Altes Brot in Würfel schneiden und mit etwas Öl in der Pfanne rösten – Croutons für Suppe oder Salat.",
    detail:
      "Ein bisschen Knoblauch oder Kräuter machen sie extra lecker. In einer Dose bleiben sie ein paar Tage knusprig.",
  },
  {
    id: "r-arme-ritter",
    category: "reste",
    text: "Trockenes Brot wird zu Armen Rittern: in Milch mit Ei tunken, in Butter ausbacken, mit Zimt und Zucker bestreuen.",
    detail:
      "Ein Klassiker, den Kinder lieben. Dazu passen Apfelmus oder Beeren – ein schnelles Wochenend-Frühstück.",
    steps: [
      "Milch, Ei und eine Prise Zucker verquirlen",
      "Brotscheiben kurz darin einweichen",
      "In Butter von beiden Seiten goldbraun braten",
    ],
  },
  {
    id: "r-semmelknoedel",
    category: "reste",
    text: "Aus alten Brötchen werden Semmelknödel – passt zu Pilzsoße, Gulasch oder einfach in Butter gebraten.",
    detail:
      "Brötchenwürfel mit warmer Milch, Ei, Zwiebel und Petersilie mischen, formen und in siedendem Salzwasser ziehen lassen. Übrige Knödel schmecken am nächsten Tag in Scheiben gebraten.",
    steps: [
      "Brötchen würfeln, mit warmer Milch übergießen",
      "Ei, angeschwitzte Zwiebel und Petersilie unterkneten",
      "Knödel formen, 20 Minuten im Wasser ziehen lassen",
    ],
  },
  {
    id: "r-gemuesesuppe",
    category: "reste",
    text: "Gemüse, das etwas schlapp ist, wird zur Suppe: anbraten, mit Brühe kochen, pürieren – fertig.",
    detail:
      "Weiche Möhren oder schrumpelige Paprika sind in der Suppe völlig in Ordnung. Eine Kartoffel macht sie schön cremig.",
  },
  {
    id: "r-quiche",
    category: "reste",
    text: "Gemüsereste, ein Stück Käse und ein paar Eier ergeben eine Quiche. Fertiger Mürbe- oder Blätterteig macht's einfach.",
    detail:
      "Fast jedes Gemüse passt hinein, auch Reste von Kochschinken oder Lauch. Warm oder kalt lecker.",
  },
  {
    id: "r-smoothie",
    category: "reste",
    text: "Überreifes Obst schmeckt im Smoothie am süßesten. Banane, Beeren und etwas Joghurt oder Milch – mixen, fertig.",
    detail:
      "Braune Stellen bei Bananen sind kein Problem, sie machen den Smoothie nur süßer. Obst lässt sich auch in Stücken einfrieren und später mixen.",
  },
  {
    id: "r-bananenbrot",
    category: "reste",
    text: "Braune Bananen sind wie gemacht für Bananenbrot – je dunkler, desto süßer und saftiger.",
    detail:
      "Zwei bis drei zerdrückte Bananen mit Mehl, Ei, etwas Öl und Backpulver verrühren und etwa eine Stunde backen. Hält sich ein paar Tage und lässt sich gut einfrieren.",
    steps: [
      "Bananen zerdrücken, mit Ei und Öl verrühren",
      "Mehl und Backpulver unterheben",
      "In der Kastenform bei 175 °C backen",
    ],
  },
  {
    id: "r-sosse-einfrieren",
    category: "reste",
    text: "Übrige Soße im Eiswürfelbehälter oder kleinen Dosen einfrieren – perfekt für die nächste schnelle Portion.",
    detail:
      "Tomatensoße, Bolognese oder Bratensoße halten eingefroren ein paar Monate. Mit Datum beschriften hilft beim Wiederfinden.",
  },
  {
    id: "r-wraps",
    category: "reste",
    text: "Reste-Wraps: Fleisch, Gemüse, Reis oder Bohnen vom Vortag in Tortillas rollen, Käse oder Joghurtsoße dazu.",
    detail:
      "Jeder füllt seinen Wrap selbst – das macht Kindern Spaß. In der Pfanne kurz angeröstet werden sie schön knusprig.",
  },
  {
    id: "r-reste-pizza",
    category: "reste",
    text: "Bunte-Reste-Pizza: Alles, was im Kühlschrank wartet, darf mit aufs Blech – Gemüse, Wurst, Käse, sogar Kartoffelscheiben.",
    detail:
      "Ein einfacher Hefeteig oder Fertigteig reicht. Jeder belegt seine Ecke, so wird's ein kleines Familienprojekt.",
    steps: [
      "Teig ausrollen, Tomatensoße drauf",
      "Reste klein schneiden und verteilen",
      "Käse drüber, heiß backen",
    ],
  },
  {
    id: "r-kartoffelsuppe",
    category: "reste",
    text: "Kartoffelpüree vom Vortag mit Brühe aufkochen – schon ist eine cremige Suppe fertig. Würstchen oder Croutons dazu.",
    detail:
      "Püree bringt die Bindung gleich mit. Etwas Muskat und frische Kräuter runden ab.",
  },
  {
    id: "r-pueree-taler",
    category: "reste",
    text: "Kalter Kartoffelbrei wird zu Kartoffeltalern: etwas Mehl und Ei unterkneten, flach formen, in der Pfanne braten.",
    detail:
      "Ein bisschen Käse oder Schnittlauch im Teig macht sie besonders gut. Passt zu Salat oder Apfelmus.",
  },
  {
    id: "r-reis-auflauf",
    category: "reste",
    text: "Übriger Reis wird zum Auflauf: mit Gemüse und einer Käse-Ei-Mischung in die Form, ab in den Ofen.",
    detail:
      "Den Reis dafür am Vortag schnell abkühlen und gekühlt aufbewahren. Im Ofen wird er dann gut durcherhitzt.",
  },
  {
    id: "r-milchreis",
    category: "reste",
    text: "Gekochter Reis als süße Variante: mit Milch, etwas Zucker und Zimt kurz einköcheln – ein schneller Milchreis.",
    detail:
      "Dauert nur ein paar Minuten, weil der Reis schon gar ist. Mit Apfelmus oder Kirschen ein kleines Dessert. Auch hier gilt: Reisreste nur einmal aufwärmen.",
  },
  {
    id: "r-braten-sandwich",
    category: "reste",
    text: "Übriger Braten oder Hähnchen ergibt geniale Sandwiches – dünn aufschneiden, mit Senf, Gurke und Salat.",
    detail:
      "Kalt aufgeschnittenes Fleisch schmeckt oft fast besser als warm. Hält gut gekühlt etwa zwei Tage.",
  },
  {
    id: "r-gemuese-omelett",
    category: "reste",
    text: "Ein paar Löffel Gemüse vom Vortag reichen für ein schnelles Omelett. Etwas Käse drüber, zuklappen, fertig.",
    detail:
      "Ideal, wenn es abends schnell gehen soll. Passt mit Brot dazu auch gut als Abendessen.",
  },
  {
    id: "r-pesto",
    category: "reste",
    text: "Welke Kräuter oder Möhrengrün mit Nüssen, Käse und Öl zu Pesto pürieren – für Nudeln oder aufs Brot.",
    detail:
      "Auch Rucola oder Spinat funktionieren. Mit einer Schicht Öl obendrauf hält sich Pesto im Glas ein paar Tage im Kühlschrank.",
  },
  {
    id: "r-chili-reste",
    category: "reste",
    text: "Übriges Chili oder Bolognese wird am nächsten Tag zur Füllung: in Paprika, auf Ofenkartoffeln oder in Tacos.",
    detail:
      "So fühlt sich das zweite Essen wie ein neues an. Mit Käse überbacken freut sich jeder.",
  },
  {
    id: "r-joghurt-dressing",
    category: "reste",
    text: "Der letzte Rest Joghurt, Quark oder Schmand wird zum Dip oder Dressing – mit Kräutern, Salz und Zitrone.",
    detail:
      "Passt zu Rohkost, Ofengemüse oder Wraps. Ein guter Weg, angebrochene Becher aufzubrauchen.",
  },
  {
    id: "r-resteessen",
    category: "reste",
    text: "Einmal pro Woche Resteessen: Alles, was noch da ist, kommt auf den Tisch, und jeder nimmt sich, was er mag.",
    detail:
      "Kleine Schälchen machen daraus ein buntes Büffet. Wenn du magst, erzähl mir einfach, was noch da ist – ich schlag was vor.",
  },
];
