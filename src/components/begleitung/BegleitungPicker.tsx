"use client";

// Wer soll dir helfen? Zwei große Karten (Mia – deine Assistentin, Orange;
// Theo – dein Assistent, Nachtblau) mit "▶ Stimme", darunter "✎ Oder gib mir
// einen eigenen Namen …" mit Textfeld, Assistentin/Assistent (Anrede und
// Stimme) und Icon-Farbe. Für das Kennenlernen und die Einstellungen.

import { useState } from "react";
import { Check, PenLine, Play } from "lucide-react";
import { LotteAvatar } from "@/components/LotteAvatar";
import { INPUT } from "@/components/ui/styles";
import { showToast } from "@/lib/core/toast";
import { AVATAR_COLORS, HELPER_NAME_MAX, STANDARD_HELPERS, avatarHex, helperWith, type AvatarColor, type HelperArt, type HelperSettings } from "@/lib/einstellungen/profile";
import { previewHelperVoice, VOICE_HINT } from "@/lib/lotte/speech";

const isStandard = (h: HelperSettings) => STANDARD_HELPERS.some((s) => s.name === h.name && s.art === h.art);

const artTitle = (art: HelperArt) => (art === "assistent" ? "dein Assistent" : "deine Assistentin");

/** "▶ Stimme" – mit einmaligem Hinweis, falls keine passende Stimme installiert ist */
function playVoice(h: Pick<HelperSettings, "name" | "voice">) {
  if (previewHelperVoice(h.name, h.voice)) showToast({ text: VOICE_HINT, seconds: 9 });
}

export function BegleitungPicker({ value, onChange }: { value: HelperSettings; onChange: (h: HelperSettings) => void }) {
  const [custom, setCustom] = useState(!isStandard(value));
  const [draft, setDraft] = useState(isStandard(value) ? "" : value.name);
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Begleitung">
        {STANDARD_HELPERS.map((h) => {
          const chosen = !custom && value.name === h.name;
          return (
            <div key={h.name} className={`relative flex flex-col items-center gap-2 rounded-card border-2 bg-surface px-3 pb-3 pt-4 text-center shadow-card transition ${chosen ? "border-accent" : "border-line"}`}>
              <button
                type="button"
                role="radio"
                aria-checked={chosen}
                aria-label={`${h.name} – ${artTitle(h.art)}`}
                onClick={() => {
                  setCustom(false);
                  onChange(h);
                }}
                className="flex w-full flex-col items-center gap-1.5"
              >
                <LotteAvatar size={72} color={avatarHex(h.farbe)} zustand="ruhig" />
                <span className="text-[22px] font-extrabold leading-tight">{h.name}</span>
                <span className="text-sm text-muted">{artTitle(h.art)}</span>
              </button>
              <button type="button" onClick={() => playVoice(h)} className="flex h-10 items-center gap-1.5 rounded-full bg-segment px-3.5 text-sm font-bold active:scale-95" aria-label={`Stimme von ${h.name} anhören`}>
                <Play className="h-3.5 w-3.5 fill-current" strokeWidth={2.5} aria-hidden />
                Stimme
              </button>
              {chosen && (
                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-on-accent" aria-hidden>
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!custom ? (
        <button
          type="button"
          onClick={() => {
            setCustom(true);
            if (draft.trim()) onChange(helperWith(value, { name: draft }));
          }}
          className="flex h-12 items-center justify-center gap-2 rounded-card border border-dashed border-line text-[15px] font-semibold text-muted active:bg-fill"
        >
          <PenLine className="h-4 w-4" strokeWidth={2} aria-hidden />
          Oder gib mir einen eigenen Namen …
        </button>
      ) : (
        <section className="flex flex-col gap-3 rounded-card border-2 border-accent bg-surface p-4 shadow-card" aria-label="Eigener Name">
          <div className="flex items-center gap-3">
            <LotteAvatar size={44} color={avatarHex(value.farbe)} zustand="ruhig" />
            <input
              type="text"
              value={draft}
              maxLength={HELPER_NAME_MAX}
              onChange={(e) => {
                setDraft(e.target.value);
                if (e.target.value.trim()) onChange(helperWith(value, { name: e.target.value }));
              }}
              placeholder="z. B. Frieda"
              autoComplete="off"
              enterKeyHint="done"
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              aria-label="Eigener Name"
              className={INPUT}
              autoFocus
            />
          </div>
          <ArtChoice value={value.art} onChange={(art) => onChange(helperWith(value, { art, ...(draft.trim() ? { name: draft } : {}) }))} />
          <ColorDots value={value.farbe} onChange={(farbe) => onChange(helperWith(value, { farbe, ...(draft.trim() ? { name: draft } : {}) }))} />
          <button
            type="button"
            onClick={() => {
              setCustom(false);
              onChange(STANDARD_HELPERS[value.art === "assistent" ? 1 : 0]);
            }}
            className="self-start text-sm font-semibold text-muted underline"
          >
            Doch Mia oder Theo
          </button>
        </section>
      )}
    </div>
  );
}

/** Assistentin / Assistent (Anrede und Stimme) */
function ArtChoice({ value, onChange }: { value: HelperArt; onChange: (art: HelperArt) => void }) {
  return (
    <div className="flex gap-1 rounded-card bg-segment p-1" role="radiogroup" aria-label="Assistentin oder Assistent">
      {(["assistentin", "assistent"] as HelperArt[]).map((art) => (
        <button
          key={art}
          type="button"
          role="radio"
          aria-checked={value === art}
          onClick={() => onChange(art)}
          className={`hit h-10 flex-1 rounded-field text-[15px] font-bold transition ${value === art ? "bg-surface text-ink shadow-card" : "text-muted"}`}
        >
          {art === "assistentin" ? "Assistentin" : "Assistent"}
        </button>
      ))}
    </div>
  );
}

/** 10 runde Farbtupfer (2 Reihen à 5), aktiver mit Ring */
export function ColorDots({ value, onChange }: { value: AvatarColor; onChange: (c: AvatarColor) => void }) {
  return (
    <div className="grid grid-cols-5 justify-items-center gap-y-2" role="radiogroup" aria-label="Icon-Farbe">
      {AVATAR_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={value === c.id}
          aria-label={c.label}
          title={c.label}
          onClick={() => onChange(c.id)}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-95 ${value === c.id ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""}`}
        >
          <span className="h-9 w-9 rounded-full border border-ink/20" style={{ background: c.hex }} />
        </button>
      ))}
    </div>
  );
}
