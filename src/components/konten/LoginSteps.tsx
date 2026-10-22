"use client";

// Anmelden per E-Mail-Code: E-Mail → 6-stelliger Code (Ziffernfeld,
// autocomplete="one-time-code", sendet bei 6 Ziffern selbst) → fertig.
// „Code neu senden“ nach 60 s. Fehler als freundlicher Satz.

import { useEffect, useRef, useState } from "react";
import { Mail } from "lucide-react";
import { INPUT, LABEL, NOTE, buttonClass } from "@/components/ui/styles";
import { isEmail, otpDigits } from "@/lib/konten/model";
import { sendLoginCode, verifyLoginCode } from "@/lib/konten/account";

const RESEND_S = 60;

export function LoginSteps({ onDone }: { onDone?: () => void }) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  const send = async () => {
    if (!isEmail(email)) return setError("Diese E-Mail-Adresse sieht nicht ganz richtig aus.");
    setBusy(true);
    setError("");
    const r = await sendLoginCode(email.trim());
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setStep("code");
    setCode("");
    setWait(RESEND_S);
    window.setTimeout(() => codeRef.current?.focus(), 50);
  };

  const verify = async (value: string) => {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError("");
    const r = await verifyLoginCode(email.trim(), value);
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      setCode("");
      return;
    }
    onDone?.();
  };

  if (step === "email")
    return (
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Deine E-Mail-Adresse</span>
          <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@beispiel.de" className={INPUT} />
        </label>
        {error && <p className={NOTE}>{error}</p>}
        <button type="submit" disabled={busy || !email.trim()} className={`${buttonClass("primary")} w-full disabled:opacity-50`}>
          <Mail className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          {busy ? "Schicke …" : "Code schicken"}
        </button>
        <p className="text-sm text-muted">Du bekommst einen 6-stelligen Code per Mail – kein Passwort nötig.</p>
      </form>
    );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px]">
        Ich hab dir einen Code an <b>{email.trim()}</b> geschickt.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>Code aus der Mail</span>
        <input
          ref={codeRef}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={7}
          value={code}
          onChange={(e) => {
            const v = otpDigits(e.target.value);
            setCode(v);
            if (v.length === 6) void verify(v);
          }}
          placeholder="123456"
          aria-label="6-stelliger Code"
          className={`${INPUT} text-center text-[24px] font-bold tracking-[0.4em]`}
        />
      </label>
      {error && <p className={NOTE}>{error}</p>}
      <button type="button" onClick={() => void verify(code)} disabled={busy || code.length !== 6} className={`${buttonClass("primary")} w-full disabled:opacity-50`}>
        {busy ? "Prüfe …" : "Anmelden"}
      </button>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => (setStep("email"), setError(""))} className="hit h-11 text-sm font-semibold text-muted underline">
          Andere E-Mail
        </button>
        <button type="button" onClick={() => void send()} disabled={wait > 0 || busy} className="hit h-11 text-sm font-semibold text-accent-strong disabled:text-muted">
          {wait > 0 ? `Code neu senden (${wait} s)` : "Code neu senden"}
        </button>
      </div>
      <p className="text-sm text-muted">Nichts angekommen? Schau auch im Spam-Ordner nach.</p>
    </div>
  );
}
