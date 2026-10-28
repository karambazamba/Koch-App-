// Kurzer Name einer Seite für den Zurück-Text im Seitenkopf ("‹ Unsere Rezepte").
// Unbekannte Seiten heißen schlicht "Zurück".

const PAGES: Record<string, string> = {
  "/aufgaben": "Aufgaben",
  "/einkaufsliste": "Einkaufsliste",
  "/einkaufsliste/laden": "Einkaufen",
  "/kochbuch": "Unsere Rezepte",
  "/kochbuch/rezept": "Rezept",
  "/kochbuch/kochen": "Kochen",
  "/notizen": "Notizen",
  "/sport": "Sport",
  "/tag": "Tag",
  "/vorrat": "Im Haus",
  "/vorrat/check": "Kurz-Check",
  "/wetter": "Wetter",
  "/wochenplan": "Wochenplan",
  "/woche/check": "Wochenplan",
  "/profil": "Einstellungen",
  "/profil/familie": "Familie",
  "/profil/essen": "Essen & Vorlieben",
  "/profil/kochstil": "Kochstil",
  "/profil/kuechenhelfer": "Begleitung",
  "/profil/bausteine": "Mehr Funktionen",
  "/profil/tagesablauf": "Tagesablauf",
  "/profil/mitteilungen": "Mitteilungen",
  "/profil/daten": "Daten & App",
  "/profil/produkte": "Produkte & Läden",
  "/pinnwand": "Pinnwand",
  "/spendentopf": "Spendentopf",
  "/tipps": "Tipps",
  "/profil/regiontipps": "Tipps aus der Region",
};

const TABS: Record<string, string> = { kalender: "Kalender", woche: "Kalender", essen: "Essen" };

export function pageLabel(url: string | null): string {
  if (!url) return "Zurück";
  const [path, query = ""] = url.split("?");
  if (path === "/") return TABS[new URLSearchParams(query).get("seite") ?? ""] ?? "Heute";
  return PAGES[path] ?? "Zurück";
}
