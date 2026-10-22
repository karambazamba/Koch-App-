// Tipps zu einzelnen Gerichten (Kategorie "gericht").
// `match` prüft den Gerichtnamen, damit der passende Tipp beim passenden Essen auftaucht.

import type { Tip } from "@/lib/essen/tips/types";

export const GERICHT_TIPS: Tip[] = [
  {
    id: "g-bolognese-milch",
    category: "gericht",
    title: "Profi-Tipp zur Bolognese",
    match: /bolognese|hackfleischso(ß|ss)e|ragout|rag[uù]/i,
    text: "Ein Schuss Milch ins angebratene Hack, kurz einkochen lassen – erst dann die Tomaten dazu. Die Soße wird runder und zarter.",
    detail:
      "Die Milch macht das Fleisch mürbe und nimmt den Tomaten die Säure. So machen es auch viele Familien in Bologna – nur ohne großes Aufheben.",
    steps: [
      "Hack krümelig anbraten",
      "Ca. 100 ml Milch dazu, fast ganz einkochen",
      "Tomaten dazu und gemütlich köcheln lassen",
    ],
  },
  {
    id: "g-bolognese-anbraten",
    category: "gericht",
    title: "Tipp zur Bolognese",
    match: /bolognese|hackfleischso(ß|ss)e/i,
    text: "Das Hack in einer heißen Pfanne erst mal in Ruhe lassen, bis es unten braun ist. Dann erst zerteilen.",
    detail:
      "Wer zu früh rührt, kocht das Fleisch im eigenen Saft statt es zu braten. Die braunen Röststellen bringen den kräftigen Geschmack in die Soße.",
  },
  {
    id: "g-lasagne-ruhen",
    category: "gericht",
    title: "Kniff für Lasagne",
    match: /lasagne|lasagna/i,
    text: "Nach dem Backen 10 Minuten ruhen lassen. Dann lässt sie sich sauber schneiden statt auseinanderzulaufen.",
    detail:
      "Die heiße Soße dickt beim kurzen Abkühlen nach und hält die Schichten zusammen. Die Zeit reicht genau zum Tischdecken.",
  },
  {
    id: "g-pfannkuchen-quellen",
    category: "gericht",
    title: "Kniff für Pfannkuchen",
    match: /pfannkuchen|eierkuchen|crêpe|crepe|palatschinken|pancake/i,
    text: "Den Teig 15 Minuten stehen lassen, bevor er in die Pfanne kommt. Die Pfannkuchen werden zarter und reißen nicht so leicht.",
    detail:
      "In der Ruhezeit quillt das Mehl und die kleinen Klümpchen lösen sich von selbst. Ein Schuss Mineralwasser macht sie zusätzlich luftig.",
  },
  {
    id: "g-pfannkuchen-erster",
    category: "gericht",
    title: "Tipp zu Pfannkuchen",
    match: /pfannkuchen|eierkuchen|crêpe|crepe|palatschinken|pancake/i,
    text: "Der erste Pfannkuchen wird oft nichts – ganz normal. Er ist der Test für die Hitze und der Lohn für den Koch.",
    detail:
      "Erst mit dem ersten Teig stellt sich die Pfanne richtig ein. Mittlere Hitze und wenig Fett, dann klappt’s ab Nummer zwei zuverlässig.",
  },
  {
    id: "g-schnitzel-panade",
    category: "gericht",
    title: "Profi-Tipp zum Schnitzel",
    match: /schnitzel/i,
    text: "Die Panade nur locker andrücken und das Schnitzel in reichlich Fett leicht schwenken. So wirft sie die schönen Wellen.",
    detail:
      "Locker sitzende Brösel lösen sich beim Braten ein wenig vom Fleisch, darunter bildet sich Dampf – das ergibt die luftige, knusprige Hülle.",
    steps: [
      "Mehl, Ei, Brösel – Brösel nur andrücken",
      "Fett fingerhoch erhitzen",
      "Pfanne sanft rütteln, damit Fett über das Schnitzel schwappt",
    ],
  },
  {
    id: "g-schnitzel-klopfen",
    category: "gericht",
    title: "Tipp zum Schnitzel",
    match: /schnitzel/i,
    text: "Das Fleisch zwischen zwei Lagen Frischhaltefolie dünn klopfen – ein schwerer Topfboden tut’s auch.",
    detail:
      "Dünnes Fleisch gart gleichmäßig und schnell durch, bevor die Panade zu dunkel wird. Die Folie verhindert, dass etwas reißt oder spritzt.",
  },
  {
    id: "g-gulasch-zwiebeln",
    category: "gericht",
    title: "Profi-Tipp zum Gulasch",
    match: /gulasch|goulash|pörkölt|porkolt/i,
    text: "Fürs Gulasch ruhig so viel Zwiebeln wie Fleisch nehmen. Sie zerkochen und machen die Soße von allein sämig.",
    detail:
      "Lange geschmorte Zwiebeln werden süß und lösen sich fast ganz auf. So braucht die Soße weder Mehl noch Soßenbinder.",
    steps: [
      "Fleisch portionsweise scharf anbraten",
      "Viele Zwiebeln goldbraun mitbraten",
      "Paprikapulver erst bei kleiner Hitze dazu, dann ablöschen",
    ],
  },
  {
    id: "g-kartoffelsuppe-kartoffeln",
    category: "gericht",
    title: "Tipp zur Kartoffelsuppe",
    match: /kartoffelsuppe|kartoffelcreme|erdäpfelsuppe/i,
    text: "Mehligkochende Kartoffeln nehmen und einen Teil nur grob zerdrücken. So wird die Suppe cremig und hat trotzdem Biss.",
    detail:
      "Mehlige Sorten geben beim Kochen Stärke ab und binden die Suppe ganz natürlich. Ein paar Stücke bleiben für alle, die gern was zum Kauen haben.",
  },
  {
    id: "g-chili-schokolade",
    category: "gericht",
    title: "Geheimtipp fürs Chili",
    match: /chili con carne|chili sin carne|\bchili\b/i,
    text: "Ein Stückchen dunkle Schokolade oder ein Teelöffel Kakao ins Chili – keiner schmeckt’s raus, aber alle merken, dass es runder ist.",
    detail:
      "Die leichte Bitternote verbindet Tomate, Bohnen und Gewürze. In Mexiko ist das ein alter Trick für Schmorgerichte.",
  },
  {
    id: "g-chili-tag-danach",
    category: "gericht",
    title: "Tipp zum Chili",
    match: /chili con carne|chili sin carne|\bchili\b/i,
    text: "Chili schmeckt am nächsten Tag noch besser. Die doppelte Menge kochen spart einen Abend.",
    detail:
      "Über Nacht ziehen die Gewürze richtig durch. Gut abgekühlt im Kühlschrank hält es sich 2–3 Tage; beim Aufwärmen einmal richtig heiß werden lassen.",
  },
  {
    id: "g-curry-gewuerze",
    category: "gericht",
    title: "Profi-Tipp zum Curry",
    match: /curry|dal\b|dhal|korma|tikka/i,
    text: "Currypulver oder -paste kurz im heißen Öl anrösten, bevor Flüssigkeit dazukommt. Der Duft sagt dir, wann’s reicht.",
    detail:
      "Viele Gewürzaromen lösen sich erst in heißem Fett. Eine halbe Minute genügt – länger, und es wird bitter.",
  },
  {
    id: "g-risotto-bruehe",
    category: "gericht",
    title: "Kniff fürs Risotto",
    match: /risotto/i,
    text: "Die Brühe nebenher warm halten und kellenweise angießen. Dauerrühren ist gar nicht nötig – ab und zu reicht.",
    detail:
      "Kalte Brühe bremst das Garen jedes Mal aus. Durch gelegentliches Rühren löst sich die Stärke vom Reis und macht ihn cremig.",
    steps: [
      "Reis in etwas Butter glasig anschwitzen",
      "Warme Brühe kellenweise dazu",
      "Zum Schluss Butter und Parmesan unterrühren, 2 Minuten ruhen lassen",
    ],
  },
  {
    id: "g-pizza-blech",
    category: "gericht",
    title: "Profi-Tipp zur Pizza",
    match: /pizza/i,
    text: "Das Backblech einfach mit vorheizen und die Pizza auf Backpapier daraufziehen. Der Boden wird knusprig statt weich.",
    detail:
      "Das heiße Blech gibt sofort viel Hitze an den Teig ab – fast wie im Steinofen. Den Ofen dafür so heiß wie möglich stellen.",
    steps: [
      "Ofen mit Blech auf höchster Stufe vorheizen",
      "Pizza auf Backpapier belegen",
      "Mit Papier aufs heiße Blech ziehen",
    ],
  },
  {
    id: "g-burger-mulde",
    category: "gericht",
    title: "Kniff für Burger",
    match: /burger|hamburger|cheeseburger/i,
    text: "Mit dem Daumen eine kleine Mulde in die Mitte der Patties drücken. Dann bleiben sie flach und wölben sich nicht.",
    detail:
      "Beim Braten zieht sich der Rand zusammen und drückt die Mitte hoch. Die Mulde gleicht das aus. Hackfleisch-Patties für Kinder am besten ganz durchbraten.",
  },
  {
    id: "g-fischstaebchen-gitter",
    category: "gericht",
    title: "Tipp zu Fischstäbchen",
    match: /fischstäbchen|fischstaebchen|backfisch|fish ?sticks/i,
    text: "Fischstäbchen im Ofen auf dem Gitter mit Backpapier backen und einmal wenden. Rundum knusprig, ganz ohne Spritzer.",
    detail:
      "Von unten kommt so auch Hitze dran, und der Boden wird nicht labbrig. Ein Pinselstrich Öl macht sie fast wie aus der Pfanne.",
  },
  {
    id: "g-lachs-haut",
    category: "gericht",
    title: "Profi-Tipp zum Lachs",
    match: /lachs|salmon/i,
    text: "Lachs auf der Hautseite braten und fast die ganze Zeit liegen lassen. Wenden nur kurz zum Schluss.",
    detail:
      "Die Haut schützt das zarte Fleisch vor zu viel Hitze und wird dabei schön kross. Der Lachs ist fertig, wenn er sich leicht in Blätter teilen lässt.",
  },
  {
    id: "g-haehnchen-ruhen",
    category: "gericht",
    title: "Tipp zur Hähnchenbrust",
    match: /hähnchen|haehnchen|hühnchen|huehnchen|hühnerbrust|chicken|poulet/i,
    text: "Hähnchenbrust nach dem Braten 5 Minuten zugedeckt ruhen lassen, dann aufschneiden. Sie bleibt viel saftiger.",
    detail:
      "Beim Ruhen verteilt sich der Fleischsaft wieder, statt aufs Brett zu laufen. Wichtig: Hähnchen immer ganz durchgaren – innen nicht mehr rosa, der Saft klar.",
  },
  {
    id: "g-haehnchen-gleich-dick",
    category: "gericht",
    title: "Kniff für Hähnchen",
    match: /hähnchen|haehnchen|hühnchen|huehnchen|hühnerbrust|chicken|poulet/i,
    text: "Die dicke Seite der Hähnchenbrust etwas flach klopfen oder waagerecht aufschneiden. Dann gart alles gleichzeitig.",
    detail:
      "Ist die Brust überall gleich dick, wird die dünne Spitze nicht trocken, während die dicke Stelle noch roh ist. So ist sie sicher durch und trotzdem saftig.",
    steps: [
      "Brust zwischen Folie legen",
      "Dicke Stelle mit dem Topfboden flach klopfen",
      "Bei mittlerer Hitze von beiden Seiten durchbraten",
    ],
  },
  {
    id: "g-ruehrei-sanft",
    category: "gericht",
    title: "Kniff für Rührei",
    match: /rührei|ruehrei|eierspeise|scrambled/i,
    text: "Rührei bei mittlerer Hitze langsam schieben statt wild rühren. Kurz bevor es fertig ist, vom Herd nehmen.",
    detail:
      "Die Resthitze gart die Eier fertig, ohne dass sie trocken und gummiartig werden. Ganz gestockt sind sie trotzdem – genau richtig für Kinder.",
  },
  {
    id: "g-omelett-pfanne",
    category: "gericht",
    title: "Tipp zum Omelett",
    match: /omelett|omelette|frittata/i,
    text: "Fürs Omelett eine kleine Pfanne nehmen und den Deckel kurz auflegen. Dann stockt es oben, ohne dass du wenden musst.",
    detail:
      "Unter dem Deckel staut sich Wärme und gart die Oberseite mit. Füllung erst drauf, wenn der Boden fest ist, und dann einfach zuklappen.",
  },
  {
    id: "g-nudelauflauf-bissfest",
    category: "gericht",
    title: "Tipp zum Nudelauflauf",
    match: /nudelauflauf|nudelgratin|pasta ?al ?forno|auflauf mit nudeln|überbackene nudeln/i,
    text: "Die Nudeln für den Auflauf 2 Minuten kürzer kochen als auf der Packung. Im Ofen garen sie fertig.",
    detail:
      "Im Auflauf ziehen die Nudeln noch Soße und werden weicher. So bleiben sie bissfest statt matschig.",
  },
  {
    id: "g-kartoffelbrei-stampfer",
    category: "gericht",
    title: "Profi-Tipp zum Kartoffelbrei",
    match: /kartoffelbrei|kartoffelpüree|kartoffelpueree|stampf|püree|mash/i,
    text: "Kartoffelbrei mit dem Stampfer machen, nicht mit dem Pürierstab, und die Milch warm dazugeben.",
    detail:
      "Der Pürierstab zerschlägt die Stärke, dann wird der Brei zäh wie Kleister. Warme Milch zieht besser ein und hält alles schön heiß.",
    steps: [
      "Kartoffeln gut abdampfen lassen",
      "Butter und warme Milch dazu",
      "Stampfen, mit Salz und Muskat abschmecken",
    ],
  },
  {
    id: "g-bratkartoffeln-vortag",
    category: "gericht",
    title: "Profi-Tipp für Bratkartoffeln",
    match: /bratkartoffel|röstkartoffel|roestkartoffel|kartoffelpfanne/i,
    text: "Am besten werden Bratkartoffeln aus Pellkartoffeln vom Vortag. Und dann: Geduld, nicht zu oft wenden.",
    detail:
      "Abgekühlte Kartoffeln sind fester und zerfallen nicht in der Pfanne. Liegen sie in Ruhe, bekommen sie die goldbraune Kruste.",
    steps: [
      "Gekochte Kartoffeln vom Vortag in Scheiben schneiden",
      "In heißem Fett nebeneinander anbraten",
      "Erst wenden, wenn sie unten goldbraun sind",
    ],
  },
  {
    id: "g-frikadellen-broetchen",
    category: "gericht",
    title: "Tipp zu Frikadellen",
    match: /frikadelle|bulette|fleischpflanzerl|fleischküchle|fleischkuechle|hackbällchen|hackbaellchen|köttbullar/i,
    text: "Ein eingeweichtes altes Brötchen in die Hackmasse macht Frikadellen saftig und locker.",
    detail:
      "Das Brötchen hält Feuchtigkeit fest, die sonst beim Braten verloren ginge. Mit nassen Händen formen, dann klebt nichts.",
  },
  {
    id: "g-linsensuppe-essig",
    category: "gericht",
    title: "Profi-Tipp zur Linsensuppe",
    match: /linsensuppe|linseneintopf|linsen mit|linsen und spätzle|\blinsen\b|dal\b|dhal/i,
    text: "Ein Schuss Essig zum Schluss weckt die Linsensuppe richtig auf. Salz auch erst am Ende dazu.",
    detail:
      "Die Säure hebt den erdigen Geschmack der Linsen. Salz oder Säure zu früh lässt manche Linsen länger hart bleiben.",
  },
  {
    id: "g-gemuesesuppe-reihenfolge",
    category: "gericht",
    title: "Tipp zur Gemüsesuppe",
    match: /gemüsesuppe|gemuesesuppe|gemüseeintopf|minestrone/i,
    text: "Hartes Gemüse wie Möhren zuerst in den Topf, Zucchini und Erbsen erst in den letzten Minuten.",
    detail:
      "So ist alles gleichzeitig gar, und nichts zerfällt. Die Suppe sieht bunter aus und jedes Gemüse schmeckt nach sich selbst.",
  },
  {
    id: "g-milchreis-anbrennen",
    category: "gericht",
    title: "Kniff für Milchreis",
    match: /milchreis|reisbrei|rice pudding/i,
    text: "Milchreis kurz aufkochen, dann zugedeckt bei kleinster Hitze quellen lassen. So brennt nichts an.",
    detail:
      "Milch setzt sich bei hoher Hitze schnell am Boden fest. Ein Topf mit dickem Boden und ab und zu umrühren machen es noch entspannter.",
  },
  {
    id: "g-kaesespaetzle-schichten",
    category: "gericht",
    title: "Tipp zu Käsespätzle",
    match: /käsespätzle|kaesespaetzle|kässpatzen|kasspatzen|käsknöpfle/i,
    text: "Spätzle und Käse abwechselnd schichten und die Röstzwiebeln obendrauf erst am Tisch. Bleibt alles knusprig.",
    detail:
      "Zwischen heißen Spätzle schmilzt der Käse gleichmäßig. Röstzwiebeln weichen in der Wärme schnell auf, deshalb kommen sie zuletzt.",
  },
  {
    id: "g-maultaschen-anbraten",
    category: "gericht",
    title: "Tipp zu Maultaschen",
    match: /maultasche/i,
    text: "Maultaschen in Scheiben schneiden und mit Zwiebeln und Ei in der Pfanne braten – geht auch prima mit Resten.",
    detail:
      "Geschmälzte Maultaschen sind in Schwaben ein Klassiker. Die Röstaromen bringen ganz neuen Geschmack in die Füllung.",
  },
  {
    id: "g-wraps-warm",
    category: "gericht",
    title: "Kniff für Wraps und Tacos",
    match: /wrap|taco|burrito|fajita|quesadilla|tortilla/i,
    text: "Die Fladen kurz in einer trockenen Pfanne erwärmen. Dann lassen sie sich rollen, ohne zu reißen.",
    detail:
      "Warme Tortillas werden geschmeidig und schmecken auch besser. In ein Küchentuch gewickelt bleiben sie am Tisch warm.",
  },
  {
    id: "g-tacos-buffet",
    category: "gericht",
    title: "Tipp zu Tacos",
    match: /taco|wrap|burrito|fajita/i,
    text: "Alle Füllungen in Schälchen auf den Tisch – jeder baut selbst. Auch wählerische Kinder finden so ihr Ding.",
    detail:
      "Selber zusammenstellen macht Spaß, und niemand muss etwas essen, das er nicht mag. Nebenbei landet oft mehr Gemüse im Fladen als gedacht.",
  },
  {
    id: "g-dressing-glas",
    category: "gericht",
    title: "Kniff fürs Salatdressing",
    match: /^(?!.*(kartoffel|nudel|erdäpfel)salat).*(salat|dressing|vinaigrette)/i,
    text: "Dressing einfach im Schraubglas schütteln, mit einem Teelöffel Senf dazu. Hält sich ein paar Tage im Kühlschrank.",
    detail:
      "Der Senf verbindet Öl und Essig, sodass sie sich nicht gleich wieder trennen. Kinder schütteln übrigens gern mit.",
    steps: [
      "3 Teile Öl, 1 Teil Essig, 1 TL Senf ins Glas",
      "Salz, Pfeffer, Prise Zucker dazu",
      "Deckel drauf und kräftig schütteln",
    ],
  },
  {
    id: "g-salat-trocken",
    category: "gericht",
    title: "Tipp zum Salat",
    match: /^(?!.*(kartoffel|nudel|erdäpfel|reis|linsen)salat).*salat/i,
    text: "Blattsalat gut trocken schleudern und erst kurz vorm Essen anmachen. Dann bleibt er knackig.",
    detail:
      "Auf nassen Blättern perlt das Dressing ab und verwässert. Zu früh angemacht, fällt der Salat schnell zusammen.",
  },
  {
    id: "g-ofengemuese-platz",
    category: "gericht",
    title: "Profi-Tipp zum Ofengemüse",
    match: /ofengemüse|ofengemuese|blechgemüse|ofenkartoffel|vom blech|blechgericht|geröstetes gemüse/i,
    text: "Dem Gemüse auf dem Blech Platz lassen – lieber zwei Bleche als eins zu voll. Dann röstet es statt zu dämpfen.",
    detail:
      "Liegt alles übereinander, staut sich der Dampf und das Gemüse wird weich statt braun. Mit Abstand bekommt es die leckeren Röstkanten.",
    steps: [
      "Gemüse in ähnlich große Stücke schneiden",
      "Mit Öl und Salz mischen, locker verteilen",
      "Bei 200 °C rösten, einmal wenden",
    ],
  },
  {
    id: "g-reis-quellen",
    category: "gericht",
    title: "Kniff für Reis",
    match: /\breis\b|basmati|jasminreis|reispfanne|langkornreis/i,
    text: "Reis kurz abspülen, mit der 1,5-fachen Menge Wasser aufkochen und zugedeckt bei kleiner Hitze quellen lassen. Deckel zu lassen!",
    detail:
      "Das Abspülen nimmt überschüssige Stärke weg, so klebt der Reis nicht. Zum Schluss 5 Minuten ruhen lassen und mit der Gabel auflockern.",
    steps: [
      "Reis im Sieb abspülen",
      "Mit 1,5-facher Menge Wasser und Salz aufkochen",
      "Zugedeckt 12–15 Min. quellen, dann ruhen lassen",
    ],
  },
  {
    id: "g-nudeln-kochwasser",
    category: "gericht",
    title: "Profi-Tipp für Nudeln",
    match: /nudel|pasta|spaghetti|penne|fusilli|tagliatelle|farfalle|rigatoni|makkaroni|maccheroni/i,
    text: "Vorm Abgießen eine Tasse Nudelwasser aufheben. Ein Schuss davon macht jede Soße cremiger und lässt sie besser haften.",
    detail:
      "Im Kochwasser steckt Stärke, die Soße und Nudeln verbindet. Öl ins Wasser braucht es dagegen nicht – gut umrühren am Anfang reicht.",
  },
  {
    id: "g-tomatensosse-zucker",
    category: "gericht",
    title: "Tipp zur Tomatensoße",
    match: /tomatenso(ß|ss)e|tomatensugo|\bsugo\b|marinara|pomodoro|napoli|arrabbiata/i,
    text: "Schmeckt die Tomatensoße sauer, hilft eine Prise Zucker oder ein Stückchen Butter. Und ruhig 20 Minuten köcheln lassen.",
    detail:
      "Tomaten aus der Dose sind mal mehr, mal weniger säuerlich. Beim Köcheln wird der Geschmack tiefer, und die Soße dickt von selbst ein.",
  },
  {
    id: "g-kartoffelsalat-warm",
    category: "gericht",
    title: "Profi-Tipp zum Kartoffelsalat",
    match: /kartoffelsalat|erdäpfelsalat|erdaepfelsalat/i,
    text: "Die Kartoffeln noch warm mit heißer Brühe und Essig anmachen. Dann ziehen sie den Geschmack richtig auf.",
    detail:
      "Warme Kartoffeln nehmen die Marinade auf wie ein Schwamm, kalte lassen sie außen liegen. Eine halbe Stunde ziehen lassen, dann nochmal abschmecken.",
    steps: [
      "Kartoffeln kochen, pellen, warm schneiden",
      "Heiße Brühe, Essig, Zwiebeln drüber",
      "30 Min. ziehen lassen, abschmecken",
    ],
  },
  {
    id: "g-gemuesepfanne-heiss",
    category: "gericht",
    title: "Kniff für die Gemüsepfanne",
    match: /gemüsepfanne|gemuesepfanne|wok|pfannengemüse|stir.?fry|gebratenes gemüse/i,
    text: "Pfanne richtig heiß werden lassen und das Gemüse in Portionen braten. So bleibt es knackig statt wässrig.",
    detail:
      "Zu viel Gemüse auf einmal kühlt die Pfanne ab, dann schmort es im eigenen Saft. Kurz und heiß gebraten behält es Farbe und Biss.",
  },
  {
    id: "g-fischfilet-trocken",
    category: "gericht",
    title: "Tipp zum Fischfilet",
    match: /fischfilet|seelachs|kabeljau|dorsch|rotbarsch|pangasius|zander|forelle|scholle|seehecht|\bfisch\b/i,
    text: "Fischfilet mit Küchenpapier trocken tupfen und dünn mehlieren. Dann klebt es nicht an und bekommt eine goldene Seite.",
    detail:
      "Feuchtigkeit lässt den Fisch in der Pfanne kochen statt braten. Das dünne Mehl schützt das zarte Fleisch und bräunt schön.",
  },
  {
    id: "g-hackbraten-ruhen",
    category: "gericht",
    title: "Tipp zum Hackbraten",
    match: /hackbraten|falscher hase|hackfleischbraten|meatloaf/i,
    text: "Hackbraten nach dem Backen 10 Minuten ruhen lassen. Dann zerfällt er beim Schneiden nicht.",
    detail:
      "Beim Ruhen festigt sich die Masse, und der Saft bleibt im Braten. Durch ist er, wenn beim Anstechen klarer Saft austritt.",
  },
  {
    id: "g-pommes-waessern",
    category: "gericht",
    title: "Kniff für Pommes und Wedges",
    match: /pommes|wedges|kartoffelspalten|ofenpommes|fritten|country potatoes/i,
    text: "Selbstgeschnittene Pommes 30 Minuten wässern und gut trocken tupfen. Dann werden sie im Ofen richtig knusprig.",
    detail:
      "Das Wasser zieht Stärke aus der Oberfläche, die sonst klebt und schnell dunkel wird. Trocken mit etwas Öl und mit Abstand auf dem Blech klappt’s am besten.",
    steps: [
      "Kartoffeln schneiden, 30 Min. in kaltes Wasser",
      "Gründlich trocken tupfen, mit Öl mischen",
      "Bei 220 °C backen, nach der Hälfte wenden, zum Schluss salzen",
    ],
  },
  {
    id: "g-suppe-abschmecken",
    category: "gericht",
    title: "Tipp für Suppen",
    match: /suppe|eintopf|brühe|bruehe|soup/i,
    text: "Suppe erst zum Schluss richtig salzen – beim Einkochen wird sie von allein kräftiger. Ein Spritzer Zitrone macht sie frisch.",
    detail:
      "Während des Kochens verdampft Wasser, das Salz bleibt. Wer am Anfang voll würzt, hat am Ende schnell zu viel.",
  },
  {
    id: "g-griessbrei-einrieseln",
    category: "gericht",
    title: "Kniff für Grießbrei",
    match: /grießbrei|griessbrei|grießpudding|griesspudding|grießschnitten|\bgrieß\b/i,
    text: "Den Grieß langsam in die heiße Milch rieseln lassen und dabei mit dem Schneebesen rühren. So gibt’s keine Klümpchen.",
    detail:
      "Kommt der Grieß auf einmal hinein, klumpt er sofort zusammen. Danach den Topf vom Herd nehmen und kurz quellen lassen.",
  },
  {
    id: "g-kaiserschmarrn-eischnee",
    category: "gericht",
    title: "Profi-Tipp zum Kaiserschmarrn",
    match: /kaiserschmarrn|schmarrn|kaiserschmarren/i,
    text: "Eier trennen und das Eiweiß steif geschlagen unterheben. Der Kaiserschmarrn wird herrlich fluffig.",
    detail:
      "Der Eischnee bringt Luft in den Teig, die beim Backen aufgeht. Zum Schluss mit etwas Zucker in der Pfanne karamellisieren – das ist der Clou.",
    steps: [
      "Eigelb mit Milch und Mehl verrühren",
      "Eiweiß steif schlagen und locker unterheben",
      "Anbacken, zerreißen, mit Zucker kurz karamellisieren",
    ],
  },
  {
    id: "g-flammkuchen-duenn",
    category: "gericht",
    title: "Tipp zum Flammkuchen",
    match: /flammkuchen|tarte flambée|tarte flambee|flammekueche/i,
    text: "Den Teig hauchdünn ausrollen und sparsam belegen. Bei höchster Hitze ist er in 10 Minuten knusprig.",
    detail:
      "Flammkuchen lebt vom dünnen, krossen Boden. Zu viel Belag macht ihn weich – weniger ist hier wirklich mehr.",
  },
  {
    id: "g-shakshuka-mulden",
    category: "gericht",
    title: "Kniff für Shakshuka",
    match: /shakshuka|schakschuka|eier in tomatenso(ß|ss)e/i,
    text: "Mit einem Löffel kleine Mulden in die Tomatensoße drücken und die Eier hineingleiten lassen. Deckel drauf, fertig.",
    detail:
      "In den Mulden bleiben die Eier an Ort und Stelle. Unter dem Deckel stocken sie gleichmäßig – für Kinder einfach etwas länger, bis das Eigelb fest ist.",
  },
  {
    id: "g-couscous-quellen",
    category: "gericht",
    title: "Tipp zu Couscous",
    match: /couscous|cous cous|bulgur/i,
    text: "Couscous mit gleich viel kochender Brühe übergießen, abdecken und 5 Minuten warten. Dann mit der Gabel auflockern.",
    detail:
      "Couscous muss nicht kochen, er quillt einfach. Mit Brühe statt Wasser und einem Löffel Öl schmeckt er gleich viel besser.",
  },
  {
    id: "g-quiche-vorbacken",
    category: "gericht",
    title: "Profi-Tipp zur Quiche",
    match: /quiche|tarte|zwiebelkuchen|lauchkuchen|gemüsekuchen/i,
    text: "Den Boden 10 Minuten vorbacken, bevor die Füllung reinkommt. So bleibt er knusprig statt durchgeweicht.",
    detail:
      "Die flüssige Eiermasse weicht rohen Teig schnell auf. Ein paar Gabelstiche im Boden verhindern, dass er beim Vorbacken Blasen wirft.",
    steps: [
      "Teig in die Form, mit der Gabel einstechen",
      "10 Min. vorbacken",
      "Füllung rein und fertig backen",
    ],
  },
];
