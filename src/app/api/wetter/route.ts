// Wetter für die Kachel und für Lotte: GET ?ort=Eutin → Vorhersage (Open-Meteo,
// 30 Min zwischengespeichert), GET ?lat=…&lon=… → { ort } (nur der Stadtname).
// Ohne Schlüssel; gegen Dauerfeuer ein einfaches Limit pro IP.

import { clientIp } from "@/lib/begleitung/guard";
import { allowRequest } from "@/lib/begleitung/rateLimit";
import { fetchForecast, placeFromCoords, weatherMock } from "@/lib/wetter/server";

export const maxDuration = 15;

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!weatherMock() && !allowRequest(`wetter:${clientIp(request)}`, 3)) return Response.json({ error: "limit" }, { status: 429 });
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (url.searchParams.has("lat")) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return Response.json({ error: "fehler" }, { status: 400 });
    try {
      const ort = await placeFromCoords(lat, lon);
      return ort ? Response.json({ ort }) : Response.json({ error: "unbekannt" }, { status: 404 });
    } catch {
      return Response.json({ error: "offline" }, { status: 502 });
    }
  }
  const place = (url.searchParams.get("ort") ?? "Eutin").trim().slice(0, 60);
  if (!place || /[<>{}]/.test(place)) return Response.json({ error: "fehler" }, { status: 400 });
  try {
    const data = await fetchForecast(place, url.searchParams.get("szenario") ?? undefined, url.searchParams.get("heute") ?? undefined);
    if (!data) return Response.json({ error: "unbekannt" }, { status: 404 });
    return Response.json(data, { headers: { "Cache-Control": "public, max-age=600" } });
  } catch {
    return Response.json({ error: "offline" }, { status: 502 });
  }
}
