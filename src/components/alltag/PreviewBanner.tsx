"use client";

// Hinweis oben, solange die Zeit-Vorschau läuft: "Vorschau: 18:20 · beenden".

import { previewLabel, setPreview, usePreview } from "@/lib/tagesablauf/settings";

export function PreviewBanner() {
  const preview = usePreview();
  if (!preview) return null;
  return (
    <div className="flex items-center gap-2 rounded-card bg-phase-feierabend px-4 py-2 text-sm font-semibold text-phase-feierabend-ink" role="status" aria-label="Zeit-Vorschau">
      <span className="flex-1">Vorschau: {previewLabel(preview)}</span>
      <button type="button" onClick={() => setPreview(null)} className="-my-2 h-11 font-bold underline">
        beenden
      </button>
    </div>
  );
}
