"use client";

// Einstellungen → Wetter-Ort: Stadt eintippen (Standard Eutin) oder – nur nach
// Erlaubnis – "Meinen Standort verwenden" (gespeichert wird nur die Stadt).

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { INPUT, LABEL, buttonClass } from "@/components/ui/styles";
import { placeFromLocation, refreshForecast, savePlace, usePlace } from "@/lib/wetter/client";

export function WeatherPlaceForm() {
  const place = usePlace();
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const value = draft ?? place;
  const save = async (city: string) => {
    const clean = city.trim();
    if (!clean) return;
    savePlace(clean);
    setDraft(null);
    setStatus("Gespeichert ✓");
    const fc = await refreshForecast(clean, true);
    setStatus(fc ? `Gespeichert ✓ Wetter für ${fc.place}` : "Gespeichert ✓ – die Wetterdaten kommen, sobald Netz da ist.");
  };
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save(value);
      }}
    >
      <label className="flex flex-col gap-2">
        <span className={LABEL}>Für welchen Ort soll ich das Wetter zeigen?</span>
        <input value={value} onChange={(e) => setDraft(e.target.value)} placeholder="z. B. Eutin" aria-label="Stadt" enterKeyHint="done" className={INPUT} />
      </label>
      <button type="submit" disabled={!value.trim() || value.trim() === place} className={buttonClass("primary")}>
        Übernehmen
      </button>
      <button
        type="button"
        onClick={async () => {
          setStatus("Ich frag kurz nach deinem Standort …");
          const city = await placeFromLocation();
          if (city) await save(city);
          else setStatus("Das hat nicht geklappt – tipp die Stadt einfach ein.");
        }}
        className={buttonClass("secondary")}
      >
        <LocateFixed className="h-5 w-5" strokeWidth={2} aria-hidden />
        Meinen Standort verwenden
      </button>
      {status && (
        <p className="text-sm text-muted" role="status">
          {status}
        </p>
      )}
      <p className="text-sm text-muted">Gespeichert wird nur die Stadt. Daten: Deutscher Wetterdienst (über Bright Sky, notfalls Open-Meteo).</p>
    </form>
  );
}
