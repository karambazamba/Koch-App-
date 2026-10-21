"use client";

// Mail-Entwurf im Chat: Betreff, Text in Absätzen, darunter "In Mail öffnen"
// (mailto – Gmail bzw. Standard-Mail-App), "Kopieren" und "Ändern". Gesendet
// wird nie automatisch.

import { useState } from "react";
import { Copy, Mail, PenLine } from "lucide-react";
import { buttonClass, chipClass } from "@/components/ui/styles";
import { draftText, mailtoHref, type MailDraft } from "@/lib/lotte/mail";

/** In die Zwischenablage – mit Ausweg für ältere Browser */
async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function MailCard({ draft, onRevise, active }: { draft: MailDraft; onRevise: (wish: string) => void; active: boolean }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const paragraphs = draft.body.split(/\n\s*\n/).filter((p) => p.trim());
  const wishes = ["Kürzer", "Etwas förmlicher", draft.tone === "sie" ? "Auf Du" : "Auf Sie", "Lockerer"];
  return (
    <section className="flex w-full max-w-[92%] flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card" aria-label="Mail-Entwurf">
      <div className="flex flex-col gap-0.5">
        <p className="flex items-center gap-1.5 text-sm font-bold text-muted">
          <Mail className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          Entwurf{draft.to ? ` an ${draft.to}` : draft.recipient ? ` an ${draft.recipient}` : ""}
        </p>
        {draft.subject && <p className="text-base font-bold leading-snug">{draft.subject}</p>}
      </div>
      <div className="flex flex-col gap-2.5 text-[15px] leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={mailtoHref(draft)} className={buttonClass("primary", "sm")}>
          <Mail className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          In Mail öffnen
        </a>
        <button
          type="button"
          onClick={async () => {
            if (await copy(draftText(draft))) {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }
          }}
          className={buttonClass("secondary", "sm")}
          aria-live="polite"
        >
          {!copied && <Copy className="h-4 w-4" strokeWidth={2.25} aria-hidden />}
          {copied ? "Kopiert ✓" : "Kopieren"}
        </button>
        {active && (
          <button type="button" onClick={() => setEditing((e) => !e)} aria-expanded={editing} className={buttonClass("ghost", "sm")}>
            <PenLine className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Ändern
          </button>
        )}
      </div>
      {active && editing && (
        <div className="flex flex-wrap gap-2" aria-label="Wie ändern?">
          {wishes.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => {
                setEditing(false);
                onRevise(w);
              }}
              className={chipClass(false)}
            >
              {w}
            </button>
          ))}
          <p className="w-full text-sm text-muted">Oder sag mir einfach, was anders sein soll.</p>
        </div>
      )}
    </section>
  );
}
