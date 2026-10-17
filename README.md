# Was gibt's? 🍲

Koch-App für Familien als PWA (installierbar auf dem Homescreen) – Next.js + Tailwind CSS.

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
| `src/app/schnellkueche` | „Was ist noch da?“: Vorrat per Spracheingabe/Text, Kochbuch-Treffer (`src/lib/pantry.ts`) |
| `src/app/einkaufsliste` | Einkaufsliste aus dem Wochenplan (`src/lib/shoppingList.ts`) |
| `src/app/manifest.ts` | Web-App-Manifest |
| `public/sw.js` | Service Worker (Offline-Cache) |
| `public/icons/` | App-Icons (Platzhalter, Quelle: `icon.svg`) |
| `src/app/wochenplan/` | Wochenplan: Gerichte pro Tag und Mahlzeit (diese/nächste Woche) |
| `src/lib/mealPlan.ts` | Datenmodell Wochenplan, `buildWeek()` |
| `src/app/woche/check/` | Wochen-Check: Vorgaben für eine Woche (Standard: ab nächstem Montag, `?woche=`) |
| `src/app/kochbuch/` | Unser Kochbuch: Übersicht, Rezept, Rezept bearbeiten |
| `src/lib/cookbook.ts` | Datenmodell Rezepte (auch für spätere KI-Rezepte) |
| `src/lib/profile.ts` | Datenmodell Haushaltsprofil |
| `src/lib/weekPlan.ts` | Datenmodell Wochen-Vorgaben (pro Woche, Schlüssel = Montag) |
| `src/lib/localStore.ts` | Lokale Speicherung (localStorage) – später hier auf Supabase umstellen |
