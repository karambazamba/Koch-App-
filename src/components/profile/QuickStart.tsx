"use client";

// Schnellstart (Neustart): statt Kennenlernen-Gespräch nur das Nötigste –
// dein Name und wer noch dazugehört. Alles andere erzählt man Lotte später
// oder stellt es in den Einstellungen ein. Das ausführliche Kennenlernen
// bleibt hinter "Alte Funktionen anzeigen (Test)".

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { CARD, INPUT, LABEL, buttonClass, chipClass } from "@/components/ui/styles";
import { createEmptyProfile, createPerson, deriveHouseholdType, saveProfile, type Person } from "@/lib/einstellungen/profile";

type Member = { id: string; name: string; kid: boolean };

export function QuickStart() {
  const router = useRouter();
  const [me, setMe] = useState("");
  const [others, setOthers] = useState<Member[]>([]);
  const [draft, setDraft] = useState("");

  const add = () => {
    const names = draft.split(/,|\bund\b/).map((n) => n.trim()).filter(Boolean);
    if (!names.length) return;
    setOthers((o) => [...o, ...names.map((name) => ({ id: `${Date.now()}-${name}`, name, kid: false }))]);
    setDraft("");
  };

  const start = () => {
    const person = (role: Person["role"], name: string): Person => ({ ...createPerson(role), name: name.trim() });
    const persons = [person("erwachsen", me), ...others.map((m) => person(m.kid ? "kind" : "erwachsen", m.name))];
    const adults = persons.filter((p) => p.role === "erwachsen").length;
    const kids = persons.length - adults;
    saveProfile({ ...createEmptyProfile(), persons, adults, kids, householdType: deriveHouseholdType(adults, kids) });
    router.push("/");
  };

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 pb-10 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <AppLogo />
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">Schön, dass du da bist!</h1>
        <p className="text-base text-muted">Zwei kurze Fragen, dann kann es losgehen.</p>
      </div>

      <section className={`${CARD} flex flex-col gap-4 p-4`}>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Wie heißt du?</span>
          <input value={me} onChange={(e) => setMe(e.target.value)} className={INPUT} autoComplete="given-name" placeholder="z. B. Felix" />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className={LABEL}>Wer gehört noch dazu? (optional)</span>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <input value={draft} onChange={(e) => setDraft(e.target.value)} className={INPUT} placeholder="z. B. Lisa, Mathis" aria-label="Weitere Person" />
            <button type="submit" aria-label="Hinzufügen" className={`${buttonClass("soft")} shrink-0`}>
              <Plus className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            </button>
          </form>
          {others.length > 0 && (
            <ul className="mt-1 flex flex-col gap-2" aria-label="Familie">
              {others.map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-base font-semibold">{m.name}</span>
                  <button type="button" onClick={() => setOthers((o) => o.map((x) => (x.id === m.id ? { ...x, kid: false } : x)))} className={chipClass(!m.kid)} aria-pressed={!m.kid}>
                    Erwachsen
                  </button>
                  <button type="button" onClick={() => setOthers((o) => o.map((x) => (x.id === m.id ? { ...x, kid: true } : x)))} className={chipClass(m.kid)} aria-pressed={m.kid}>
                    Kind
                  </button>
                  <button type="button" onClick={() => setOthers((o) => o.filter((x) => x.id !== m.id))} aria-label={`${m.name} entfernen`} className="flex h-10 w-10 items-center justify-center text-muted">
                    <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <button type="button" onClick={start} disabled={!me.trim()} className={`${buttonClass("primary", "lg")} w-full disabled:opacity-40`}>
        Los geht&apos;s
      </button>
      <p className="text-center text-sm text-muted">Alles lässt sich später ändern – oder sag es einfach Lotte.</p>
    </main>
  );
}
