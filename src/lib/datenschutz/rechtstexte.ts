// Datenschutz, Impressum, Nutzungsbedingungen (Platz 23) – ENTWURF, vor
// Veröffentlichung juristisch prüfen lassen. Angaben zum Betreiber stehen
// nur hier (Platzhalter in eckigen Klammern, Felix füllt sie aus). Die
// Anbieter entsprechen docs/datenschutz/anbieter.md – neuer Anbieter oder
// neue Datenart: dort, in datenkarte.md und hier im selben PR ergänzen. Rein.

import { APP_NAME } from "@/lib/core/app";

/** Stand der Texte – bei wesentlicher Änderung erhöhen (dann wird einmal neu gefragt, 23b) */
export const RECHTSTEXTE_STAND = { version: 1, datum: "28. Oktober 2026" };

export const BETREIBER = {
  name: "[Verantwortlicher]",
  anschrift: "[Anschrift]",
  mail: "[Datenschutz-Kontakt-Mail]",
  telefon: "[Telefon]",
  vertreten: "[vertreten durch]",
  register: "[Registergericht und -nummer, falls vorhanden]",
  ustid: "[USt-IdNr., falls vorhanden]",
  supabaseRegion: "[Supabase-Region]",
};

/** „Bevor’s losgeht“ (vor der App, für alle): drei kurze Sätze, dann Häkchen und „Weiter“ */
export const VOR_DEM_START = {
  titel: "Bevor’s losgeht",
  saetze: [
    "Eure Sachen bleiben auf diesem Handy. Mit Konto teilt ihr sie in der Familie.",
    "Ich bin eine KI und kann mich auch mal irren.",
    "Eure Daten werden nie verkauft.",
  ],
  haken: "Ich akzeptiere die Nutzungsbedingungen und habe die Datenschutzerklärung gelesen.",
};

export const ENTWURF = "Entwurf – vor Veröffentlichung juristisch prüfen lassen.";

/** Solange Verantwortlicher, Anschrift oder Kontakt-Mail Platzhalter sind: Band „Entwurf“ oben auf den Rechtsseiten */
export const entwurfOffen = (b: Pick<typeof BETREIBER, "name" | "anschrift" | "mail"> = BETREIBER) => [b.name, b.anschrift, b.mail].some((v) => /^\[.*\]$/.test(v.trim()));

export type Abschnitt = { titel: string; absaetze: string[] };

/** „Kurz gesagt“ in sechs Punkten (oben auf /datenschutz und unter „Deine Daten“) */
export const KURZ_GESAGT: { titel: string; text: string }[] = [
  { titel: "Wo eure Daten liegen", text: "Ohne Konto nur auf diesem Gerät. Mit Konto zusätzlich in unserer Datenbank, damit die Familie sie teilen kann. Unsere Server-Funktionen laufen in Frankfurt." },
  { titel: "Was ich sehe", text: "Nur, was ihr mir sagt oder weiterleitet. Für eine Antwort geht der Satz mit dem nötigen Ausschnitt an unseren KI-Anbieter. Sprachnachrichten nie." },
  { titel: "Wer sie sonst sieht", text: "Eure Familie, was ihr teilt. „Arbeit“ nur du. Niemand sonst." },
  { titel: "Wie lange", text: "Bis ihr es löscht. Pinnwand-Zettel gehen nach 7 Tagen ins Archiv und bleiben dort, bis ihr sie löscht. Vorschläge aus Mails 7 Tage. Den Chat speichere ich gar nicht." },
  { titel: "Nie verkauft", text: "Keine Tracker, keine Werbe-Profile. Eure Daten werden nie verkauft." },
  { titel: "Eure Rechte", text: "Ansehen, mitnehmen, löschen: alles in den Einstellungen unter „Daten & App“. Fragen gern an " + BETREIBER.mail + "." },
];

export const DATENSCHUTZ: Abschnitt[] = [
  { titel: "Verantwortlich", absaetze: [`${BETREIBER.name}, ${BETREIBER.anschrift}. Kontakt für Datenschutz: ${BETREIBER.mail}.`] },
  {
    titel: "Was wir verarbeiten und warum",
    absaetze: [
      `Ohne Konto speichert ${APP_NAME} alles nur im Speicher deines Browsers auf diesem Gerät. Wir sehen davon nichts.`,
      "Mit Konto: deine E-Mail-Adresse (zum Anmelden per Code), dein Anzeigename und deine Rolle in der Familie sowie die Einträge, die ihr teilt (Termine, Aufgaben, Einkauf, Pinnwand mit Fotos und Sprachnachrichten). Fotos für die Pinnwand verkleinern wir vorher auf dem Gerät (höchstens 1600 Pixel); ohne Konto bleiben sie nur auf dem Gerät, mit Konto sieht sie nur eure Familie. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Nutzung der App).",
      "Allergien und Unverträglichkeiten im Profil bleiben auf dem Gerät. Für Vorschläge können sie an die KI gehen; das sind Gesundheitsdaten, wir verarbeiten sie nur mit deiner Einwilligung (Art. 9 Abs. 2 lit. a DSGVO).",
      "Technisch nötig: IP-Adresse und Zeitpunkt beim Aufruf (Betrieb, Missbrauch verhindern, Art. 6 Abs. 1 lit. f DSGVO). Unsere Protokolle enthalten keine Inhalte, nur Technik-Zahlen.",
    ],
  },
  {
    titel: `KI („${APP_NAME}“)`,
    absaetze: [
      `${APP_NAME} ist eine KI. Antworten können Fehler enthalten. Für eine Antwort schicken wir deinen Satz und den nötigen Ausschnitt (zum Beispiel heutige Termine oder die Einkaufsliste) an Anthropic PBC (USA). Sprachnachrichten gehen nie an die KI. Wie lange Anthropic Anfragen aufbewahrt und ob sie zum Training genutzt werden: [nach Prüfung der aktuellen Anbieter-Bedingungen ergänzen].`,
      `Damit ${APP_NAME} auf jedem Handy gleich klingt und dich gut versteht, gehen ihre Antworten zum Vorlesen und deine Aufnahme beim Sprechen mit ${APP_NAME} kurz an unseren Sprach-Anbieter ElevenLabs. Wir speichern die Aufnahme nicht; sie dient nur dazu, deinen Satz zu verstehen. Pinnwand-Sprachnachrichten gehen nie dorthin. Ohne KI-Einwilligung oder wenn du „Stimme des Handys“ wählst, bleibt es bei den Funktionen deines Browsers. Speicherdauer und Serverstandort bei ElevenLabs: [nach Prüfung der Anbieter-Bedingungen ergänzen].`,
    ],
  },
  {
    titel: "Anbieter, die für uns arbeiten",
    absaetze: [
      "Vercel Inc. (Hosting, Server-Funktionen in Frankfurt), Supabase Inc. (Konten, Datenbank, Sprachnachrichten und Pinnwand-Fotos; Region " + BETREIBER.supabaseRegion + "), Anthropic PBC (KI), ElevenLabs (Sprachausgabe und Spracherkennung), Resend (Empfang von „Mails an " + APP_NAME + "“). Mit allen besteht ein Vertrag zur Auftragsverarbeitung [bitte bestätigen]. Übermittlung in die USA auf Grundlage des EU-US Data Privacy Framework bzw. von Standardvertragsklauseln [je Anbieter bitte prüfen].",
      "Wetter: Bright Sky (Daten des Deutschen Wetterdienstes) und Open-Meteo bekommen nur den Ortsnamen. Bei „Meinen Standort verwenden“ gehen auf etwa einen Kilometer gerundete Koordinaten an OpenStreetMap Nominatim; gespeichert wird nur der Ortsname.",
      "Kalender-Links: Der Link bleibt auf deinem Gerät. Zum Abrufen geht er über unseren Server zum Kalender-Anbieter, wird dabei aber weder gespeichert noch protokolliert.",
      "Ohne Sprach-Anbieter nutzen Spracheingabe und Vorlesen die Funktionen deines Browsers. Bei Chrome und Android kann der Ton an Google gehen, bei Safari und iOS an Apple. Erinnerungen (Push) laufen über die Push-Dienste von Apple, Google oder Mozilla.",
    ],
  },
  {
    titel: "Wie lange",
    absaetze: [
      "Einträge bleiben, bis ihr sie löscht. Pinnwand-Zettel, Fotos und Sprachnachrichten gehen nach 7 Tagen (oder 24 Stunden nach „Erledigt“) ins Archiv und bleiben dort, bis ihr sie löscht; Ton und Bilder gelöschter Zettel räumt der Server täglich weg. Vorschläge aus Mails nach 7 Tagen, die Mail selbst speichern wir nie. Der Chat wird nicht gespeichert. Einladungs-Links gelten 14 Tage.",
      "„Konto löschen“ entfernt deine Daten auf dem Server sofort; verlässt die letzte Person die Familie, wird auch die Familie gelöscht. Sicherungskopien unserer Anbieter laufen nach spätestens 30 Tagen aus [bitte bestätigen].",
    ],
  },
  {
    titel: "Deine Rechte",
    absaetze: [
      "Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie das Recht, eine Einwilligung jederzeit zu widerrufen. In der App: Einstellungen → Daten & App (Daten herunterladen, Konto löschen). Du kannst dich bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel beim Unabhängigen Landeszentrum für Datenschutz Schleswig-Holstein [zuständige Behörde bitte prüfen].",
    ],
  },
  { titel: "Kein Tracking, keine Werbe-Profile", absaetze: [`Wir verkaufen keine Daten und nutzen keine Analyse- oder Tracking-Dienste. Falls ${APP_NAME} einmal Werbung zeigt, dann nur allgemeine Werbung, ohne Tracking und ohne eure Daten. Cookies setzen wir nicht; im Browser-Speicher liegt nur, was die App selbst braucht.`] },
  { titel: "Kinder", absaetze: [`${APP_NAME} ist für Erwachsene. Zugänge für Kinder unter 16 Jahren richten nur die Eltern ein; von Kindern speichern wir so wenig wie möglich (meist nur den Vornamen).`] },
];

export const IMPRESSUM: Abschnitt[] = [
  { titel: "Angaben nach § 5 DDG", absaetze: [BETREIBER.name, BETREIBER.anschrift, BETREIBER.vertreten] },
  { titel: "Kontakt", absaetze: [`E-Mail: ${BETREIBER.mail}`, `Telefon: ${BETREIBER.telefon}`] },
  { titel: "Register und Steuer", absaetze: [BETREIBER.register, BETREIBER.ustid] },
  { titel: "Verantwortlich für den Inhalt", absaetze: [`${BETREIBER.name}, ${BETREIBER.anschrift} [nach § 18 Abs. 2 MStV, falls nötig]`] },
  { titel: "Gemacht in Eutin", absaetze: ["Eine Idee von KARAMBA Eis."] },
];

export const NUTZUNGSBEDINGUNGEN: Abschnitt[] = [
  { titel: "Kostenlos", absaetze: [`${APP_NAME} ist kostenlos. Der Spendentopf ist freiwillig, Zahlungen laufen nie über die App.`] },
  { titel: "Eine KI hilft mit", absaetze: [`${APP_NAME} ist eine KI. Antworten und Vorschläge können Fehler enthalten. Bitte prüfe Wichtiges selbst, besonders Termine, Allergien und Gesundheitsfragen. Wir übernehmen keine Gewähr für KI-Antworten.`] },
  { titel: "Faire Nutzung", absaetze: ["Bitte nutze die App nur für deinen Alltag und den deiner Familie. Für die KI gilt ein Tageslimit. Missbrauch (zum Beispiel automatisierte Anfragen) kann zur Sperre führen."] },
  { titel: "Familie und Einladungen", absaetze: ["Wer eine Familie anlegt oder einlädt, entscheidet, wer dazugehört. Erwachsene können einladen, Einladungen zurückziehen und die Familie verlassen. Was ihr unter „Familie“ teilt, sehen alle Mitglieder; „Arbeit“ nur du."] },
  { titel: "Kündigen und löschen", absaetze: ["Du kannst jederzeit aufhören: Konto löschen in den Einstellungen unter „Daten & App“. Ohne Konto löschst du alles, indem du die App bzw. die Website-Daten im Browser entfernst."] },
  { titel: "Änderungen", absaetze: ["Ändern sich diese Bedingungen wesentlich, fragen wir dich in der App einmal neu."] },
];
