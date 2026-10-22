"use client";

import { X } from "lucide-react";
import { CARD, INPUT, INPUT_BASE, LABEL, chipClass } from "@/components/ui/styles";
import { closingFor, DEFAULT_MAIL_STYLE } from "@/lib/begleitung/mail";
import { saveMailStyle, useMailStyle } from "@/lib/begleitung/mailSettings";
import { SettingsPage } from "@/components/einstellungen/settings/SettingsParts";

const GREETINGS = ["Viele Grüße", "Liebe Grüße", "Beste Grüße", "Mit freundlichen Grüßen"];

/** /profil/mails: Grußformel, Signatur (nur förmlich), gemerkte Anrede je Empfänger – pro Gerät */
export function MailSettingsView() {
  const style = useMailStyle();
  return (
    <SettingsPage title="Mails" question="Wie unterschreibe ich deine Mails?">
      {(profile) => {
        if (!style) return <div className={`${CARD} h-40 animate-pulse`} />;
        const me = profile.persons[0]?.name ?? "";
        const tones = Object.entries(style.tones);
        return (
          <>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Grußformel</span>
              <input value={style.greeting} maxLength={60} onChange={(e) => saveMailStyle({ ...style, greeting: e.target.value })} onBlur={() => !style.greeting.trim() && saveMailStyle({ ...style, greeting: DEFAULT_MAIL_STYLE.greeting })} className={INPUT} />
            </label>
            <div className="flex flex-wrap gap-2" aria-label="Vorschläge">
              {GREETINGS.map((g) => (
                <button key={g} type="button" onClick={() => saveMailStyle({ ...style, greeting: g })} className={chipClass(style.greeting === g)}>
                  {g}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Signatur (nur bei förmlichen Mails)</span>
              <textarea
                value={style.signature}
                maxLength={300}
                rows={3}
                onChange={(e) => saveMailStyle({ ...style, signature: e.target.value })}
                placeholder="z. B. Eiscafé am Markt · 0123 45678"
                className={`${INPUT_BASE} w-full resize-none px-4 py-3`}
              />
            </label>
            <div className={`${CARD} flex flex-col gap-1 p-4`}>
              <p className="text-sm font-bold text-muted">So endet eine Mail</p>
              <p className="whitespace-pre-line text-[15px]">{closingFor(style, me, "du")}</p>
              {style.signature.trim() && (
                <>
                  <p className="mt-2 text-sm font-bold text-muted">Förmlich</p>
                  <p className="whitespace-pre-line text-[15px]">{closingFor(style, me, "sie")}</p>
                </>
              )}
            </div>
            {tones.length > 0 && (
              <>
                <p className="mt-2 px-1 text-lg font-bold">Gemerkte Anrede</p>
                <ul className={`${CARD} divide-y divide-line overflow-hidden`} aria-label="Gemerkte Anrede">
                  {tones.map(([who, tone]) => (
                    <li key={who} className="flex min-h-14 items-center gap-2 pl-4 pr-1">
                      <span className="min-w-0 flex-1 truncate text-base">{who}</span>
                      <span className="text-sm font-semibold text-accent-strong">{tone === "sie" ? "Sie" : "Du"}</span>
                      <button
                        type="button"
                        aria-label={`${who} vergessen`}
                        onClick={() => saveMailStyle({ ...style, tones: Object.fromEntries(tones.filter(([k]) => k !== who)) })}
                        className="flex h-11 w-11 items-center justify-center rounded-full text-muted active:bg-fill"
                      >
                        <X className="h-5 w-5" strokeWidth={2} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="px-1 text-sm text-muted">Eingefügte Mails merke ich mir nicht – nur Gruß, Signatur und ob du jemanden duzt oder siezt.</p>
          </>
        );
      }}
    </SettingsPage>
  );
}
