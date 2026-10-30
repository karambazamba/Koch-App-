// Datenschutz, Impressum, Nutzungsbedingungen (Platz 23) – ENTWURF, vor
// Veröffentlichung juristisch prüfen lassen. Angaben zum Betreiber stehen
// nur hier (offene Punkte in eckigen Klammern, Felix füllt sie aus). Die
// Anbieter entsprechen docs/datenschutz/anbieter.md – neuer Anbieter oder
// neue Datenart: dort, in datenkarte.md und hier im selben PR ergänzen. Rein.

import { APP_NAME } from "@/lib/core/app";

/** Stand der Texte – bei wesentlicher Änderung erhöhen (dann wird einmal neu gefragt, 23b) */
export const RECHTSTEXTE_STAND = { version: 1, datum: "29. Oktober 2026" };

export const BETREIBER = {
  name: "KARAMBA Eis GmbH",
  anschrift: "Am Rosengarten 11, 23701 Eutin",
  mail: "eis.karamba@gmail.com",
  web: "www.karamba-eis.de",
  vertreten: "Felix Gabriel",
  supabaseRegion: "[Supabase-Region]",
};

/** „Bevor’s losgeht“ (vor der App, für alle): drei kurze Sätze, dann Häkchen und „Weiter“ */
export const VOR_DEM_START = {
  titel: "Bevor’s losgeht",
  saetze: [
    "Deine Sachen bleiben auf diesem Handy. Mit Konto teilst du sie mit deinen Leuten.",
    "Ich bin eine KI und kann mich auch mal irren.",
    "Deine Daten werden nie verkauft.",
  ],
  haken: "Ich akzeptiere die Nutzungsbedingungen und hab die Datenschutzerklärung gelesen.",
};

export const ENTWURF = "Entwurf – vor Veröffentlichung juristisch prüfen lassen.";

/** Solange Verantwortlicher, Anschrift oder Kontakt-Mail Platzhalter sind: Band „Entwurf“ oben auf den Rechtsseiten */
export const entwurfOffen = (b: Pick<typeof BETREIBER, "name" | "anschrift" | "mail"> = BETREIBER) => [b.name, b.anschrift, b.mail].some((v) => /^\[.*\]$/.test(v.trim()));

export type Abschnitt = { titel: string; absaetze: string[] };

/** „Kurz gesagt“ in sechs Punkten (oben auf /datenschutz und unter „Deine Daten“) */
export const KURZ_GESAGT: { titel: string; text: string }[] = [
  { titel: "Wo eure Daten liegen", text: "Ohne Konto nur auf diesem Gerät. Mit Konto zusätzlich in unserer Datenbank, damit die Familie sie teilen kann. Unsere Server-Funktionen laufen in Frankfurt." },
  { titel: "Was ich sehe", text: "Nur, was ihr mir sagt oder weiterleitet. Für eine Antwort geht der Satz mit dem nötigen Ausschnitt an unseren KI-Anbieter. Sprachnachrichten nie." },
  { titel: "Wer sie sonst sieht", text: "Eure Familie, was ihr teilt. „Ich“ und „Arbeit“ nur du. Niemand sonst." },
  { titel: "Wie lange", text: "Bis ihr es löscht. Pinnwand-Zettel gehen abgehakt oder nach 7 Tagen ins Archiv und werden dort nach 30 Tagen gelöscht. Vorschläge aus Mails 7 Tage. Den Chat speichere ich gar nicht." },
  { titel: "Nie verkauft", text: "Keine Tracker, keine Werbe-Profile. Eure Daten werden nie verkauft." },
  { titel: "Eure Rechte", text: "Ansehen, mitnehmen, löschen: alles in den Einstellungen unter „Daten & App“. Fragen gern an " + BETREIBER.mail + "." },
];

export const DATENSCHUTZ: Abschnitt[] = [
  { titel: "Verantwortlich", absaetze: [`${BETREIBER.name}, ${BETREIBER.anschrift}. Kontakt für Datenschutz: ${BETREIBER.mail}.`] },
  {
    titel: "Was wir verarbeiten und warum",
    absaetze: [
      `Ohne Konto speichert ${APP_NAME} alles nur im Speicher deines Browsers auf diesem Gerät. Wir sehen davon nichts.`,
      "Mit Konto: deine E-Mail-Adresse (zum Anmelden per Code), dein Anzeigename und deine Rolle in der Familie sowie die Einträge, die ihr teilt (Termine, Aufgaben, Einkauf, Pinnwand mit Fotos und Sprachnachrichten). Fotos für die Pinnwand verkleinern wir vorher auf dem Gerät (höchstens 1600 Pixel); ohne Konto bleiben sie nur auf dem Gerät, mit Konto sieht sie nur eure Familie. Zettel „Nur für mich“ sieht nur, wer sie geschrieben hat; ihre Fotos bleiben auf dem Gerät. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Nutzung der App).",
      `Wer was sieht: Was ihr unter „Familie“ eintragt, sehen alle in der Familie; „Ich“ und „Arbeit“ siehst nur du. Korrigierst du, für wen etwas ist, merkt sich ${APP_NAME} ein Stichwort dazu (zum Beispiel „Zahnarzt“ → nur ich), damit sie es beim nächsten Mal richtig vorwählt. Die Stichworte bleiben auf deinem Gerät, gehen nur als Teil des nötigen Ausschnitts an die KI und lassen sich unter Einstellungen → ${APP_NAME} → „Was ich mir gemerkt hab“ einzeln löschen.`,
      `Einkauf: Hakst du auf einer Laden-Seite etwas ab, merkt sich ${APP_NAME}, in welchem Laden (Sache, Laden, wie oft, wann zuletzt), damit Neues gleich im richtigen Laden landet. Das bleibt auf deinem Gerät, mit Konto teilt es eure Familie wie die Einkaufsliste; wir werten es nicht aus. Was du nur einmal vor über 90 Tagen gekauft hast, vergisst sie von selbst, alles andere lässt sich unter Einstellungen → ${APP_NAME} → „Was ich mir gemerkt hab“ einzeln löschen.`,
      `Läden einrichten: Sagst du einmal, wo ihr was kauft (Hauptladen, Sorte → Läden), speichert ${APP_NAME} das wie die Einkaufsliste – auf dem Gerät, mit Konto für eure Familie. Kennt die App eine Sache nicht, schickt sie mit deiner KI-Einwilligung nur deren Namen einmal an die KI, um sie einer Sorte zuzuordnen; das Ergebnis bleibt gespeichert. Ändern geht unter Einkauf → „···“ → „Meine Läden & was wo“.`,
      `Wundertüte und Rätsel: Damit nichts zweimal kommt, merkt sich ${APP_NAME}, welche Karten und Rätsel ihr schon gesehen habt (nur die Kennungen), und die Witze und Rätsel, die sie selbst nachgelegt hat. Das bleibt auf deinem Gerät; mit Konto teilt es eure Familie, damit niemand dasselbe doppelt bekommt. Es ist in „Daten sichern“ enthalten und wird mit den App-Daten bzw. dem Konto gelöscht.`,
      "Allergien und Unverträglichkeiten im Profil bleiben auf dem Gerät. Für Vorschläge können sie an die KI gehen; das sind Gesundheitsdaten, wir verarbeiten sie nur mit deiner Einwilligung (Art. 9 Abs. 2 lit. a DSGVO).",
      "Technisch nötig: IP-Adresse und Zeitpunkt beim Aufruf (Betrieb, Missbrauch verhindern, Art. 6 Abs. 1 lit. f DSGVO). Unsere Protokolle enthalten keine Inhalte, nur Technik-Zahlen.",
    ],
  },
  {
    titel: `KI („${APP_NAME}“)`,
    absaetze: [
      `${APP_NAME} ist eine KI. Antworten können Fehler enthalten. Für eine Antwort schicken wir deinen Satz und den nötigen Ausschnitt (zum Beispiel heutige Termine oder die Einkaufsliste) an Anthropic PBC (USA). Sprachnachrichten gehen nie an die KI. Gehen Witze oder Rätsel zur Neige, bittet die App die KI um neue; dabei geht nur diese Bitte hin, keine Angaben über euch, und ob eine Antwort einer schon bekannten Karte ähnelt, prüft dein Gerät. Wie lange Anthropic Anfragen aufbewahrt und ob sie zum Training genutzt werden: [nach Prüfung der aktuellen Anbieter-Bedingungen ergänzen].`,
      `Damit ${APP_NAME} auf jedem Handy gleich klingt und dich gut versteht, gehen ihre Antworten zum Vorlesen und dein Ton beim Sprechen mit ${APP_NAME} an unseren Sprach-Anbieter ElevenLabs. Der Ton wird dabei live übertragen, damit du deinen Satz schon beim Sprechen siehst; weder wir noch die App speichern ihn, er dient nur dazu, deinen Satz zu verstehen. Pinnwand-Sprachnachrichten gehen nie dorthin. Ohne KI-Einwilligung oder wenn du „Stimme des Handys“ wählst, bleibt es bei den Funktionen deines Browsers. Speicherdauer und Serverstandort bei ElevenLabs: [nach Prüfung der Anbieter-Bedingungen ergänzen].`,
      `Durchatmen: Die Ansagen sind feste Sätze, die wir einmal vorab mit ${APP_NAME}s Stimme bei ElevenLabs erzeugt haben, ohne Daten von dir. Sie liegen öffentlich und ohne Personenbezug in unserem Speicher bei Supabase; gibt es eine noch nicht, hörst du nur Klang. Bei den Übungen wird nichts aufgenommen und nichts gesendet. Auf deinem Gerät merkt sich ${APP_NAME} nur deine Lieblinge, wie sie anleiten soll und ob das leise Angebot an ist.`,
    ],
  },
  {
    titel: "Anbieter, die für uns arbeiten",
    absaetze: [
      "Vercel Inc. (Hosting, Server-Funktionen in Frankfurt), Supabase Inc. (Konten, Datenbank, Sprachnachrichten und Pinnwand-Fotos; Region " + BETREIBER.supabaseRegion + "), Anthropic PBC (KI), ElevenLabs (Sprachausgabe und Spracherkennung), Resend (Empfang von „Mails an " + APP_NAME + "“). Mit allen besteht ein Vertrag zur Auftragsverarbeitung [bitte bestätigen]. Übermittlung in die USA auf Grundlage des EU-US Data Privacy Framework bzw. von Standardvertragsklauseln [je Anbieter bitte prüfen].",
      "Wetter: Bright Sky (Daten des Deutschen Wetterdienstes) und Open-Meteo bekommen nur den Ortsnamen. Bei „Meinen Standort verwenden“ gehen auf etwa einen Kilometer gerundete Koordinaten an OpenStreetMap Nominatim; gespeichert wird nur der Ortsname.",
      "„Was los?“: Veranstaltungsangaben: Kreis Ostholstein, ohne Gewähr. Unser Server holt den öffentlichen Veranstaltungskalender des Kreises einmal am Tag allgemein ab, nicht pro Person. Von dir geht nichts an den Kreis; die App lädt die Liste nur von unserem Server. Übernommen werden nur Titel, Datum, Uhrzeit, Ort und Link.",
      "Kalender-Links: Der Link bleibt auf deinem Gerät. Zum Abrufen geht er über unseren Server zum Kalender-Anbieter, wird dabei aber weder gespeichert noch protokolliert.",
      "Ohne Sprach-Anbieter nutzen Spracheingabe und Vorlesen die Funktionen deines Browsers. Bei Chrome und Android kann der Ton an Google gehen, bei Safari und iOS an Apple. Erinnerungen (Push) laufen über die Push-Dienste von Apple, Google oder Mozilla.",
    ],
  },
  {
    titel: "Wie lange",
    absaetze: [
      "Einträge bleiben, bis ihr sie löscht. Pinnwand-Zettel, Fotos und Sprachnachrichten gehen kurz nach „Erledigt“ oder nach 7 Tagen ins Archiv (außer „Bleibt hängen“) und werden dort nach 30 Tagen gelöscht, früher, wenn ihr sie löscht; Ton und Bilder gelöschter Zettel räumt der Server täglich weg. Vorschläge aus Mails nach 7 Tagen, die Mail selbst speichern wir nie. Der Chat wird nicht gespeichert. Einladungs-Links gelten 14 Tage.",
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

/** Impressum: Wortlaut von Felix (A-070), Zeilenumbrüche per `\n` */
export const IMPRESSUM: Abschnitt[] = [
  {
    titel: "Angaben gemäß § 5 DDG",
    absaetze: [
      `${BETREIBER.name}\nAm Rosengarten 11\n23701 Eutin`,
      "Handelsregister: HRB 25642 HL\nRegistergericht: Amtsgericht Lübeck",
      `Vertreten durch den Geschäftsführer:\n${BETREIBER.vertreten}`,
    ],
  },
  { titel: "Kontakt", absaetze: [`E-Mail: ${BETREIBER.mail}\nWeb: ${BETREIBER.web}`] },
  { titel: "Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG", absaetze: ["DE450967067"] },
  { titel: "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV", absaetze: [`${BETREIBER.vertreten}\nAm Rosengarten 11\n23701 Eutin`] },
  {
    titel: "Verbraucherstreitbeilegung / Universalschlichtungsstelle",
    absaetze: ["Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen."],
  },
  {
    titel: "Haftung für Inhalte",
    absaetze: [
      "Als Diensteanbieter sind wir für eigene Inhalte in dieser App nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen entfernen wir diese Inhalte umgehend.",
    ],
  },
  {
    titel: "Haftung für Links",
    absaetze: [
      // Ab „ohne konkrete Anhaltspunkte“ war der Auftrag abgeschnitten: üblicher Wortlaut ergänzt (Frage an Felix)
      "Diese App enthält Links zu externen Websites Dritter (z. B. Veranstaltungen bei „Was los?“), auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft; rechtswidrige Inhalte waren nicht erkennbar. Eine permanente inhaltliche Kontrolle ist ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen entfernen wir derartige Links umgehend.",
    ],
  },
];

export const NUTZUNGSBEDINGUNGEN: Abschnitt[] = [
  { titel: "Kostenlos", absaetze: [`${APP_NAME} ist kostenlos. Der Spendentopf ist freiwillig, Zahlungen laufen nie über die App.`] },
  { titel: "Eine KI hilft mit", absaetze: [`${APP_NAME} ist eine KI. Antworten und Vorschläge können Fehler enthalten. Bitte prüfe Wichtiges selbst, besonders Termine, Allergien und Gesundheitsfragen. Wir übernehmen keine Gewähr für KI-Antworten.`] },
  { titel: "Veranstaltungen („Was los?“)", absaetze: ["Veranstaltungsangaben: Kreis Ostholstein, ohne Gewähr. Ob eine Veranstaltung stattfindet, steht verbindlich nur beim Veranstalter."] },
  { titel: "Faire Nutzung", absaetze: ["Bitte nutze die App nur für deinen Alltag und den deiner Familie. Für die KI gilt ein Tageslimit. Missbrauch (zum Beispiel automatisierte Anfragen) kann zur Sperre führen."] },
  { titel: "Familie und Einladungen", absaetze: ["Wer eine Familie anlegt oder einlädt, entscheidet, wer dazugehört. Erwachsene können einladen, Einladungen zurückziehen und die Familie verlassen. Was ihr unter „Familie“ teilt, sehen alle Mitglieder; „Ich“ und „Arbeit“ nur du."] },
  { titel: "Kündigen und löschen", absaetze: ["Du kannst jederzeit aufhören: Konto löschen in den Einstellungen unter „Daten & App“. Ohne Konto löschst du alles, indem du die App bzw. die Website-Daten im Browser entfernst."] },
  { titel: "Änderungen", absaetze: ["Ändern sich diese Bedingungen wesentlich, fragen wir dich in der App einmal neu."] },
];
