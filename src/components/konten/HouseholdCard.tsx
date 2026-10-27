"use client";

// Verbunden: Familie mit Mitgliedern, „Familie einladen“ (nur Erwachsene;
// Link 14 Tage gültig, mehrfach nutzbar, Teilen-Menü), offene Einladungen mit
// „Zurückziehen“, „Abmelden“ mit der Frage, ob die Daten auf dem Handy
// bleiben sollen (zwei Knöpfe).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, LogOut, Share2, UserPlus } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { CARD, CARD_LIST, INPUT, NOTE, buttonClass, chipClass } from "@/components/ui/styles";
import { showToast } from "@/lib/core/toast";
import { inviteLinkShareText, inviteLinkUrl, tokenFromLink, type HouseholdInfo, type InviteLink, type Role } from "@/lib/konten/model";
import { createInviteLink, listInviteLinks, revokeInviteLink, signOut } from "@/lib/konten/account";
import { useEinladenKnopf, useHaushalt } from "@/lib/einstellungen/useHaushalt";
import { zuZweitVorschlag } from "@/lib/core/haushalt";
import { markHintSeen, useHintSeen } from "@/lib/core/hints";
import { loadProfile, saveProfile } from "@/lib/einstellungen/profileStore";

export function InviteSheet({ onClose }: { onClose: () => void }) {
  const einladen = useEinladenKnopf();
  const [role, setRole] = useState<Role>("erwachsener");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const make = async () => {
    setBusy(true);
    setError("");
    const r = await createInviteLink(role);
    setBusy(false);
    if (r.ok) setToken(r.value);
    else setError(r.error);
  };
  const share = async () => {
    if (!token) return;
    const text = inviteLinkShareText(window.location.origin, token);
    try {
      if (navigator.share) return await navigator.share({ text });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
    }
    await navigator.clipboard?.writeText(text).catch(() => {});
    showToast({ text: "Kopiert – jetzt einfach in eine Nachricht einfügen.", small: true, seconds: 3 });
  };
  return (
    <Sheet title={einladen} onClose={onClose}>
      {!token ? (
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
            {busy ? "Einen Moment …" : "Einladungs-Link erstellen"}
          </button>
        </div>
      ) : (
        <div className="mb-2 flex flex-col items-center gap-3 text-center">
          <p className="text-[15px] text-muted">Link für {role === "kind" ? "ein Kind" : "Erwachsene"} – 14 Tage gültig, für alle aus der Familie</p>
          <p className="select-all break-all rounded-field bg-fill px-3 py-2 text-sm" data-testid="einladungs-link">
            {inviteLinkUrl(window.location.origin, token)}
          </p>
          <button type="button" onClick={() => void share()} className={`${buttonClass("primary")} w-full`}>
            <Share2 className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            Teilen
          </button>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(inviteLinkUrl(window.location.origin, token)).catch(() => {});
              showToast({ text: "Link kopiert", small: true, seconds: 2 });
            }}
            className="hit inline-flex h-11 items-center gap-2 text-sm font-semibold text-accent-strong"
          >
            <Copy className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Nur den Link kopieren
          </button>
        </div>
      )}
    </Sheet>
  );
}

/** Eure Einladungen mit „Zurückziehen“ (nur Erwachsene sehen sie) */
function OpenInvites({ refresh }: { refresh: number }) {
  const [links, setLinks] = useState<InviteLink[] | null>(null);
  const [again, setAgain] = useState(0);
  useEffect(() => {
    let live = true;
    void listInviteLinks().then((r) => live && setLinks(r.ok ? r.value : []));
    return () => {
      live = false;
    };
  }, [refresh, again]);
  if (!links?.length) return null;
  return (
    <section className="flex flex-col gap-1.5" aria-label="Eure Einladungen">
      <h2 className="px-1 text-[15px] font-extrabold text-muted">Eure Einladungen</h2>
      <ul className={CARD_LIST}>
        {links.map((l) => (
          <li key={l.ref} className="flex min-h-12 items-center gap-3 px-4 py-2">
            <span className="min-w-0 flex-1 text-[15px]">
              {l.role === "kind" ? "Für ein Kind" : "Für Erwachsene"}
              <span className="block text-sm text-muted">bis {new Date(l.expiresAt).toLocaleDateString("de-DE", { day: "numeric", month: "numeric" })}</span>
            </span>
            <button type="button" onClick={() => void revokeInviteLink(l.ref).then(() => setAgain((n) => n + 1))} className="hit text-sm font-semibold text-accent-strong">
              Zurückziehen
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Notfall ohne Link zum Antippen: Einladungs-Link einfügen → Einladungsseite */
function InvitedSheet({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const token = tokenFromLink(text);
  return (
    <Sheet title="Ich wurde eingeladen" onClose={onClose}>
      <form
        className="mb-2 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (token) router.push(`/e/${token}`);
        }}
      >
        <p className="text-[15px]">Füg den Einladungs-Link hier ein.</p>
        <input value={text} onChange={(e) => setText(e.target.value)} inputMode="url" placeholder="https://…/e/…" aria-label="Einladungs-Link" className={INPUT} />
        <button type="submit" disabled={!token} className={`${buttonClass("primary")} w-full disabled:opacity-50`}>
          Weiter
        </button>
      </form>
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

/** Aus „allein“ werden zwei: einmal fragen, ob der Bereich „Wir“ heißen soll */
function ZuZweitKarte({ members }: { members: number }) {
  const haushalt = useHaushalt();
  const seen = useHintSeen("zu-zweit");
  const text = seen === false ? zuZweitVorschlag(haushalt, members, false) : null;
  if (!text) return null;
  const done = (paar: boolean) => {
    const profile = loadProfile();
    if (paar && profile) saveProfile({ ...profile, householdType: "paar" });
    markHintSeen("zu-zweit");
  };
  return (
    <section className={`${CARD} flex flex-col gap-3 p-4`} role="note" aria-label="Zu zweit?" data-zu-zweit>
      <p className="text-[15px] font-bold leading-snug">{text}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => done(true)} className={buttonClass("primary", "sm")}>
          Ja, wir sind zu zweit
        </button>
        <button type="button" onClick={() => done(false)} className={`${buttonClass("ghost", "sm")} text-muted`}>
          Passt so
        </button>
      </div>
    </section>
  );
}

export function HouseholdCard({ household, email, onSignedOut }: { household: HouseholdInfo; email: string; onSignedOut: () => void }) {
  const einladen = useEinladenKnopf();
  const [inviting, setInviting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [invited, setInvited] = useState(false);
  const adult = household.me.role === "erwachsener";
  return (
    <div className="flex flex-col gap-4">
      <section className={`${CARD} flex flex-col gap-1 p-4`} aria-label="Familie">
        <p className="text-sm font-semibold text-muted">Verbunden</p>
        <p className="text-[22px] font-extrabold leading-tight">{household.name || "Unsere Familie"}</p>
        <p className="text-sm text-muted">Angemeldet als {email}</p>
      </section>
      <ZuZweitKarte members={household.members.length} />
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
          {einladen}
        </button>
      )}
      {adult && <OpenInvites refresh={inviting ? 0 : 1} />}
      <button type="button" onClick={() => setInvited(true)} className="hit h-11 self-center text-sm font-semibold text-muted underline">
        Ich wurde eingeladen
      </button>
      <button type="button" onClick={() => setLeaving(true)} className="hit inline-flex h-11 items-center gap-2 self-center text-sm font-semibold text-muted">
        <LogOut className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        Abmelden
      </button>
      {inviting && <InviteSheet onClose={() => setInviting(false)} />}
      {leaving && <SignOutSheet onClose={() => setLeaving(false)} onDone={onSignedOut} />}
      {invited && <InvitedSheet onClose={() => setInvited(false)} />}
    </div>
  );
}
