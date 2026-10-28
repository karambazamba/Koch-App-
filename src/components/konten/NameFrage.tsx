"use client";

// Nur ohne Namen im Profil, einmal beim Anlegen bzw. Beitreten (A-042):
// „Wie sollen dich die anderen sehen?“ – ein Feld, vorausgefüllt aus dem Teil
// vor dem @ (ohne Punkte und Zahlen, großgeschrieben). Die Antwort landet auch
// im Profil, damit nie zweimal gefragt wird.

import { useState } from "react";
import { INPUT, buttonClass } from "@/components/ui/styles";
import { nameInsProfil } from "@/lib/konten/account";
import { nameAusMail, personName } from "@/lib/konten/namen";

export const NAME_FRAGE = "Wie sollen dich die anderen sehen?";

export function NameFrage({ email, onDone, gross = false }: { email: string; onDone: (name: string) => void; gross?: boolean }) {
  const [name, setName] = useState(() => nameAusMail(email));
  const clean = personName(name);
  return (
    <form
      className="flex w-full flex-col gap-3"
      aria-label={NAME_FRAGE}
      onSubmit={(e) => {
        e.preventDefault();
        if (!clean) return;
        nameInsProfil(clean);
        onDone(clean);
      }}
    >
      {!gross && <h2 className="text-[17px] font-extrabold">{NAME_FRAGE}</h2>}
      <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" enterKeyHint="done" maxLength={40} aria-label="Dein Name" className={gross ? `${INPUT} h-14 text-center text-[17px]` : INPUT} />
      <button type="submit" disabled={!clean} className={`${buttonClass("primary", gross ? "lg" : undefined)} w-full disabled:opacity-50`}>
        Weiter
      </button>
    </form>
  );
}
