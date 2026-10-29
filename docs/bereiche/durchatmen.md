# Durchatmen

## Feste Regeln (A-051, Tafel 138/139, v0.161.0)

- **Angebot, nie Pflicht.** Kein Zähler, keine Serie, keine Statistik, kein
  Lob-Feuerwerk, keine Gesundheitsversprechen, keine Diagnosen. Ende nur
  „Gut gemacht.“ + Satz passend zur Dauer („Zwei Minuten nur für dich.“),
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
- Lolas Ansagen entstehen EINMAL auf dem Server (`/api/durchatmen/ansagen-erzeugen`,
  Admin-Geheimnis), ElevenLabs bekommt nur die festen Sätze, keine Nutzerdaten.
  Ablage im öffentlichen Supabase-Bucket `durchatmen-ansagen` (ohne
  Personenbezug). Schlüssel nur in Vercel, nie im Client oder Log.

## Wo im Code

- `src/lib/durchatmen/`
  - `uebungen.ts` – Typen, Sorten, Texte (`dauerText`, `listenZeile`, `endeSatz`, `restText`, `sortiert`).
  - `ansagen.ts` – Ansagen, Manifest der erzeugten Dateien (`liesAudioListe`), `stimmeWeg` (Datei oder Handy-Stimme).
  - `ansagenServer.ts` – nur Server: `ansagenErzeugen` (ElevenLabs → Bucket, nur Fehlendes), `ansageDatei`.
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
  - `AnsagenErzeugen.tsx` – Knopf auf „Für Entwickler“.

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

Übung antippen startet sofort; das Vollbild zeigt immer der Host (auch wenn
das Fenster selbst gerendert wurde).

## So verhält es sich

- **Fenster:** Kopf „Durchatmen“ / „Kurz raus, wieder bei dir. Ganz ohne
  Muss.“, grüne Karte „Passt gerade“ + „Los“, Sorten-Chips, alle 12 mit
  Symbol, Titel, „Dauer · Kurz“, Herz (Lieblinge oben).
- **Vollbild** (`z-[55]`, über Leiste und Mia): ✕, Titel, Herz, darunter
  „Stimme + Klang · Nur Klang · Still“. Atmen auf Mint (Wort der Phase,
  Sekunde, Kästchen mit wanderndem Punkt bzw. atmender Kreis, „Folge dem
  Punkt.“, Balken, „Noch 1:12“, „Mia zählt mit“ / „Pause“). Handy-Pause
  dunkel mit Ring und Auge. Körper/Ankommen/Augen: großer Schritt-Text.
- **Handy weglegen:** nach 3 s dunkel (Handy-Pause sofort): schwacher
  Atem-Kreis, Ansage-Zeile „„Aus …““, „Antippen zum Hellmachen“, ✕ und Pause
  schwach. Antippen = 5 s hell. Wake Lock (`core/wakeLock`), ohne Wake Lock
  einfach weiter. `prefers-reduced-motion`: kein Wandern, kein Wachsen, nur
  Überblenden.
- **Stimme:** über den einen Weg `speak` (`begleitung/speech.ts`): erzeugte
  Datei über denselben freigeschalteten Abspieler (`ansageAbspielen`,
  leiser, `DATEI_LAUT`), sonst die Stimme des Handys mit Tempo × 0,85 und
  Lautstärke 0,7. Nie ElevenLabs live. Atem-Wörter in den ersten zwei Runden,
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
- **Ansagen erzeugen (einmal, Felix):** Einstellungen → Daten & App → Für
  Entwickler → Prüfstand-Geheimnis eintippen (das aus Vercel, nicht der
  ElevenLabs-Schlüssel) → „Ansagen erzeugen“. Der Server
  (`/api/durchatmen/ansagen-erzeugen`, `lib/durchatmen/ansagenServer.ts`)
  holt mit `ELEVENLABS_API_KEY` und `MIA_VOICE_ID` (stability 0,8, speed 0,85)
  jede Ansage aus `content/durchatmen/ansagen.json`, legt sie als
  `<id>-<hash>.mp3` (Hash aus Text, Stimme, Modell, Einstellung) in den
  Bucket `durchatmen-ansagen` und schreibt `manifest.json`. Nochmal tippen
  erzeugt nur Fehlendes oder Geändertes (keine Kosten). Alternativ
  `MIA_URL=… PRUEFSTAND_SECRET=… npm run ansagen` (ruft nur die Route).
- **Bucket:** Migration `20261105120000_durchatmen_ansagen.sql` (öffentlich
  lesen, schreiben nur der Server), geprüft in `tests/datenbank/sicherheit.test.sql`.
- **Laden und offline:** Die App holt `/audio/durchatmen/manifest.json` und
  die Dateien über die eigene Adresse (Weiterleitung auf den Bucket in
  `next.config.ts`, nur mit Supabase). `public/sw.js` merkt sich Manifest und
  Dateien; fehlt etwas, still 404 und die Handy-Stimme spricht.

## Daten

- `wasgibts.durchatmen` v1 (Gerät, in der Sicherung): `art`, `lieblinge`,
  `angebot`, `stummHinweis`, `angebote { tag, anlaesse }` (höchstens 2).

## Tests

- `tests/durchatmen/uebungen.test.ts` – alle 12 laufen in simulierter Zeit
  durch, grobe Uhr, Pause, Ansagen, Handy-Stimme ohne Dateien.
- `tests/durchatmen/ansagenServer.test.ts` – ElevenLabs nachgestellt: einmal alle, danach nichts, Hash, Fehler, aus ohne Schlüssel, Zugang.
- `tests/durchatmen/durchatmen.test.ts` – Vorschlag, Lieblinge öfter, Art
  gemerkt, Angebot ≤ 2×/Tag und nie nachts, nie Push, Eine Sache ganz oben,
  Kopf leeren ohne KI, Mia-Sätze, Baustein.
- Prüfstand: 5 Sätze im großen Prüfstand, 12 im Sofort-Weg.
- Durchklick `durchatmen` (`e2e/ablaeufe/durchatmen.mjs`).
