"use client";

// Im Bearbeiten-Modus (Tafel 24): schwebende Leiste unten statt der Leiste der
// Begleitung – gleiche Stelle, Safe-Area. Links zweizeilig, wie man fertig
// wird; rechts groß „Fertig“. Man muss nie nach oben scrollen.

export function EditDoneBar({ onDone }: { onDone: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-background via-background/90 to-transparent px-4 pt-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]" data-keep-edit>
      <div className="pointer-events-auto mx-auto flex h-14 max-w-lg items-center gap-3 rounded-bar border border-line bg-surface pl-4 pr-1.5 shadow-bar">
        <p className="min-w-0 flex-1 text-[13px] leading-tight text-muted">
          Festhalten &amp; ziehen
          <br />
          Irgendwo tippen = fertig
        </p>
        <button type="button" onClick={onDone} className="h-12 shrink-0 rounded-full bg-accent px-7 text-[17px] font-bold text-on-accent active:scale-95">
          Fertig
        </button>
      </div>
    </div>
  );
}
