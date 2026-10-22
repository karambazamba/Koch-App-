"use client";

// Verbunden: Haushalt mit Mitgliedern, „Jemanden einladen“ (nur Erwachsene;
// Code 7 Tage gültig, Teilen-Menü), „Abmelden“ mit der Frage, ob die Daten
// auf dem Handy bleiben sollen (zwei Knöpfe).

import { useState } from "react";
import { Copy, LogOut, Share2, UserPlus } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { CARD, CARD_LIST, NOTE, buttonClass, chipClass } from "@/components/ui/styles";
import { showToast } from "@/lib/core/toast";
import { inviteShareText, type HouseholdInfo, type Role } from "@/lib/konten/model";
import { createInvite, signOut } from "@/lib/konten/account";

export function InviteSheet({ onClose }: { onClose: () => void }) {
  const [role, setRole] = useState<Role>("erwachsener");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const make = async () => {
    setBusy(true);
    setError("");
    const r = await createInvite(role);
    setBusy(false);
    if (r.ok) setCode(r.value);
    else setError(r.error);
  };
  const share = async () => {
    if (!code) return;
    const text = inviteShareText(code.replace("-", ""), window.location.origin);
    try {
      if (navigator.share) return await navigator.share({ text });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
    }
    await navigator.clipboard?.writeText(text).catch(() => {});
    showToast({ text: "Kopiert – jetzt einfach in eine Nachricht einfügen.", small: true, seconds: 3 });
  };
  return (
    <Sheet title="Jemanden einladen" onClose={onClose}>
      {!code ? (
        <div className="mb-2 flex flex-col gap-3">
          <p className="text-[15px]">Wer kommt dazu?</p>
          <div className="flex gap-2" role="group" aria-label="Für wen">
            <button type="button" aria-pressed={role === "erwachsener"} onClick={() => setRole("erwachsener")} className={chipClass(role === "erwachsener")}>
              Erwachsene
            </button>
            <button type="button" aria-pressed={role === "kind"} onClick={() => setRole("kind")} className={chipClass(role === "kind")}>
              Kind
            </button>
          </div>
          {error && <p className={NOTE}>{error}</p>}
          <button type="button" onClick={() => void make()} disabled={busy} className={`${buttonClass("primary")} w-full disabled:opacity-50`}>
            {busy ? "Einen Moment …" : "Code erstellen"}
          </button>
        </div>
      ) : (
        <div className="mb-2 flex flex-col items-center gap-3 text-center">
          <p className="text-[15px] text-muted">Code für {role === "kind" ? "ein Kind" : "eine erwachsene Person"} – 7 Tage gültig, einmal nutzbar</p>
          <p className="select-all text-[40px] font-extrabold tracking-[0.15em]" data-testid="einladungs-code">
            {code}
          </p>
          <button type="button" onClick={() => void share()} className={`${buttonClass("primary")} w-full`}>
            <Share2 className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            Teilen
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(code).catch(() => {});
              showToast({ text: "Code kopiert", small: true, seconds: 2 });
            }}
            className="hit inline-flex h-11 items-center gap-2 text-sm font-semibold text-accent-strong"
          >
            <Copy className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Nur den Code kopieren
          </button>
        </div>
      )}
    </Sheet>
  );
}

function SignOutSheet({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const out = async (keep: boolean) => {
    await signOut(keep);
    onClose();
    onDone();
  };
  return (
    <Sheet title="Abmelden?" onClose={onClose}>
      <p className="mb-3 text-[15px]">Sollen die Daten auf diesem Handy bleiben?</p>
      <div className="mb-2 flex flex-col gap-2">
        <button type="button" onClick={() => void out(true)} className={`${buttonClass("primary")} w-full`}>
          Auf dem Handy behalten
        </button>
        <button type="button" onClick={() => void out(false)} className={`${buttonClass("secondary")} w-full`}>
          Vom Handy löschen
        </button>
      </div>
    </Sheet>
  );
}

export function HouseholdCard({ household, email, onSignedOut }: { household: HouseholdInfo; email: string; onSignedOut: () => void }) {
  const [inviting, setInviting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const adult = household.me.role === "erwachsener";
  return (
    <div className="flex flex-col gap-4">
      <section className={`${CARD} flex flex-col gap-1 p-4`} aria-label="Haushalt">
        <p className="text-sm font-semibold text-muted">Verbunden</p>
        <p className="text-[22px] font-extrabold leading-tight">{household.name || "Unser Haushalt"}</p>
        <p className="text-sm text-muted">Angemeldet als {email}</p>
      </section>
      <ul className={CARD_LIST} aria-label="Wer dazugehört">
        {household.members.map((m) => (
          <li key={m.userId} className="flex min-h-14 items-center gap-3 px-4 py-2">
            <PersonAvatar name={m.displayName || "?"} size={32} soft />
            <span className="min-w-0 flex-1 truncate text-base font-semibold">
              {m.displayName || "Ohne Namen"}
              {m.userId === household.me.userId && <span className="font-normal text-muted"> (du)</span>}
            </span>
            {m.role === "kind" && <span className="text-sm text-muted">Kind</span>}
          </li>
        ))}
      </ul>
      {adult && (
        <button type="button" onClick={() => setInviting(true)} className={`${buttonClass("primary")} w-full`}>
          <UserPlus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          Jemanden einladen
        </button>
      )}
      <button type="button" onClick={() => setLeaving(true)} className="hit inline-flex h-11 items-center gap-2 self-center text-sm font-semibold text-muted">
        <LogOut className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        Abmelden
      </button>
      {inviting && <InviteSheet onClose={() => setInviting(false)} />}
      {leaving && <SignOutSheet onClose={() => setLeaving(false)} onDone={onSignedOut} />}
    </div>
  );
}
