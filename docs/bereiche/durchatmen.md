# Durchatmen

## Feste Regeln (A-051 v0.159.0, A-061 (v0.164.0), Tafel 138/139/146)

- **Erst erklären, dann dunkel (A-061, Tafel 146):** Jede Übung startet mit
  einem hellen Start-Bildschirm (Symbol, „AUGEN · 1 MIN“, Titel, weiße Karte
  mit 3 nummerierten Schritten, „Wofür?“ fett + grauer Satz, Stimme + Klang /
  Nur Klang / Still, breiter Knopf „Los“, oben ✕ und Herz). Erst nach „Los“
  läuft sie, nach 3 s wird es dunkel (auch bei der Handy-Pause).
- **Keine Roboterstimme (A-061):** Ansagen nur mit Mias Stimme (ElevenLabs,
  Stimme „Lola“ = `MIA_VOICE_ID`). Nie die Stimme des Handys; fehlt eine
  Datei, gibt es nur Klang. In der App heißt sie immer „Mia“, nie „Lola“.

- **Angebot, nie Pflicht.** Kein Zähler, keine Serie, keine Statistik, kein
  Lob-Feuerwerk, keine Gesundheitsversprechen, keine Diagnosen. Ende nur
  „Gut gemacht.“ + Satz je Übung (`ende`, z. B. „Eine Minute nur für deine Augen.“),
  Knöpfe „Noch eine“ / „Fertig“.
- Baustein `durchatmen` (`core/features.ts`), **Standard an** (auch nach dem
  Update einmal an, Bausteine v7) – von Felix gewollte Ausnahme vom
  Launch-Stopp. Selbst abschaltbar (Einstellungen → Durchatmen bzw. „Mehr
  Funktionen“), Lieblinge bleiben.
- 12 feste Übungen in `content/durchatmen/uebungen.json`, Ansagen in
  `content/durchatmen/ansagen.json` (höchstens 6 je Übung, keine
  Zahlen-Zählerei). Wiederholen sich bewusst.
- Leises Angebot „Kurz durchatmen?“ in der Jetzt-Karte: höchstens 2× am Tag,
  nie vor 7 und ab 21 Uhr, nie als Mitteilung, abschaltbar.
- Nichts wird aufgenommen. Gespeichert (pro Gerät): Art der Anleitung,
  Lieblinge, Schalter „Leises Angebot“, Stumm-Hinweis gezeigt, Anlässe der
  heutigen Angebote.
- Mias Ansagen entstehen von selbst auf dem Server: beim ersten Abruf einer
  fehlenden Ansage einmal (`/audio/durchatmen/<id>.mp3`) und nachts per
  Vercel Cron für alle fehlenden. Kein Knopf, kein Anstoßen. ElevenLabs
  bekommt nur die festen Sätze aus `ansagen.json` (Auswahl über ID, nie
  freier Text), keine Nutzerdaten. Ablage im öffentlichen Supabase-Bucket
  `durchatmen-ansagen` (ohne Personenbezug). Schlüssel nur in Vercel, nie im
  Client oder Log. Fehler bleiben für Nutzer still, Hinweis unter „Für
  Entwickler“.

## Wo im Code

- `src/lib/durchatmen/`
  - `uebungen.ts` – Typen (mit `vorher` = 3 Schritte, `wofuer`, `ende`), Sorten, Texte (`dauerText`, `listenZeile`, `startZeile`, `wennUm`, `restText`, `sortiert`).
  - `ansagen.ts` – Ansagen, Adresse je Ansage (`ansageUrl` mit Text-Hash), `ansageIdAus` (nur IDs aus der Datei), Manifest (`liesAudioListe`).
  - `ansagenServer.ts` – nur Server: `ansageSicherstellen` (liefert aus dem Bucket bzw. erzeugt einmal, eine Erzeugung je Datei gleichzeitig), `ansagenErzeugen` (alle, Cron), `ansagenStand`, `ansageDatei`.
  - `ablauf.ts` – rein: `standBei`, `ereignisse`, `Lauf` (Uhr eingespeist, Pause/Weiter).
  - `vorschlag.ts` – `vorschlag(now, lieblinge)` (morgens Fokus, nachmittags Augen, abends Atmen; Lieblinge öfter, fest je Tag und 90-Minuten-Abschnitt), `kreisText(u)` → `["1 Min", "Handy-Pause"]`.
  - `angebot.ts` – rein: `durchatmenAngebot(lage)` → Anlass | null, `durchatmenThema(anlass, heute, detail)` → fertiges Thema.
  - `erkennen.ts` – `durchatmenAusSatz`, `durchatmenBefehl` (Sofort-Weg), `durchatmenBefehlText`.
  - `fokus.ts` – `eineSacheEintrag` (Aufgabe heute, dringend = ganz oben, Raum geraten), `kopfLeerenOhneKi`.
  - `store.ts` – `wasgibts.durchatmen` v1.
  - `oeffnen.ts` – `oeffneDurchatmen()`, `starteDurchatmen(id | "vorschlag")`, `beendeDurchatmen()`, `onDurchatmenStart`, `useDurchatmenZustand`.
  - `anleitung.ts`, `klang.ts`, `uhr.ts` – Browser: Stimme über `speak`, Web Audio, Stoppuhr.
- `src/components/durchatmen/`
  - `DurchatmenHost.tsx` – im KitchenHelper (Layout), lädt Fenster und Vollbild erst bei Bedarf.
  - `DurchatmenFenster.tsx` – das Fenster (ui/Sheet), dazu `SorteSymbol`, `losMit(id)`.
  - `UebungVollbild.tsx`, `AtemAnimation.tsx`, `useUebungLauf.ts` – Vollbild.
  - `FokusGespraech.tsx`, `kopfLeeren.ts` – „Eine Sache“, „Kopf leeren“.
  - `DurchatmenEinstellungen.tsx` – `/profil/durchatmen`.
  - `AnsagenStand.tsx` – Hinweis auf „Für Entwickler“ (wie viele Ansagen da sind, ob die Stimme eingerichtet ist).

### Für den Kreis auf der Startseite (A-050)

```tsx
import { DurchatmenFenster } from "@/components/durchatmen/DurchatmenFenster";
// <DurchatmenFenster onClose={() => setOffen(false)} />   (eigener Zustand)
import { oeffneDurchatmen } from "@/lib/durchatmen/oeffnen";
// oder: oeffneDurchatmen()  – der Host im Layout zeigt das Fenster
import { kreisText, vorschlag } from "@/lib/durchatmen/vorschlag";
import { useDurchatmen } from "@/lib/durchatmen/store";
// const [zeile1, zeile2] = kreisText(vorschlag(now(), useDurchatmen()?.lieblinge ?? []));
```

Übung antippen öffnet ihren Start-Bildschirm (erst „Los“ startet sie); das
Vollbild zeigt immer der Host (auch wenn das Fenster selbst gerendert wurde).

## So verhält es sich

- **Fenster:** Kopf „Durchatmen“ / „Kurz raus, wieder bei dir. Ganz ohne
  Muss.“, grüne Karte „Passt gerade“ + „Los“, Sorten-Chips, alle 12 mit
  Symbol, Titel, „Dauer · Kurz“, Herz (Lieblinge oben).
- **Vollbild** (`z-[55]`, über Leiste und Mia): ✕, Titel, Herz, darunter
  „Stimme + Klang · Nur Klang · Still“. Atmen auf Mint (Wort der Phase,
  Sekunde, Kästchen mit wanderndem Punkt bzw. atmender Kreis, „Folge dem
  Punkt.“, Balken, „Noch 1:12“, „Mia zählt mit“ / „Pause“). Handy-Pause
  dunkel mit Ring und Auge. Körper/Ankommen/Augen: großer Schritt-Text.
- **Start-Bildschirm** (A-061): siehe Feste Regeln; holt die Ansagen der
  Übung schon vorab (`ansagenVorholen`), „Los“ schaltet im Tipp Ton und
  Stimme frei.
- **Handy weglegen:** nach „Los“ und 3 s dunkel: Ring mit Symbol und
  Restzeit, darunter die aktuelle Anweisung groß (26 px, fett, weich
  überblendet), klein „Mia sagt dir, wenn die Minute um ist.“ (bei Nur
  Klang/Still „Ein Gong …“), ✕ und Pause schwach, „Antippen zum Hellmachen“. Antippen = 5 s hell. Wake Lock (`core/wakeLock`), ohne Wake Lock
  einfach weiter. `prefers-reduced-motion`: kein Wandern, kein Wachsen, nur
  Überblenden.
- **Stimme:** über den einen Weg `speak` (`begleitung/speech.ts`) mit
  `datei` und `ersatz: false`: Mias Datei über denselben freigeschalteten
  Abspieler (`ansageAbspielen`, leiser, `DATEI_LAUT`); kommt sie nicht,
  keine Sprache (nur Klang). Nie die Stimme des Handys, nie ElevenLabs live
  im Gerät. Atem-Wörter in den ersten zwei Runden,
  mit „Mia zählt mit“ immer; Start „Leg das Handy weg. Ich sag dir, wann.“,
  Ende „Gut gemacht.“.
- **Klang** (Web Audio, leise): Sinus steigt beim Einatmen, fällt beim
  Ausatmen, leises Klingen beim Wechsel, tiefer Gong am Ende. AudioContext
  entsteht im Tipp („Los“, Zeile). Vibration im Takt, wo es geht.
- **Stumm-Schalter:** im Web nicht erkennbar – „Für Ton bitte
  Stumm-Schalter aus.“ einmal je Gerät, beim ersten Start mit Ton.
- **Eine Sache:** „Was ist jetzt das Wichtigste? Nur eine Sache.“ → Antwort
  → Aufgabe heute, dringend (= ganz oben), Raum geraten, über
  `changeEntries` → Karte „Steht oben“ → „Gut. Jetzt eine Minute nur atmen,
  dann los.“ → Atem-Kreis 1 Min.
- **Kopf leeren:** alles raus → KI zuerst (`[Kopf leeren] …`, nur kleine,
  sichere Änderungen, Ergebnis-Karten mit „Rückgängig“), sonst Regel-Weg
  (Sofort-Weg je Gedanke, der Rest als EINE Notiz „Aus dem Kopf“) → eine
  Minute Ruhe.
- **Mia:** „Ich brauch kurz Ruhe“, „Atemübung“, „Handy-Pause“, „Kopf
  leeren“, „Was ist jetzt wichtig?“ → `app_befehl` mit dem Satz bzw.
  Sofort-Weg (eindeutige Kurzbefehle, keine Fragen) → `runInstantOps`
  startet die Übung, die Bühne geht zu. Ohne KI: `useChatRules`.
- **Ansagen entstehen von selbst (A-061):** Die App ruft
  `/audio/durchatmen/<id>.mp3?t=<Text-Hash>` ab (Weiterleitung in
  `next.config.ts` auf `/api/durchatmen/ansage/[datei]`). Die Route nimmt nur
  IDs aus `content/durchatmen/ansagen.json`, liefert die Datei
  `<id>-<hash>.mp3` (Hash aus Text, Stimme, Modell, Einstellung) aus dem
  Bucket oder erzeugt sie einmal mit `ELEVENLABS_API_KEY` und `MIA_VOICE_ID`
  (stability 0,8, speed 0,85), legt sie ab und liefert sie aus. Die Kosten
  sind damit auf einmal je Satz begrenzt, deshalb ohne Zugangscode (auch
  Nutzer ohne Code hören Mia). Nachts (Vercel Cron 2:10 UTC,
  `GET /api/durchatmen/ansagen-erzeugen` mit `CRON_SECRET`) werden alle
  fehlenden vorab erzeugt und `manifest.json` geschrieben. Für Felix gibt es
  nichts zu tun, außer dass in Vercel `ELEVENLABS_API_KEY`, `MIA_VOICE_ID`
  und Supabase gesetzt sind; „Für Entwickler“ zeigt, wie viele schon da sind
  (`/api/durchatmen/ansagen-stand`, nur Zahlen).
- **Bucket:** Migration `20261105120000_durchatmen_ansagen.sql` (öffentlich
  lesen, schreiben nur der Server), geprüft in `tests/datenbank/sicherheit.test.sql`.
- **Offline:** `public/sw.js` merkt sich jede abgespielte Ansage
  (`/audio/durchatmen/…`, Cache zuerst); fehlt etwas, still 404 und es gibt
  nur Klang.

## Daten

- `wasgibts.durchatmen` v1 (Gerät, in der Sicherung): `art`, `lieblinge`,
  `angebot`, `stummHinweis`, `angebote { tag, anlaesse }` (höchstens 2).

## Tests

- `tests/durchatmen/uebungen.test.ts` – alle 12 laufen in simulierter Zeit
  durch, grobe Uhr, Pause, Ansagen, Adresse mit Hash, alle 12 mit 3 Schritten
  und „Wofür?“ vor dem Start, große Anweisung im Dunkeln.
- `tests/durchatmen/anleitung.test.ts` – nur Mias Stimme (`ersatz: false`), ohne Datei keine Sprache, Nur Klang/Still nie Sprache.
- `tests/durchatmen/ansagenServer.test.ts` – ElevenLabs nachgestellt: erste Anfrage erzeugt, zweite liefert aus dem Speicher, nur IDs aus der Datei, ein Erzeugen gleichzeitig, Fehler still, Stand, Cron, kein Knopf.
- `tests/durchatmen/durchatmen.test.ts` – Vorschlag, Lieblinge öfter, Art
  gemerkt, Angebot ≤ 2×/Tag und nie nachts, nie Push, Eine Sache ganz oben,
  Kopf leeren ohne KI, Mia-Sätze, Baustein.
- Prüfstand: 5 Sätze im großen Prüfstand, 12 im Sofort-Weg.
- Durchklick `durchatmen` (`e2e/ablaeufe/durchatmen.mjs`).
