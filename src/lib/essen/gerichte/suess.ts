// Süße Hauptgerichte (5)

import type { GerichtEintrag } from "@/lib/essen/gerichte/types";

export const SUESS: GerichtEintrag[] = [
  {
    title: "Milchreis mit Apfelmus", minutes: 30, category: "vegetarisch", needs: ["Milchreis", "Milch", "Apfelmus"], beliebt: 5, kind: true,
    zutaten: [[250, "g", "Milchreis"], [1, "l", "Milch"], [2, "EL", "Zucker"], [1, "Prise", "Salz"], [1, "Glas", "Apfelmus"], [null, "", "Zimt und Zucker"]],
    schritte: ["Milch mit Zucker und Salz aufkochen.", "Milchreis einrühren und bei kleinster Hitze 25 Minuten quellen lassen, ab und zu rühren.", "Mit Apfelmus und Zimt und Zucker servieren."],
  },
  {
    title: "Kaiserschmarrn mit Apfelmus", minutes: 25, category: "vegetarisch", needs: ["Eier", "Milch", "Apfelmus"], usual: true, beliebt: 5, kind: true,
    zutaten: [[4, "", "Eier"], [250, "ml", "Milch"], [150, "g", "Mehl"], [2, "EL", "Zucker"], [2, "EL", "Butter"], [1, "Glas", "Apfelmus"], [null, "", "Puderzucker"]],
    schritte: ["Eier trennen, Eiweiß steif schlagen.", "Eigelb mit Milch, Mehl und Zucker glatt rühren, Eischnee unterheben.", "Teig in Butter backen, wenden und mit zwei Gabeln in Stücke reißen.", "Kurz weiterbraten, mit Puderzucker bestäuben und mit Apfelmus servieren."],
  },
  {
    title: "Arme Ritter mit Apfelmus", minutes: 15, category: "vegetarisch", needs: ["Toast", "Eier", "Milch", "Apfelmus"], usual: true, beliebt: 4, kind: true,
    zutaten: [[8, "Scheiben", "Toast oder Brot vom Vortag"], [3, "", "Eier"], [250, "ml", "Milch"], [2, "EL", "Butter"], [1, "Glas", "Apfelmus"], [null, "", "Zimt und Zucker"]],
    schritte: ["Eier mit Milch verquirlen.", "Brotscheiben darin kurz einweichen.", "In Butter von beiden Seiten goldbraun braten.", "Mit Zimt und Zucker bestreuen und mit Apfelmus servieren."],
  },
  {
    title: "Grießbrei", minutes: 10, category: "vegetarisch", needs: ["Grieß", "Milch"], beliebt: 3, kind: true,
    zutaten: [[1, "l", "Milch"], [100, "g", "Weichweizengrieß"], [3, "EL", "Zucker"], [1, "Prise", "Salz"], [300, "g", "Beeren oder Kompott"]],
    schritte: ["Milch mit Zucker und Salz aufkochen.", "Grieß unter Rühren einrieseln lassen.", "Bei kleiner Hitze 3 Minuten quellen lassen, dabei rühren.", "Mit Beeren oder Kompott servieren."],
  },
  {
    title: "Pfannkuchen mit Erdbeeren", minutes: 20, category: "vegetarisch", needs: ["Eier", "Milch", "Erdbeeren"], season: "sommer", beliebt: 4, kind: true,
    zutaten: [[250, "g", "Mehl"], [4, "", "Eier"], [500, "ml", "Milch"], [1, "Prise", "Salz"], [500, "g", "Erdbeeren"], [1, "EL", "Zucker"]],
    schritte: ["Erdbeeren putzen, klein schneiden und mit Zucker mischen.", "Mehl, Eier, Milch und Salz glatt rühren.", "In einer gefetteten Pfanne dünne Pfannkuchen backen.", "Mit den Erdbeeren füllen oder belegen."],
  },
];
