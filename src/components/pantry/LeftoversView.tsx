"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PageHeader } from "@/components/PageHeader";
import { NumberStepper } from "@/components/form/NumberStepper";
import { Sheet } from "@/components/plan/Sheet";
import { categoryInfo, formatAmount, parseAmount, useRecipes } from "@/lib/cookbook";
import {
  PANTRY_UNITS,
  addPantryItems,
  clearPantry,
  formatPantryItem,
  matchRecipes,
  parseIngredientText,
  removePantryItem,
  updatePantryItem,
  usePantry,
  type PantryItem,
} from "@/lib/pantry";
import { weekdayLunchHeadcount, type HouseholdProfile } from "@/lib/profile";
import { useProfile } from "@/lib/useProfile";
import { toIsoDate, useToday } from "@/lib/weekPlan";

// Minimal-Typen für die Web Speech API (nicht in allen TS-Libs enthalten)
type SpeechResultList = ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: SpeechResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function speechRecognitionClass(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

/** Gibt es Spracheingabe? Erst im Browser bekannt (beim Vorrendern `null`). */
function useSpeechSupported(): boolean | null {
  return useSyncExternalStore(noopSubscribe, () => Boolean(speechRecognitionClass()), () => null);
}

/** Personen für die aktuelle Mahlzeit laut Profil (mittags unter der Woche: wer zu Hause isst) */
function personsForNow(profile: HouseholdProfile | null, now: Date): number {
  if (!profile) return 2;
  const lunch = now.getHours() < 15;
  const weekday = now.getDay() >= 1 && now.getDay() <= 5;
  const count = lunch && weekday ? weekdayLunchHeadcount(profile).max : profile.persons.length;
  return Math.max(1, count);
}

/** /schnellkueche: "Was ist noch da?" – Reste erfassen, passende Rezepte finden. */
export function LeftoversView() {
  const pantry = usePantry();
  const recipes = useRecipes();
  const profile = useProfile();
  const today = useToday();
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [persons, setPersons] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [speechError, setSpeechError] = useState("");
  const speechSupported = useSpeechSupported();
  const recognitionRef = useRef<Recognition | null>(null);

  // Beim Verlassen der Seite nicht weiter zuhören
  useEffect(() => () => recognitionRef.current?.stop(), []);

  if (pantry === undefined || recipes === undefined || profile === undefined || !today) {
    return <div className="m-4 h-64 animate-pulse rounded-3xl bg-white/70" />;
  }

  const shownPersons = persons ?? personsForNow(profile, new Date());
  const mealLabel = new Date().getHours() < 15 ? "mittags" : "abends";
  const addText = (value: string) => {
    const items = parseIngredientText(value);
    if (items.length > 0) addPantryItems(items, toIsoDate(today));
  };

  const startListening = () => {
    const Recognition = speechRecognitionClass();
    if (!Recognition) return;
    setSpeechError("");
    const recognition = new Recognition();
    recognition.lang = "de-DE";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        // Jede Sprechpause ist ein eigener Abschnitt → eigene Zutat(en)
        if (result.isFinal) addText(result[0].transcript);
        else pending += result[0].transcript;
      }
      setInterim(pending);
    };
    recognition.onerror = (e) => {
      setSpeechError(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Das Mikrofon ist nicht erlaubt – bitte in den Einstellungen freigeben oder einfach tippen."
          : e.error === "no-speech"
            ? "Ich habe nichts gehört – nochmal versuchen?"
            : "Spracheingabe hat nicht geklappt – tipp es einfach ein.",
      );
    };
    recognition.onend = () => {
      setListening(false);
      setInterim("");
    };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => recognitionRef.current?.stop();
  const matches = matchRecipes(Object.values(recipes), pantry);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Was ist noch da?" />
      <main className="safe-bottom flex flex-1 flex-col gap-4 px-4 pb-8 pt-2">
        <p className="text-lg text-stone-600">Sag, was übrig ist – wir zaubern was draus.</p>

        <section className="flex flex-col items-center gap-3 rounded-3xl bg-white p-5 shadow-sm">
          {speechSupported === false ? (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-amber-900" role="note">
              🎙️ Spracheingabe gibt es in diesem Browser leider nicht – tipp die Reste einfach unten ein.
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                disabled={speechSupported === null}
                aria-pressed={listening}
                aria-label={listening ? "Zuhören beenden" : "Reste einsprechen"}
                className={`flex h-28 w-28 items-center justify-center rounded-full text-5xl text-white shadow-lg active:scale-95 disabled:opacity-40 ${
                  listening ? "animate-pulse bg-rose-500" : "bg-orange-500"
                }`}
              >
                {listening ? "■" : "🎙️"}
              </button>
              <p className="min-h-6 text-center font-semibold text-stone-600" role="status">
                {listening ? interim || "Ich höre zu …" : "Antippen und sagen, was noch da ist"}
              </p>
              <p className="text-center text-sm text-stone-500">
                z. B. „zwei Karotten, eine Aubergine, Bacon und Joghurt“ – kurze Pausen oder „und“ zwischen den Zutaten helfen.
              </p>
            </>
          )}
          {speechError && <p className="text-center text-sm font-semibold text-rose-700">{speechError}</p>}
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
            className="h-14 min-w-0 flex-1 rounded-2xl border-2 border-stone-200 bg-white px-4 text-lg outline-none focus:border-orange-400"
          />
          <button
            type="button"
            disabled={!text.trim()}
            onClick={() => {
              addText(text);
              setText("");
            }}
            className="h-14 shrink-0 rounded-2xl bg-orange-500 px-5 text-lg font-bold text-white active:scale-95 disabled:opacity-40"
          >
            + Dazu
          </button>
        </div>

        <section className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm" aria-label="Vorrat">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-extrabold">🧺 Noch da ({pantry.length})</h2>
            {pantry.length > 0 && (
              <button
                type="button"
                onClick={() => window.confirm("Alle Reste aus der Liste nehmen?") && clearPantry()}
                className="text-sm font-semibold text-stone-500 underline"
              >
                Alles leeren
              </button>
            )}
          </div>
          {pantry.length === 0 ? (
            <p className="text-stone-500">Noch nichts eingetragen.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {pantry.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setEditing(item)}
                  className="h-11 rounded-full border-2 border-orange-200 bg-orange-50 px-4 text-base font-semibold text-orange-900 active:scale-95"
                >
                  {formatPantryItem(item)}
                </button>
              ))}
            </div>
          )}
          {pantry.length > 0 && <p className="text-xs text-stone-500">Antippen zum Ändern oder Löschen.</p>}
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
          <h2 className="px-1 text-lg font-extrabold">📖 Passt aus eurem Kochbuch</h2>
          {pantry.length === 0 ? (
            <p className="px-1 text-stone-500">Sobald Reste eingetragen sind, zeigen wir passende Rezepte.</p>
          ) : matches.length === 0 ? (
            <p className="rounded-3xl bg-white p-4 text-stone-600 shadow-sm">
              Kein Rezept im Kochbuch nutzt diese Reste.{" "}
              <Link href="/kochbuch/bearbeiten" className="font-bold text-orange-700 underline">
                Rezept anlegen
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-3xl bg-white shadow-sm">
              {matches.map((m) => (
                <li key={m.recipe.id}>
                  <Link
                    href={`/kochbuch/rezept?id=${encodeURIComponent(m.recipe.id)}`}
                    className="flex items-center gap-3 px-4 py-3 active:bg-orange-50"
                  >
                    <span className="text-2xl" aria-hidden>
                      {categoryInfo(m.recipe.category).emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-bold leading-tight">{m.recipe.title}</span>
                      <span className="block text-sm text-stone-600">
                        <span className="whitespace-nowrap font-semibold text-emerald-700">
                          nutzt {m.used.length} von {pantry.length} {pantry.length === 1 ? "Rest" : "Resten"}
                        </span>
                        {" · "}
                        {m.missing.length === 0 ? (
                          <span className="font-semibold text-emerald-700">nichts fehlt ✓</span>
                        ) : (
                          <>
                            fehlt: {m.missing.slice(0, 3).join(", ")}
                            {m.missing.length > 3 && ` +${m.missing.length - 3}`}
                          </>
                        )}
                      </span>
                      {m.recipe.servings !== shownPersons && (
                        <span className="block text-xs text-stone-500">
                          Rezept für {m.recipe.servings}, ihr seid {shownPersons}
                        </span>
                      )}
                    </span>
                    <span className="text-xl text-stone-300" aria-hidden>
                      ›
                    </span>
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
          className="flex min-h-16 flex-col items-center justify-center rounded-2xl bg-violet-50 px-4 text-lg font-bold text-violet-400"
        >
          ✨ KI-Ideen für diese Reste
          <span className="text-sm font-semibold">kommt bald</span>
        </button>
      </main>

      {editing && <EditSheet item={editing} onClose={() => setEditing(null)} />}
    </div>
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
        <p className="text-sm text-stone-500">
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
          className="h-14 w-24 shrink-0 rounded-2xl border-2 border-stone-200 bg-white px-3 text-center text-lg outline-none focus:border-orange-400"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          aria-label="Einheit"
          className="h-14 w-28 shrink-0 rounded-2xl border-2 border-stone-200 bg-white px-2 text-lg outline-none focus:border-orange-400"
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
          className="h-14 min-w-0 flex-1 rounded-2xl border-2 border-stone-200 bg-white px-3 text-lg outline-none focus:border-orange-400"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            removePantryItem(item.id);
            onClose();
          }}
          className="h-14 rounded-2xl bg-white font-bold text-rose-700 shadow-sm active:scale-95"
        >
          🗑 Löschen
        </button>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => {
            updatePantryItem(item.id, { name: name.trim(), amount: parseAmount(amount), unit });
            onClose();
          }}
          className="h-14 rounded-2xl bg-orange-500 font-extrabold text-white shadow-md active:scale-95 disabled:opacity-40"
        >
          Speichern ✓
        </button>
      </div>
    </Sheet>
  );
}
