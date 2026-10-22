"use client";

// "Zum Beispiel:" über dem Eingabefeld – klar als Vorschläge erkennbar (keine
// Sprechblasen): antippen = als eigene Nachricht senden.

type Props = {
  suggestions: string[];
  onPick: (text: string) => void;
};

export function SuggestionChips({ suggestions, onPick }: Props) {
  return (
            <div className="flex flex-col gap-1.5" aria-label="Vorschläge">
              <p className="text-xs font-semibold text-muted">Zum Beispiel:</p>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]" data-no-swipe>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onPick(s)}
                    className="min-h-9 shrink-0 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition active:scale-95"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
  );
}
