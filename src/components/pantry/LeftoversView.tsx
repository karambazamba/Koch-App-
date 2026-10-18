"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ChevronRight, CircleHelp, Mic, MicOff, Plus, Sparkles, Square, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { NumberStepper } from "@/components/form/NumberStepper";
import { Sheet } from "@/components/plan/Sheet";
import { CategoryDot } from "@/components/ui/Category";
import { CARD, CARD_LIST, INPUT, INPUT_BASE, PAGE_MAIN, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import { formatAmount, parseAmount, useRecipes } from "@/lib/cookbook";
import {
  PANTRY_UNITS,
  addPantryItems,
  clearPantry,
  formatPantryItem,
  matchRecipes,
  removePantryItem,
  updatePantryItem,
  usePantry,
  type PantryItem,
} from "@/lib/pantry";
import { parseLeftovers, type ParsedLeftover } from "@/lib/leftovers/parser";
import { weekdayLunchHeadcount, type HouseholdProfile } from "@/lib/profile";
import { useProfile } from "@/lib/useProfile";
import { useSpeechInput } from "@/lib/useSpeechInput";
import { toIsoDate, useToday } from "@/lib/weekPlan";

/** Personen für die aktuelle Mahlzeit laut Profil (mittags unter der Woche: wer zu Hause isst) */
function personsForNow(profile: HouseholdProfile | null, now: Date): number {
  if (!profile) return 2;
  const lunch = now.getHours() < 15;
  const weekday = now.getDay() >= 1 && now.getDay() <= 5;
  const count = lunch && weekday ? weekdayLunchHeadcount(profile).max : profile.persons.length;
  return Math.max(1, count);
}

/** Nicht als Lebensmittel erkannt – wartet auf "Meintest du …?" */
type UnsureItem = ParsedLeftover & { id: string };

/** /schnellkueche: "Was ist noch da?" – Reste erfassen, passende Rezepte finden. */
export function LeftoversView() {
  const pantry = usePantry();
  const recipes = useRecipes();
  const profile = useProfile();
  const today = useToday();
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [persons, setPersons] = useState<number | null>(null);
  const [unsure, setUnsure] = useState<UnsureItem[]>([]);
  const [asking, setAsking] = useState<UnsureItem | null>(null);
  // Jede Sprechpause ist ein eigener Abschnitt → eigene Zutat(en)
  const speech = useSpeechInput({ onFinal: (value) => void addText(value) });
  const { listening, interim, error: speechError } = speech;
  const speechSupported = speech.supported;

  if (pantry === undefined || recipes === undefined || profile === undefined || !today) {
    return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  }

  const shownPersons = persons ?? personsForNow(profile, new Date());
  const mealLabel = new Date().getHours() < 15 ? "mittags" : "abends";
  const addText = async (value: string) => {
    const items = await parseLeftovers(value);
    const known = items.filter((i) => i.known);
    if (known.length > 0) addPantryItems(known.map(({ name, amount, unit }) => ({ name, amount, unit })), toIsoDate(today));
    const unknown = items.filter((i) => !i.known);
    if (unknown.length > 0) {
      setUnsure((prev) => [...prev, ...unknown.map((i) => ({ ...i, id: `${Date.now()}-${Math.random()}` }))]);
    }
  };
  const resolveUnsure = (item: UnsureItem, name: string | null) => {
    if (name) addPantryItems([{ name, amount: item.amount, unit: item.unit }], toIsoDate(today));
    setUnsure((prev) => prev.filter((u) => u.id !== item.id));
    setAsking(null);
  };

  const startListening = speech.start;
  const stopListening = speech.stop;
  const matches = matchRecipes(Object.values(recipes), pantry);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Was ist noch da?" />
      <main className={PAGE_MAIN}>
        <p className="text-base text-muted">Sag, was übrig ist – wir zaubern was draus.</p>

        <section className={`${CARD} flex flex-col items-center gap-3 p-6`}>
          {speechSupported === false ? (
            <p className="flex items-start gap-3 text-base text-muted" role="note">
              <MicOff className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
              <span>Spracheingabe gibt es in diesem Browser leider nicht – tipp die Reste einfach unten ein.</span>
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                disabled={speechSupported === null}
                aria-pressed={listening}
                aria-label={listening ? "Zuhören beenden" : "Reste einsprechen"}
                className={`flex h-28 w-28 items-center justify-center rounded-full bg-accent text-white shadow-lg transition active:scale-95 disabled:opacity-40 ${
                  listening ? "animate-pulse ring-8 ring-accent/20" : ""
                }`}
              >
                {listening ? (
                  <Square className="h-10 w-10 fill-current" strokeWidth={2} aria-hidden />
                ) : (
                  <Mic className="h-12 w-12" strokeWidth={2} aria-hidden />
                )}
              </button>
              <p className="min-h-6 text-center font-semibold text-ink" role="status">
                {listening ? interim || "Ich höre zu …" : "Antippen und sagen, was noch da ist"}
              </p>
              <p className="text-center text-sm text-muted">
                z. B. „zwei Karotten, eine Aubergine, Bacon und Joghurt“ – kurze Pausen oder „und“ zwischen den Zutaten helfen.
              </p>
            </>
          )}
          {speechError && <p className="text-center text-sm font-semibold text-red-600">{speechError}</p>}
        </section>

        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Oder tippen: 2 Karotten, Joghurt …"
            aria-label="Reste eintippen"
            enterKeyHint="done"
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) {
                addText(text);
                setText("");
                e.currentTarget.blur();
              }
            }}
            className={`${INPUT} flex-1`}
          />
          <button
            type="button"
            disabled={!text.trim()}
            onClick={() => {
              addText(text);
              setText("");
            }}
            className={buttonClass("primary")}
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            Dazu
          </button>
        </div>

        <section className={`${CARD} flex flex-col gap-3 p-4`} aria-label="Vorrat">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className={SECTION_TITLE}>Noch da ({pantry.length})</h2>
            {pantry.length > 0 && (
              <button
                type="button"
                onClick={() => window.confirm("Alle Reste aus der Liste nehmen?") && clearPantry()}
                className="text-sm font-semibold text-muted underline"
              >
                Alles leeren
              </button>
            )}
          </div>
          {pantry.length === 0 && unsure.length === 0 ? (
            <p className="text-sm text-muted">Noch nichts eingetragen.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {pantry.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setEditing(item)}
                  className={chipClass(true)}
                >
                  {formatPantryItem(item)}
                </button>
              ))}
              {unsure.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-unsure
                  onClick={() => setAsking(item)}
                  aria-label={`${formatPantryItem(item)} – unsicher, nachfragen`}
                  className={chipClass(false, "muted")}
                >
                  {formatPantryItem(item)}
                  <CircleHelp className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                </button>
              ))}
            </div>
          )}
          {unsure.length > 0 && (
            <p className="text-xs text-muted">Graue Einträge kennen wir nicht – antippen zum Übernehmen oder Löschen.</p>
          )}
          {pantry.length > 0 && <p className="text-xs text-muted">Antippen zum Ändern oder Löschen.</p>}
        </section>

        <NumberStepper
          label="Für wie viele?"
          hint={persons === null ? `${mealLabel}, laut Profil` : "Personen"}
          value={shownPersons}
          min={1}
          max={16}
          onChange={setPersons}
        />

        <section className="flex flex-col gap-3" aria-label="Treffer aus dem Kochbuch">
          <h2 className={`${SECTION_TITLE} px-1`}>Passt aus eurem Kochbuch</h2>
          {pantry.length === 0 ? (
            <p className="px-1 text-sm text-muted">Sobald Reste eingetragen sind, zeigen wir passende Rezepte.</p>
          ) : matches.length === 0 ? (
            <p className={`${CARD} p-4 text-muted`}>
              Kein Rezept im Kochbuch nutzt diese Reste.{" "}
              <Link href="/kochbuch/bearbeiten" className="font-bold text-accent-strong underline">
                Rezept anlegen
              </Link>
            </p>
          ) : (
            <ul className={CARD_LIST}>
              {matches.map((m) => (
                <li key={m.recipe.id}>
                  <Link
                    href={`/kochbuch/rezept?id=${encodeURIComponent(m.recipe.id)}`}
                    className="flex items-center gap-3 px-4 py-3 transition active:bg-stone-50"
                  >
                    <CategoryDot category={m.recipe.category} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-bold leading-snug">{m.recipe.title}</span>
                      <span className="block text-sm text-muted">
                        <span className="whitespace-nowrap font-semibold text-accent-strong">
                          nutzt {m.used.length} von {pantry.length} {pantry.length === 1 ? "Rest" : "Resten"}
                        </span>
                        {" · "}
                        {m.missing.length === 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-accent-strong">
                            nichts fehlt <Check className="h-4 w-4" strokeWidth={2.5} aria-label="✓" />
                          </span>
                        ) : (
                          <>
                            fehlt: {m.missing.slice(0, 3).join(", ")}
                            {m.missing.length > 3 && ` +${m.missing.length - 3}`}
                          </>
                        )}
                      </span>
                      {m.recipe.servings !== shownPersons && (
                        <span className="block text-xs text-muted">
                          Rezept für {m.recipe.servings}, ihr seid {shownPersons}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-stone-300" strokeWidth={2.25} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <button
          type="button"
          disabled
          title="Kommt bald"
          className="flex min-h-16 flex-col items-center justify-center rounded-xl border border-dashed border-line px-4 text-base font-bold text-muted"
        >
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
            KI-Ideen für diese Reste
          </span>
          <span className="text-sm font-semibold text-stone-400">kommt bald</span>
        </button>
      </main>

      {editing && <EditSheet item={editing} onClose={() => setEditing(null)} />}
      {asking && <UnsureSheet item={asking} onResolve={(name) => resolveUnsure(asking, name)} onClose={() => setAsking(null)} />}
    </div>
  );
}

/** Unbekanntes Wort: Vorschlag übernehmen, so übernehmen oder löschen */
function UnsureSheet({
  item,
  onResolve,
  onClose,
}: {
  item: UnsureItem;
  onResolve: (name: string | null) => void;
  onClose: () => void;
}) {
  const amount = formatPantryItem({ ...item, name: "" }).trim();
  const withAmount = (name: string) => (amount ? `${amount} ${name}` : name);
  return (
    <Sheet title={item.suggestion ? `Meintest du ${item.suggestion}?` : "Kennen wir nicht"} onClose={onClose}>
      <p className="text-base text-muted">
        Gehört: „{item.heard}“ – das ist nicht in unserer Lebensmittel-Liste.
      </p>
      <div className="flex flex-col gap-2">
        {item.suggestion && (
          <button type="button" onClick={() => onResolve(item.suggestion)} className={buttonClass("primary", "lg")}>
            <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            {withAmount(item.suggestion)} übernehmen
          </button>
        )}
        <button
          type="button"
          onClick={() => onResolve(item.name)}
          className={buttonClass(item.suggestion ? "secondary" : "primary", "lg")}
        >
          {item.suggestion ? `So lassen: ${withAmount(item.name)}` : `${withAmount(item.name)} übernehmen`}
        </button>
        <button type="button" onClick={() => onResolve(null)} className={buttonClass("danger", "lg")}>
          <Trash2 className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          Löschen
        </button>
      </div>
    </Sheet>
  );
}

function EditSheet({ item, onClose }: { item: PantryItem; onClose: () => void }) {
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(formatAmount(item.amount));
  const [unit, setUnit] = useState(item.unit);
  const [y, m, d] = item.addedAt.split("-");

  return (
    <Sheet title="Rest ändern" onClose={onClose}>
      {item.addedAt && (
        <p className="text-sm text-muted">
          Eingetragen am {Number(d)}.{Number(m)}.{y}
        </p>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Menge"
          aria-label="Menge"
          className={`${INPUT_BASE} h-12 w-20 shrink-0 px-2 text-center`}
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          aria-label="Einheit"
          className={`${INPUT_BASE} h-12 w-24 shrink-0 px-2`}
        >
          {PANTRY_UNITS.map((u) => (
            <option key={u} value={u}>
              {u || "–"}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Zutat"
          className={`${INPUT_BASE} h-12 flex-1 px-3`}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            removePantryItem(item.id);
            onClose();
          }}
          className={buttonClass("danger", "lg")}
        >
          <Trash2 className="h-5 w-5" strokeWidth={2.25} aria-hidden />
          Löschen
        </button>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => {
            updatePantryItem(item.id, { name: name.trim(), amount: parseAmount(amount), unit });
            onClose();
          }}
          className={buttonClass("primary", "lg")}
        >
          <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          Speichern
        </button>
      </div>
    </Sheet>
  );
}
