// Fenster (Sheet, Menü) im Verlauf (für `useBackCloses`): Beim Öffnen ein
// eigener Verlaufseintrag (gleiche Adresse); Zurück nimmt ihn weg und schließt
// nur dieses Fenster. Schließt es anders (✕, Danebentippen, Runterwischen,
// Auswahl), wird der Eintrag kurz danach wieder entfernt – außer die Auswahl
// navigiert weiter (dann bleibt der Verlauf) oder gleich öffnet das nächste
// Fenster (das übernimmt den Eintrag).
//
// Öffnet das nächste Fenster erst, während dieses Entfernen schon unterwegs
// ist (`history.back()` ist asynchron, das `popstate` kommt später), wartet
// es damit, bis das `popstate` da ist. Sonst hielte es dieses `popstate` für
// „Zurück“ und schlösse sich sofort wieder – so verschwand Mias Frage „Soll
// ich dich erinnern?“, wenn ihr Fenster (per `next/dynamic` geladen) genau
// nach ~300 ms kam.

const REMOVE_AFTER_MS = 300;
/** Kommt nach dem eigenen Zurück kein `popstate` (kein Verlauf), trotzdem öffnen */
const WAIT_MAX_MS = 1000;

type Hist = Pick<History, "state" | "back" | "pushState" | "replaceState">;
export type FensterWin = {
  history: Hist;
  location: { href: string };
  addEventListener: (type: "popstate", l: () => void) => void;
  removeEventListener: (type: "popstate", l: () => void) => void;
  setTimeout: (f: () => void, ms: number) => unknown;
  clearTimeout: (t: never) => void;
  now: () => number;
};

export function fensterVerlauf(win: FensterWin) {
  let counter = 0;
  /** Eintrag eines eben anders geschlossenen Fensters, der gleich entfernt wird */
  let pending: { id: number; timer: unknown } | null = null;
  /** Wann zuletzt jemand selbst "Zurück" ausgelöst hat (z. B. "Entfernen" → eine Ebene zurück) */
  let lastBackAt = -1;
  /** Wann zuletzt eine Navigation begann (Link angetippt, neue Seite im Verlauf) */
  let lastNavAt = -1;
  /** Eigenes Zurück (Eintrag entfernen) unterwegs: neue Fenster warten auf dessen `popstate` */
  let removing: { waiting: Set<() => void>; timer: unknown } | null = null;

  const flush = () => {
    if (!removing) return;
    const { waiting, timer } = removing;
    removing = null;
    win.clearTimeout(timer as never);
    for (const start of waiting) start();
  };
  // Vor den Fenstern angemeldet – läuft also vor deren eigenem `popstate`
  win.addEventListener("popstate", flush);

  const openIds = (): number[] => {
    const s = win.history.state as { sheets?: unknown } | null;
    return Array.isArray(s?.sheets) ? (s.sheets as number[]) : [];
  };

  /** Eigenen Eintrag entfernen; bis das `popstate` da ist, warten neue Fenster */
  const removeEntry = () => {
    removing = { waiting: new Set(), timer: win.setTimeout(flush, WAIT_MAX_MS) };
    win.history.back();
  };

  /** Fenster offen: Eintrag anlegen, Zurück schließt es. Rückgabe = Fenster ist zu (anders als per Zurück) */
  function oeffne(onClose: () => void): () => void {
    let stop: (() => void) | null = null;
    const start = () => {
      stop = anmelden(onClose);
    };
    if (removing) {
      const { waiting } = removing;
      waiting.add(start);
      return () => {
        if (stop) stop();
        else waiting.delete(start);
      };
    }
    start();
    return () => stop?.();
  }

  function anmelden(onClose: () => void): () => void {
    const id = ++counter;
    try {
      const ids = openIds();
      if (pending && ids[ids.length - 1] === pending.id) {
        // Gleich das nächste Fenster (z. B. Menü → Bearbeiten): Eintrag übernehmen statt Zurück + neu
        win.clearTimeout(pending.timer as never);
        const reuse = pending.id;
        pending = null;
        win.history.replaceState({ ...(win.history.state ?? {}), sheets: [...ids.filter((x) => x !== reuse), id] }, "");
      } else {
        win.history.pushState({ ...(win.history.state ?? {}), sheets: [...ids, id] }, "");
      }
    } catch {
      return () => {};
    }
    const href = win.location.href;
    let closedByBack = false;
    const onPop = () => {
      if (openIds().includes(id)) return;
      closedByBack = true;
      onClose();
    };
    win.addEventListener("popstate", onPop);
    return () => {
      win.removeEventListener("popstate", onPop);
      if (closedByBack) return;
      const isTop = () => {
        const ids = openIds();
        return ids[ids.length - 1] === id && win.location.href === href;
      };
      if (!isTop()) return;
      // Die Auswahl geht selbst eine Ebene zurück: erst dieses Fenster, dann die Seite
      if (win.now() - lastBackAt < 100) {
        win.history.back();
        return;
      }
      const closedAt = win.now();
      const timer = win.setTimeout(() => {
        if (pending?.id === id) pending = null;
        // Inzwischen geht es woanders hin → Verlauf so lassen (sonst nähme Zurück die neue Seite weg)
        if (lastNavAt >= closedAt) return;
        if (isTop()) removeEntry();
      }, REMOVE_AFTER_MS);
      pending = { id, timer };
    };
  }

  return {
    oeffne,
    /** Jemand hat selbst „Zurück“ ausgelöst */
    zurueck: () => (lastBackAt = win.now()),
    /** Eine Navigation beginnt */
    navigation: () => (lastNavAt = win.now()),
  };
}
