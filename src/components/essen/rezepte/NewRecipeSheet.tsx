"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PenLine } from "lucide-react";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { Sheet } from "@/components/ui/Sheet";
import { INPUT_BASE, buttonClass, chipClass, tileClass } from "@/components/ui/styles";
import { createRecipe, formatAmount, saveRecipe } from "@/lib/essen/cookbook";
import { helperName } from "@/lib/einstellungen/profile";
import { parseSpokenRecipe, type SpokenRecipe } from "@/lib/essen/recipeSpeech";
import { useProfile } from "@/lib/einstellungen/useProfile";

/**
 * "+" auf „Unsere Rezepte“: <Name> erzählen (ein Satz → Zutaten und Schritte)
 * oder selbst eintippen. Sprechen geht über den Mia-Knopf bzw. das Mikro der
 * Tastatur, das Fenster hat kein eigenes. Was es noch nicht gibt, wird nicht ausgegraut gezeigt.
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
          <BegleitungAvatar size={32} />
          <span className="flex flex-1 flex-col text-left">
            <span className="text-base font-bold">{name} erzählen</span>
            <span className="text-sm text-muted">Einfach sagen, was reinkommt und wie es geht</span>
          </span>
        </button>
        <Link href="/kochbuch/bearbeiten" onClick={onClose} className={tileClass(false)}>
          <PenLine className="h-6 w-6 shrink-0 text-accent" strokeWidth={2} aria-hidden />
          <span className="flex flex-1 flex-col text-left">
            <span className="text-base font-bold">Selbst schreiben</span>
            <span className="text-sm text-muted">Zutaten und Schritte im Formular</span>
          </span>
        </Link>
      </div>
    </Sheet>
  );
}

/** Rezept erzählen (tippen oder per Tastatur diktieren), dann Vorschau zum Speichern */
function TellRecipe({ name, onClose }: { name: string; onClose: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<SpokenRecipe | null>(null);
  const [hint, setHint] = useState("");

  const understand = (value: string) => {
    const result = parseSpokenRecipe(value);
    if (!result) {
      setHint("Das hab ich noch nicht ganz verstanden – sag z. B. „Pfannkuchen. 200 Gramm Mehl, drei Eier und 300 ml Milch. Zuerst alles verrühren, dann in der Pfanne backen.“");
      return;
    }
    setHint("");
    setParsed(result);
  };

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
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          aria-label="Rezept erzählen"
          placeholder="z. B. „Pfannkuchen. 200 Gramm Mehl, drei Eier und 300 ml Milch. Zuerst alles verrühren, dann in der Pfanne backen.“"
          className={`${INPUT_BASE} w-full px-4 py-3`}
        />
        {hint && <p className="text-sm text-muted">{hint}</p>}
        <button type="button" disabled={!text.trim()} onClick={() => understand(text)} className={`${buttonClass("primary", "lg")} w-full`}>
          Fertig erzählt
        </button>
      </div>
    </Sheet>
  );
}
