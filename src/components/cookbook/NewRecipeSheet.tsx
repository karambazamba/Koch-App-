"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, Link2, Mic, MicOff, PenLine, Square } from "lucide-react";
import { HelperAvatar } from "@/components/assistant/HelperAvatar";
import { Sheet } from "@/components/plan/Sheet";
import { INPUT_BASE, buttonClass, chipClass, tileClass } from "@/components/ui/styles";
import { createRecipe, formatAmount, saveRecipe } from "@/lib/cookbook";
import { helperName } from "@/lib/profile";
import { parseSpokenRecipe, type SpokenRecipe } from "@/lib/recipeSpeech";
import { useProfile } from "@/lib/useProfile";
import { useSpeechInput } from "@/lib/useSpeechInput";

/**
 * "+" auf "Unsere Rezepte": Lotte erzählen (Sprache → Zutaten und Schritte),
 * selbst eintippen, Link oder Foto (mit KI – kommt bald).
 */
export function NewRecipeSheet({ onClose }: { onClose: () => void }) {
  const profile = useProfile();
  const name = helperName(profile);
  const [telling, setTelling] = useState(false);

  if (telling) return <TellRecipe name={name} onClose={onClose} />;
  return (
    <Sheet title="Neues Rezept" onClose={onClose}>
      <div className="flex flex-col gap-2 pb-2">
        <button type="button" onClick={() => setTelling(true)} className={tileClass(false)}>
          <HelperAvatar size={32} variant="badge" />
          <span className="flex flex-1 flex-col text-left">
            <span className="text-base font-bold">{name} erzählen</span>
            <span className="text-sm text-muted">Einfach sagen, was reinkommt und wie es geht</span>
          </span>
        </button>
        <Link href="/kochbuch/bearbeiten" onClick={onClose} className={tileClass(false)}>
          <PenLine className="h-6 w-6 shrink-0 text-accent" strokeWidth={2} aria-hidden />
          <span className="flex flex-1 flex-col text-left">
            <span className="text-base font-bold">Selbst eintippen</span>
            <span className="text-sm text-muted">Zutaten und Schritte im Formular</span>
          </span>
        </Link>
        {[
          { icon: Link2, label: "Link einfügen", hint: "Rezept von einer Webseite übernehmen" },
          { icon: Camera, label: "Foto vom Rezeptzettel", hint: "Omas Zettel abfotografieren" },
        ].map(({ icon: Icon, label, hint }) => (
          <button key={label} type="button" disabled aria-disabled className={`${tileClass(false)} opacity-55`}>
            <Icon className="h-6 w-6 shrink-0 text-muted" strokeWidth={2} aria-hidden />
            <span className="flex flex-1 flex-col text-left">
              <span className="text-base font-bold">
                {label} <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-muted">mit KI</span>
              </span>
              <span className="text-sm text-muted">{hint} – kommt bald</span>
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/** Rezept einsprechen (oder diktieren/tippen), dann Vorschau zum Speichern */
function TellRecipe({ name, onClose }: { name: string; onClose: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<SpokenRecipe | null>(null);
  const [hint, setHint] = useState("");
  const collected = useRef("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const understand = (value: string) => {
    const result = parseSpokenRecipe(value);
    if (!result) {
      setHint("Das hab ich noch nicht ganz verstanden – sag z. B. „Pfannkuchen. 200 Gramm Mehl, drei Eier und 300 ml Milch. Zuerst alles verrühren, dann in der Pfanne backen.“");
      return;
    }
    setHint("");
    setParsed(result);
  };

  const speech = useSpeechInput({
    onFinal: (t) => {
      collected.current = `${collected.current} ${t}`.trim();
      setText(collected.current);
    },
    onEnd: () => {
      const t = collected.current;
      if (t && mounted.current) understand(t);
    },
  });

  const save = (edit: boolean) => {
    if (!parsed) return;
    const recipe = saveRecipe(createRecipe({ ...parsed, source: "eigenes" }));
    onClose();
    router.push(edit ? `/kochbuch/bearbeiten?id=${encodeURIComponent(recipe.id)}` : `/kochbuch/rezept?id=${encodeURIComponent(recipe.id)}`);
  };

  if (parsed) {
    return (
      <Sheet title={parsed.title} onClose={onClose}>
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-sm text-muted">So hab ich&apos;s verstanden:</p>
          <div>
            <p className="mb-1.5 text-sm font-bold">Zutaten</p>
            {parsed.ingredients.length ? (
              <div className="flex flex-wrap gap-1.5">
                {parsed.ingredients.map((i) => (
                  <span key={i.id} className={chipClass(true)}>
                    {[formatAmount(i.amount), i.unit, i.name].filter(Boolean).join(" ")}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Noch keine – kannst du gleich ergänzen.</p>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-sm font-bold">Schritte</p>
            {parsed.steps.length ? (
              <ol className="flex list-decimal flex-col gap-1 pl-5 text-base">
                {parsed.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">Noch keine – kannst du gleich ergänzen.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => save(true)} className={buttonClass("secondary", "lg")}>
              Noch ändern
            </button>
            <button type="button" onClick={() => save(false)} className={buttonClass("primary", "lg")}>
              Speichern
            </button>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={`${name} erzählen`} onClose={onClose}>
      <div className="flex flex-col gap-3 pb-2">
        <p className="text-sm text-muted">Name, Zutaten mit Mengen, dann wie es geht – ganz normal erzählt.</p>
        <textarea
          value={speech.listening ? speech.interim || text : text}
          onChange={(e) => {
            collected.current = e.target.value;
            setText(e.target.value);
          }}
          rows={4}
          aria-label="Rezept erzählen"
          placeholder="z. B. „Pfannkuchen. 200 Gramm Mehl, drei Eier und 300 ml Milch. Zuerst alles verrühren, dann in der Pfanne backen.“"
          className={`${INPUT_BASE} w-full px-4 py-3`}
        />
        {hint && <p className="text-sm text-muted">{hint}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (speech.listening) speech.stop();
              else {
                collected.current = text;
                speech.start();
              }
            }}
            disabled={speech.supported === false}
            aria-pressed={speech.listening}
            aria-label={speech.listening ? "Zuhören beenden" : "Rezept einsprechen"}
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-md active:scale-95 disabled:opacity-40 ${speech.listening ? "animate-pulse ring-4 ring-accent/25" : ""}`}
          >
            {speech.listening ? (
              <Square className="h-5 w-5 fill-current" strokeWidth={2} aria-hidden />
            ) : speech.supported === false ? (
              <MicOff className="h-6 w-6" strokeWidth={2} aria-hidden />
            ) : (
              <Mic className="h-7 w-7" strokeWidth={2} aria-hidden />
            )}
          </button>
          <button type="button" disabled={!text.trim()} onClick={() => understand(text)} className={`${buttonClass("primary", "lg")} flex-1`}>
            Fertig erzählt
          </button>
        </div>
        {speech.supported === false && <p className="text-xs text-muted">Spracheingabe gibt es hier nicht – tipp aufs Mikrofon deiner Tastatur und diktiere einfach.</p>}
      </div>
    </Sheet>
  );
}
