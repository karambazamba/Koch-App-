# Mia – Familienplaner

Mia ist die Assistentin für den Familienalltag: Termine, Aufgaben, Essen und
Einkauf – man erzählt ihr einfach, was ansteht. PWA (installierbar auf dem
Homescreen), Next.js + Tailwind CSS. „Was gibt’s?“ heißt nur noch der
Essen-Bereich. Der App-Name steht an einer Stelle: `APP_NAME` in
`src/lib/core/app.ts`.

Die folgenden Abschnitte stammen aus der ersten Etappe (damals „Was gibt’s?“).

**Etappe 1:** Grundgerüst, PWA (Manifest, Icons, offline-fähig), Startseite mit
Wochenplan, „Was ist noch da?“ (Vorrat per Sprache oder Text, Treffer aus dem Kochbuch), Einkaufsliste, Kochbuch und Onboarding „Haushaltsprofil“.
Das Profil wird vorerst lokal im Browser gespeichert (`localStorage`).

## Lokal starten

Voraussetzung: [Node.js](https://nodejs.org) 20 oder neuer.

```bash
npm install
npm run dev
```

Dann <http://localhost:3000> öffnen. Für eine mobile Ansicht im Desktop-Browser
die Entwicklertools öffnen (F12) und die Geräteansicht einschalten.

> Der Service Worker (Offline-Modus) ist nur im Produktions-Build aktiv:
> `npm run build && npm start`

## Auf dem Handy testen

**Schnell im WLAN (ohne Installation/Offline):**

1. Handy und Rechner im selben WLAN.
2. `npm run dev:lan` starten.
3. IP-Adresse des Rechners herausfinden (Windows: `ipconfig`, macOS: `ipconfig getifaddr en0`, Linux: `hostname -I`).
4. Am Handy `http://<IP-Adresse>:3000` öffnen, z. B. `http://192.168.178.23:3000`.

**Als App installieren und offline testen:** Browser erlauben Service Worker nur
über HTTPS. Am einfachsten über einen Tunnel:

```bash
npm run build && npm start
# in einem zweiten Terminal:
npx cloudflared tunnel --url http://localhost:3000
```

Die angezeigte `https://….trycloudflare.com`-Adresse am Handy öffnen, dann:

- **iPhone (Safari):** Teilen-Symbol → „Zum Home-Bildschirm“
- **Android (Chrome):** Menü ⋮ → „App installieren“ / „Zum Startbildschirm hinzufügen“

Alternativ das Repo mit [Vercel](https://vercel.com) verbinden – das gibt eine
dauerhafte HTTPS-Adresse.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `src/app/page.tsx` | Startseite mit den drei Bereichen |
| `src/app/profil/` | Haushaltsprofil: Assistent beim ersten Anlegen, danach Übersicht „Unsere Familie“ mit Einzel-Bearbeitung |
| `src/app/schnellkueche` | „Was ist noch da?“: Vorrat per Spracheingabe/Text, Kochbuch-Treffer (`src/lib/essen/pantry.ts`) |
| `src/app/einkaufsliste` | Einkaufsliste aus dem Wochenplan (`src/lib/einkauf/shoppingList.ts`) |
| `src/app/manifest.ts` | Web-App-Manifest |
| `public/sw.js` | Service Worker (Offline-Cache) |
| `public/icons/` | App-Icons, erzeugt mit `npm run icons` (`scripts/generate-icons.mjs`) |
| `src/app/wochenplan/` | Wochenplan: Gerichte pro Tag und Mahlzeit (diese/nächste Woche) |
| `src/lib/essen/mealPlan.ts` | Datenmodell Wochenplan, `buildWeek()` |
| `src/app/woche/check/` | Wochen-Check: Vorgaben für eine Woche (Standard: ab nächstem Montag, `?woche=`) |
| `src/app/kochbuch/` | Unser Kochbuch: Übersicht, Rezept, Rezept bearbeiten |
| `src/lib/essen/cookbook.ts` | Datenmodell Rezepte (auch für spätere KI-Rezepte) |
| `src/lib/einstellungen/profile.ts` | Datenmodell Haushaltsprofil |
| `src/lib/essen/weekPlan.ts` | Datenmodell Wochen-Vorgaben (pro Woche, Schlüssel = Montag) |
| `src/lib/core/localStore.ts` | Lokale Speicherung (localStorage) – später hier auf Supabase umstellen |
| `src/app/api/kuechenhelfer/` | Küchenhelfer-API (Claude, serverseitig) |
| `src/lib/lotte/` | Küchenhelfer: Änderungen (`ops.ts`), Werkzeuge, Prompt, Mock, Vorschau |
| `src/components/assistant/` | Küchenhelfer-Knopf, Panel, Vorschau |

## Küchenhelfer (KI) einrichten

Der Küchenhelfer (runder Knopf unten rechts) plant per Sprache oder Text mit
Claude. Die KI ändert nichts direkt: Sie schlägt Änderungen vor, die App zeigt
eine Vorschau (pro Tag vorher → nachher), erst „Übernehmen“ speichert – mit
„Rückgängig“ für 10 Sekunden.

Umgebungsvariablen (in Vercel unter *Settings → Environment Variables*):

| Variable | Bedeutung |
| --- | --- |
| `ANTHROPIC_API_KEY` | API-Schlüssel von Anthropic. Ohne ihn zeigt der Küchenhelfer „KI noch nicht eingerichtet“. |
| `KUECHENHELFER_MODEL` | Optional, Standard `claude-sonnet-5-5`. |
| `KUECHENHELFER_MOCK` | `1` = Testmodus mit Beispielantworten (ohne Schlüssel, ohne Kosten). |

Lokal testen ohne Schlüssel:

```bash
npm run build
KUECHENHELFER_MOCK=1 npm start
```

Grenzen: höchstens 6 Fragen pro Minute, 40 pro Stunde und 150 pro Tag je Gerät
(pro IP das Dreifache), `max_tokens` 8000 je Antwort, höchstens 8 Werkzeug-Runden.
