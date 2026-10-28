"use client";

// Anmelden wie man es kennt (Tafel 22) – ruhige Seiten im Stil des
// Hallo-Bildschirms, Zurück jederzeit (‹ oben links). EIN Ablauf für alle
// Einstiege:
//   - „Schon ein Konto? Anmelden“: „Willkommen zurück“
//   - Einladungs-Link (/e/…): „<Name> lädt dich ein.“
//   - alter Code-Link (/beitreten?code=…): Code ist schon eingetragen
// Launch „Mia 1.0“: nur E-Mail-Code (`LAUNCH_NUR_EMAIL` in `konten/oauth.ts`)
// – es geht gleich mit der E-Mail los. Die Knöpfe „Mit Apple/Google
// fortfahren“ bleiben im Code für später (nur wenn eingerichtet,
// NEXT_PUBLIC_AUTH_APPLE/…_GOOGLE, und erst ohne Launch-Sperre).
// E-Mail → 6-stelliger Code (prüft selbst, „Neuen Code senden in 0:60“).
// Danach keine Frage: per Einladung beitreten (schon in einer anderen
// Familie: „Wechseln?“), sonst still „Familie <Nachname>“ bzw. „Wir zwei“ /
// „Privat“ anlegen. Ohne Namen im Profil vorher einmal „Wie sollen dich die
// anderen sehen?“ (A-042, nie die Mail als Name). Was schon auf
// dem Handy ist, kommt mit. Startseite; die Begleitung fliegt in die
// Jetzt-Karte. Per Einladung fragt der Zugangscode erst beim ersten
// KI-Versuch (A-027, `codeErstBeimKiVersuch`), nicht gleich danach.

import { BedingungenHaken, useBedingungenOk } from "@/components/datenschutz/BedingungenHaken";
import { RechtLinks } from "@/components/datenschutz/RechtstextView";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Mail } from "lucide-react";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { INPUT, buttonClass } from "@/components/ui/styles";
import { avatarHex } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { startFresh } from "@/lib/einstellungen/welcomeStore";
import { expectReplace } from "@/lib/core/navigation";
import { setHelloFlight } from "@/lib/core/hello";
import { codeErstBeimKiVersuch } from "@/lib/begleitung/codeAbfrage";
import { ensureFamily, joinByLink, joinHousehold, sendLoginCode, startOAuth, useAccount, verifyLoginCode } from "@/lib/konten/account";
import { isEmail, otpDigits } from "@/lib/konten/model";
import { haushaltAnzeige, personName, profilName, standardHaushaltsname } from "@/lib/konten/namen";
import { useHaushalt } from "@/lib/einstellungen/useHaushalt";
import { NAME_FRAGE, NameFrage } from "@/components/konten/NameFrage";
import { oauthProviders } from "@/lib/konten/oauth";
import { AnbieterLogo } from "@/components/konten/AnbieterLogo";

type Step = "knoepfe" | "email" | "code" | "name" | "weiter" | "wechseln";
const RESEND_S = 60;
const BACK: Record<Step, Step | null> = { knoepfe: null, email: "knoepfe", code: "email", name: null, weiter: null, wechseln: null };

export function WelcomeLogin({ code: linkCode = "", einladung = "", inviter = "" }: { code?: string; einladung?: string; inviter?: string }) {
  const router = useRouter();
  const account = useAccount();
  const profile = useProfile();
  const termsOk = useBedingungenOk();
  const color = avatarHex("orange");
  const providers = oauthProviders();
  const [chosen, setChosen] = useState<Step>(providers.length ? "knoepfe" : "email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otherFamily, setOtherFamily] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);
  const face = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const finishing = useRef(false);
  const continuing = useRef(false);
  const askedName = useRef("");

  const signedIn = Boolean(account.user);
  const step: Step = signedIn && chosen !== "wechseln" && chosen !== "name" ? "weiter" : chosen;
  const setStep = (next: Step) => {
    setError("");
    setChosen(next);
  };

  const haushalt = useHaushalt();
  const me = profile?.persons[0];
  // Schon im Haushalt: der Name dort; sonst der aus dem Profil; ohne beides einmal fragen
  const known = profilName(me?.name) || personName(account.household?.me.displayName);
  const familyName = standardHaushaltsname(haushalt, profile);

  // Angemeldet: ohne Frage weiter (Einladung annehmen bzw. Familie anlegen)
  useEffect(() => {
    if (!signedIn || account.mode === "laedt" || continuing.current) return;
    continuing.current = true;
    void proceed(false);
    // nur, wenn der Zustand feststeht
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, account.mode]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  useEffect(() => {
    const t = window.setTimeout(() => field.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [step]);

  const back = () => {
    const to = BACK[step];
    if (to) return setStep(to);
    router.back();
  };

  async function proceed(switchFamily: boolean, asked = "") {
    if (asked) askedName.current = asked;
    const displayName = known || askedName.current;
    // Nur wer neu dazukommt, braucht einen Namen (wer schon drin ist, hat einen)
    if (!displayName && (einladung || !account.household)) return setStep("name");
    setBusy(true);
    setError("");
    if (einladung) {
      const r = await joinByLink(einladung, displayName, me?.id ?? null, switchFamily);
      setBusy(false);
      if (!r.ok) return setError(r.error);
      if ("otherFamily" in r.value) {
        setOtherFamily(r.value.otherFamily);
        return setStep("wechseln");
      }
      return void finish();
    }
    if (linkCode && !account.household) {
      const r = await joinHousehold(linkCode, displayName, me?.id ?? null);
      setBusy(false);
      return r.ok ? void finish() : setError(r.error);
    }
    const r = await ensureFamily(familyName, displayName, me?.id ?? null);
    setBusy(false);
    return r.ok ? void finish() : setError(r.error);
  }

  const run = async (action: () => Promise<{ ok: boolean; error?: string }>, next: () => void) => {
    setBusy(true);
    setError("");
    const r = await action();
    setBusy(false);
    if (r.ok) next();
    else setError(r.error ?? "");
    return r.ok;
  };

  const send = () =>
    isEmail(email)
      ? run(
          () => sendLoginCode(email.trim()),
          () => {
            setOtp("");
            setWait(RESEND_S);
            setStep("code");
          },
        )
      : setError("Diese E-Mail-Adresse sieht nicht ganz richtig aus.");

  const verify = async (value: string) => {
    if (value.length !== 6 || busy) return;
    const ok = await run(() => verifyLoginCode(email.trim(), value), () => {});
    if (!ok) setOtp("");
  };

  /** Fertig: Eigenes mitnehmen, Startseite, Begleitung fliegt in die Jetzt-Karte */
  async function finish() {
    if (finishing.current) return;
    finishing.current = true;
    const hh = (await import("@/lib/konten/cache")).accountCache.load()?.household;
    if (hh) void (await import("@/lib/konten/sync/runner")).startSyncTakingOver(hh.id);
    const r = face.current?.getBoundingClientRect();
    if (!profile) {
      setHelloFlight(r ? { x: r.left, y: r.top, size: r.width } : null);
      startFresh();
    }
    // Einladungs-Weg: Mail-Code → Startseite; der Zugangscode erst beim ersten KI-Versuch
    if (einladung) codeErstBeimKiVersuch();
    expectReplace();
    router.replace("/");
  }

  const title = einladung ? `${personName(inviter) || "Jemand"} lädt dich ein.` : linkCode ? "Schön, dass ihr dabei seid." : "Willkommen zurück";
  const sub = einladung ? "Termine, Einkauf und Pinnwand gemeinsam." : linkCode ? "Melde dich an, der Code ist schon eingetragen." : "Melde dich an wie beim letzten Mal.";

  return (
    <main className="fixed inset-0 z-40 overflow-y-auto bg-background" aria-label="Anmelden">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <button type="button" onClick={back} className="hit -ml-2 inline-flex h-11 items-center gap-1 self-start text-[17px] font-semibold text-accent-strong">
          <ChevronLeft className="h-6 w-6" strokeWidth={2.25} aria-hidden />
          Zurück
        </button>
        <div className="flex flex-1 flex-col items-center pt-6 text-center">
          <div ref={face} className="rounded-full">
            <BegleitungAvatar size={76} color={color} zustand={busy ? "denken" : step === "weiter" ? "freuen" : "ruhig"} groesse="gross" stabil />
          </div>

          {account.mode === "aus" && (
            <Screen title="Hier geht’s erstmal ohne Konto." sub="Konten sind noch nicht eingerichtet. Die App läuft wie gewohnt auf diesem Handy.">
              <span />
            </Screen>
          )}

          {account.mode !== "aus" && step === "knoepfe" && (
            <Screen title={title} sub={sub}>
              <div className="flex w-full flex-col gap-3">
                {providers.map((p) => (
                  <button key={p} type="button" disabled={busy || !termsOk} onClick={() => void run(() => startOAuth(p, window.location.pathname + window.location.search), () => {})} className={`${buttonClass("secondary", "lg")} w-full`}>
                    <AnbieterLogo id={p} />
                    {p === "apple" ? "Mit Apple fortfahren" : "Mit Google fortfahren"}
                  </button>
                ))}
                <button type="button" onClick={() => setStep("email")} className={`${buttonClass("secondary", "lg")} w-full`}>
                  <Mail className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                  Mit E-Mail fortfahren
                </button>
                <ErrorLine text={error} />
                <BedingungenHaken links={false} />
              </div>
            </Screen>
          )}

          {account.mode !== "aus" && step === "email" && (
            <Screen title={title} sub={providers.length ? "Ich schick dir einen Code per Mail." : sub}>
              <form
                className="flex w-full flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
              >
                <input ref={field} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@beispiel.de" aria-label="Deine E-Mail-Adresse" className={`${INPUT} h-14 text-center text-[17px]`} />
                <ErrorLine text={error} />
                <BedingungenHaken links={false} />
                <BigButton color={color} disabled={busy || !email.trim() || !termsOk}>
                  {busy ? "Schicke …" : "Code senden"}
                </BigButton>
                <p className="text-sm text-muted">Kein Passwort nötig. Kostenlos.</p>
              </form>
            </Screen>
          )}

          {step === "code" && (
            <Screen title="Code eingeben">
              <p className="-mt-2 mb-5 text-[15px] text-muted">
                an {email.trim()} ·{" "}
                <button type="button" onClick={() => setStep("email")} className="font-semibold text-accent-strong underline-offset-2 hover:underline">
                  ändern
                </button>
              </p>
              <div className="flex w-full flex-col gap-3">
                <input
                  ref={field}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={7}
                  value={otp}
                  onChange={(e) => {
                    const v = otpDigits(e.target.value);
                    setOtp(v);
                    if (v.length === 6) void verify(v);
                  }}
                  placeholder="······"
                  aria-label="6-stelliger Code"
                  className={`${INPUT} h-16 text-center text-[30px] font-extrabold tracking-[0.45em]`}
                />
                <ErrorLine text={error} />
                {busy && <p className="text-sm text-muted">Einen Moment …</p>}
                <button type="button" onClick={() => void send()} disabled={wait > 0 || busy} className="hit h-11 text-sm font-semibold text-accent-strong disabled:text-muted">
                  {wait > 0 ? `Neuen Code senden in 0:${String(wait).padStart(2, "0")}` : "Neuen Code senden"}
                </button>
                <p className="text-sm text-muted">Nichts angekommen? Schau auch im Spam-Ordner nach.</p>
              </div>
            </Screen>
          )}

          {step === "name" && account.user && (
            <Screen title={NAME_FRAGE}>
              <NameFrage
                email={account.user.email}
                gross
                onDone={(name) => {
                  setStep("weiter");
                  void proceed(false, name);
                }}
              />
            </Screen>
          )}

          {step === "weiter" && (
            <Screen title={einladung ? "Einen Moment …" : "Angemeldet"} sub="Was schon auf diesem Handy ist, nehmen wir mit.">
              <div className="flex w-full flex-col gap-3">
                <ErrorLine text={error} />
                {error && (
                  <button type="button" onClick={() => void proceed(false)} className={`${buttonClass("primary", "lg")} w-full`}>
                    Nochmal
                  </button>
                )}
              </div>
            </Screen>
          )}

          {step === "wechseln" && (
            <Screen title={`Du bist schon in ${haushaltAnzeige(otherFamily, "einer anderen Familie")}.`} sub="Wechseln? Deine Einträge auf diesem Handy bleiben.">
              <div className="flex w-full flex-col gap-3">
                <ErrorLine text={error} />
                <button type="button" disabled={busy} onClick={() => void proceed(true)} className={`${buttonClass("primary", "lg")} w-full`}>
                  Wechseln
                </button>
                <button type="button" disabled={busy} onClick={() => void finish()} className={`${buttonClass("secondary", "lg")} w-full`}>
                  Bleiben
                </button>
              </div>
            </Screen>
          )}
        </div>
        <RechtLinks dicht className="pb-2" />
      </div>
    </main>
  );
}

function Screen({ title, sub, children }: { title: ReactNode; sub?: string; children: ReactNode }) {
  return (
    <section className="mt-6 flex w-full flex-col items-center">
      <h1 className="text-[28px] font-extrabold leading-tight tracking-tight">{title}</h1>
      {sub && <p className="mb-6 mt-1.5 text-[15.5px] font-medium text-muted">{sub}</p>}
      {!sub && <div className="mb-4" />}
      {children}
    </section>
  );
}

function BigButton({ color, disabled, children }: { color: string; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="submit" disabled={disabled} className="h-14 w-full rounded-field text-[17px] font-bold text-on-color active:scale-[0.98] disabled:opacity-50" style={{ backgroundColor: color }}>
      {children}
    </button>
  );
}

/** Fehler als freundlicher Satz – ohne Ton, ohne Rot */
function ErrorLine({ text }: { text: string }) {
  return text ? (
    <p className="text-[15px] text-muted" role="status">
      {text}
    </p>
  ) : null;
}
