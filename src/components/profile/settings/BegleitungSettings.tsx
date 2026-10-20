"use client";

// Einstellungen ganz oben: DEINE BEGLEITUNG (Name mit Gesicht, Assistentin/
// Assistent, Stimme, Icon-Farbe, Vorlesen) und DARSTELLUNG (Automatisch ·
// Hell · Dunkel). Wirkt sofort; die Farb-Seite liegt unter /profil/farbe.

import { Palette, Speaker, Volume2 } from "lucide-react";
import { LotteAvatar } from "@/components/LotteAvatar";
import { ArtChoice, ColorDots } from "@/components/begleitung/BegleitungPicker";
import { IconBadge } from "@/components/ui/IconBadge";
import { ListRow } from "@/components/ui/ListRow";
import { useState } from "react";
import { CARD, NOTE } from "@/components/ui/styles";
import { iconFor } from "@/lib/core/app";
import { iconChangeHint } from "@/lib/core/homescreen";
import { APP_THEMES, AVATAR_COLORS, avatarHex, helperTitle, helperWith, saveProfile, type AvatarColor, type HelperArt, type HouseholdProfile } from "@/lib/einstellungen/profile";
import { saveSpeechSettings, useSpeechSettings, useVoices } from "@/lib/lotte/speech";
import { Group, SettingsPage, SwitchRow } from "./SettingsParts";

/** Art wechseln: Anrede und Stimme passen sich an (eine fest gewählte Stimme wird auf "passend" zurückgesetzt) */
export function changeArt(profile: HouseholdProfile, art: HelperArt) {
  if (profile.helper.art === art) return;
  saveProfile({ ...profile, helper: helperWith(profile.helper, { art }) });
  saveSpeechSettings({ voice: "" });
}

export function BegleitungGroup({ profile }: { profile: HouseholdProfile }) {
  const speech = useSpeechSettings();
  const voices = useVoices();
  const h = profile.helper;
  const voiceName = speech.voice ? (voices.find((v) => v.voiceURI === speech.voice)?.name.replace(/\s*\(.*\)$/, "") ?? "Eigene") : "Passend";
  const color = AVATAR_COLORS.find((c) => c.id === h.farbe);
  return (
    <div className="flex flex-col gap-2">
      <Group title="Deine Begleitung">
        <li>
          <ListRow href="/profil/kuechenhelfer" leading={<LotteAvatar size={40} />} title="Name" subtitle={helperTitle(profile)} value={h.name} />
        </li>
        <li className="flex min-h-16 items-center gap-3 px-4 py-3">
          <IconBadge icon={Speaker} />
          <span className="flex-1 text-base font-bold">Ist</span>
          <div className="w-52">
            <ArtChoice value={h.art} onChange={(art) => changeArt(profile, art)} />
          </div>
        </li>
        <li>
          <ListRow href="/profil/vorlesen" icon={Volume2} title="Stimme" subtitle="Wie ich beim Vorlesen klinge" value={voiceName} />
        </li>
        <li>
          <ListRow
            href="/profil/farbe"
            icon={Palette}
            title="Farbe"
            subtitle="Mein Gesicht und das App-Icon"
            value={
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 rounded-full border border-ink/20" style={{ background: avatarHex(h.farbe) }} aria-hidden />
                {color?.label}
              </span>
            }
          />
        </li>
        <SwitchRow icon={Volume2} title="Vorlesen" hint="Antworten laut vorlesen, wenn du per Mikrofon fragst" checked={speech.mode !== "aus"} onChange={(on) => saveSpeechSettings({ mode: on ? "auto" : "aus" })} />
      </Group>
      <p className="px-1 text-sm text-muted">Oder einfach sagen: „Ich nenn dich ab jetzt Frieda.“</p>
    </div>
  );
}

export function DarstellungGroup({ profile }: { profile: HouseholdProfile }) {
  return (
    <section className="flex flex-col gap-2" aria-label="Darstellung">
      <h2 className="px-1 text-xs font-bold uppercase tracking-wider text-ink">Darstellung</h2>
      <div className={`${CARD} flex gap-1 p-1.5`} role="radiogroup" aria-label="Hell oder dunkel">
        {APP_THEMES.map((t) => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={profile.theme === t.value}
            onClick={() => saveProfile({ ...profile, theme: t.value })}
            className={`h-11 flex-1 rounded-xl text-[15px] font-bold transition ${profile.theme === t.value ? "bg-accent text-on-accent" : "text-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </section>
  );
}

/** Farbe wählen: Gesicht und App-Icon in derselben Farbe; nach einem Wechsel (iPhone-Homescreen-App) der Hinweis zum Icon */
function FarbeChoice({ profile, onPick }: { profile: HouseholdProfile; onPick: (farbe: AvatarColor) => void }) {
  const [hint, setHint] = useState<string | null>(null);
  return (
    <>
      <div className={`${CARD} flex flex-col items-center gap-4 p-5`}>
        <div className="flex items-end gap-4">
          <LotteAvatar size={96} />
          {/* eslint-disable-next-line @next/next/no-img-element -- statisches App-Icon in der gewählten Farbe */}
          <img src={iconFor(profile.helper.farbe, "icon.svg")} alt="App-Icon" width={56} height={56} className="rounded-[22%] shadow-card" />
        </div>
        <ColorDots
          value={profile.helper.farbe}
          onChange={(farbe) => {
            onPick(farbe);
            setHint(iconChangeHint());
          }}
        />
      </div>
      {hint && (
        <p className={NOTE} role="status">
          {hint}
        </p>
      )}
      <p className="px-1 text-sm text-muted">Mein Gesicht und das App-Icon bekommen die Farbe – alle anderen App-Farben bleiben gleich.</p>
    </>
  );
}

/** /profil/farbe: Lieblingsfarbe für Begleitung und App-Icon (10 Farben, 2 Reihen à 5) */
export function FarbeView() {
  return (
    <SettingsPage title="Farbe" question="Welche Farbe soll ich haben?">
      {(profile, set) => <FarbeChoice profile={profile} onPick={(farbe) => set({ helper: helperWith(profile.helper, { farbe }) })} />}
    </SettingsPage>
  );
}
