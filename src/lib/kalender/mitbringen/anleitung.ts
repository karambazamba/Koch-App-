// „Kalender verbinden – einwandfrei auf jedem Gerät“ (Tafel 23): Nicht das
// Gerät entscheidet, sondern wo die Termine liegen. Die Anleitung passt zu
// Dienst UND Gerät (iPhone, Android, Computer – erkannt, umschaltbar „Ich bin
// am …“). Nur lesen: Wir ändern nie etwas im fremden Kalender. Dazu: falsch
// eingefügte Links freundlich erklären. Rein.

import type { Anbieter, Schritt } from "@/lib/kalender/mitbringen/angebot";

export type Geraet = "iphone" | "android" | "computer";

export const GERAETE: { id: Geraet; name: string }[] = [
  { id: "iphone", name: "iPhone" },
  { id: "android", name: "Android" },
  { id: "computer", name: "Computer" },
];

/** Gerät aus dem User-Agent (iPad zählt zum iPhone, Mac zum Computer) */
export function geraetVon(ua: string): Geraet {
  if (/iPhone|iPad|iPod/i.test(ua)) return "iphone";
  if (/Android/i.test(ua)) return "android";
  return "computer";
}

const DESKTOP: Record<Geraet, string> = {
  iphone: "Am iPhone: im Browser über „aA“ → „Desktop-Website anfordern“.",
  android: "Am Android-Handy: in Chrome über ⋮ → „Desktopversion“.",
  computer: "",
};

/** Kurze Schritte je Dienst und Gerät (der letzte Bildschirm ist immer „Link einfügen“) */
export function schritte(anbieter: Anbieter, geraet: Geraet): Schritt[] {
  const desktop = DESKTOP[geraet];
  switch (anbieter) {
    case "apple":
      if (geraet === "iphone")
        return [
          { icon: "kalender", text: "Öffne die Kalender-App und tippe unten auf „Kalender“." },
          { icon: "info", text: "Tippe auf das ⓘ neben deinem Kalender. Tipp: lieber den Familien-Kalender als den privaten." },
          { icon: "schalter", text: "Schalte „Öffentlicher Kalender“ ein." },
          { icon: "teilen", text: "Tippe auf „Link teilen …“ → „Kopieren“ und komm zurück." },
        ];
      if (geraet === "computer")
        return [
          { icon: "kalender", text: "Am Mac: Kalender-App öffnen, mit Rechtsklick auf deinen Kalender → „Teilen“ bzw. „Kalendereinstellungen“." },
          { icon: "schalter", text: "„Öffentlicher Kalender“ einschalten." },
          { icon: "kopieren", text: "Den Link kopieren. Ohne Mac: icloud.com/calendar → Personen-Symbol beim Kalender → „Öffentlicher Kalender“." },
        ];
      return [
        { icon: "computer", text: "Im Browser icloud.com/calendar öffnen und anmelden." },
        { icon: "teilen", text: "Beim Kalender aufs Personen-Symbol tippen → „Öffentlicher Kalender“ einschalten." },
        { icon: "kopieren", text: "Den Link kopieren und hier einfügen." },
      ];
    case "google":
      return [
        { icon: "computer", text: `Das geht nur auf calendar.google.com, nicht in der Google-Kalender-App.${desktop ? ` ${desktop}` : ""}` },
        { icon: "einstellungen", text: "Beim Kalender auf ⋮ → „Einstellungen und Freigabe“." },
        { icon: "kopieren", text: "Ganz unten „Geheime Adresse im iCal-Format“ kopieren. Ist der Punkt nicht da? Dann hat ihn der Admin (Firma/Schule) ausgeschaltet." },
      ];
    case "outlook":
      return [
        { icon: "computer", text: `outlook.live.com im Browser öffnen → ⚙ → „Kalender“.${desktop ? ` ${desktop}` : ""}` },
        { icon: "teilen", text: "„Freigegebene Kalender“ → „Kalender veröffentlichen“, Kalender und „Kann alle Details anzeigen“ wählen → „Veröffentlichen“." },
        { icon: "kopieren", text: "Den ICS-Link kopieren. Bei Firmenkonten kann der Admin das sperren." },
      ];
    case "todoist":
      return [
        { icon: "computer", text: `Im Browser todoist.com öffnen (in den Handy-Apps gibt es den Link nicht).${desktop ? ` ${desktop}` : ""}` },
        { icon: "einstellungen", text: "Oben links aufs Profilbild → „Einstellungen“ → „Integrationen“ → „Kalender“." },
        { icon: "kopieren", text: "Die „Kalender-Abonnement-URL“ kopieren. Die Aufgaben stehen dann bei dir zum Nachschauen, abgehakt wird in Todoist." },
      ];
  }
}

/** „Weiß nicht?“ – wo man sieht, wo die Termine liegen */
export const WEISS_NICHT: Record<Geraet, string> = {
  iphone: "Am iPhone: Einstellungen → Apps → Kalender → Accounts. Da steht, ob deine Termine bei iCloud, Google oder Outlook liegen.",
  android: "Am Android-Handy: Kalender-App → Menü → Einstellungen bzw. Konten. Meist liegen die Termine bei Google.",
  computer: "Schau in deiner Kalender-App, zu welchem Konto der Kalender gehört (iCloud, Google, Outlook).",
};

/** Mail an sich selbst, um es am Computer zu machen */
export function mailAnMich(anbieter: Anbieter, app: string): string {
  const steps = schritte(anbieter, "computer")
    .map((s, i) => `${i + 1}. ${s.text}`)
    .join("\n");
  const subject = `${app}: Kalender verbinden`;
  const body = `${steps}\n\nDanach den Link in ${app} unter Einstellungen → Kalender einfügen.`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Falsch eingefügt? Freundlich sagen, was fehlt (und bei welchem Schritt) – null = sieht gut aus */
export function linkFehler(url: string): { text: string; anbieter: Anbieter; schritt: number } | null {
  const u = url.trim().toLowerCase();
  if (/calendar\.google\.com/.test(u) && !/\/ical\//.test(u)) return { text: "Das ist der normale Google-Link. Ich brauch die „Geheime Adresse im iCal-Format“ aus den Einstellungen des Kalenders.", anbieter: "google", schritt: 2 };
  if (/calendar\.google\.com\/calendar\/ical\/.+\/public\//.test(u)) return { text: "Das ist die öffentliche Adresse – die zeigt oft nur „beschäftigt“. Nimm lieber die „Geheime Adresse im iCal-Format“.", anbieter: "google", schritt: 2 };
  if (/icloud\.com\/(calendar|#calendar)/.test(u) && !/published/.test(u)) return { text: "Das ist die iCloud-Seite. Ich brauch den Link von „Öffentlicher Kalender“.", anbieter: "apple", schritt: 2 };
  if (/outlook\.(live|office|office365)\.com/.test(u) && !/\.ics(\?|$)|\/owa\/calendar\//.test(u)) return { text: "Das ist die Outlook-Seite, nicht der ICS-Link. Den gibt’s unter „Kalender veröffentlichen“.", anbieter: "outlook", schritt: 1 };
  if (/todoist\.com\/(app|showtask|projects?)/.test(u)) return { text: "Das ist ein Link in die Todoist-App. Ich brauch die „Kalender-Abonnement-URL“ aus den Einstellungen.", anbieter: "todoist", schritt: 1 };
  return null;
}
