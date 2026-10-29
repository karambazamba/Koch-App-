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
//
// Geht es nach dem Schließen auf eine andere Seite (Menü „•••“ →
// „Einstellungen“), läuft das über `danach`: erst den Eintrag entfernen, nach
// dessen `popstate` navigieren (A-059). Sonst kam beim Kaltstart das
// verspätete Entfernen nach 300 ms der noch ladenden Navigation zuvor, das
// `popstate` brach sie ab und man blieb beim ersten Tippen auf der Startseite.
//
// Grundregel: Das Schließen trifft nie ein neues Öffnen. Jedes eigene Zurück
// (Eintrag eines geschlossenen Fensters entfernen) wird vorgemerkt; dessen
// `popstate` schließt kein Fenster, auch wenn es später als erwartet kommt
// oder das neue Fenster seinen Eintrag schon angelegt hat.

const REMOVE_AFTER_MS = 300;
/** Kommt nach dem eigenen Zurück kein `popstate` (kein Verlauf), trotzdem öffnen */
const WAIT_MAX_MS = 1000;
/** So lange gilt ein eigenes Zurück als „unterwegs“ (sein `popstate` schließt nichts) */
const OWN_POP_MS = 3000;

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
  let pending: { id: number; timer: unknown; isTop: () => boolean } | null = null;
  /** Wann zuletzt jemand selbst "Zurück" ausgelöst hat (z. B. "Entfernen" → eine Ebene zurück) */
  let lastBackAt = -1;
  /** Wann zuletzt eine Navigation begann (Link angetippt, neue Seite im Verlauf) */
  let lastNavAt = -1;
  /** Eigenes Zurück (Eintrag entfernen) unterwegs: neue Fenster warten auf dessen `popstate` */
  let removing: { waiting: Set<() => void>; timer: unknown } | null = null;
  /** Eigene Zurück, deren `popstate` noch aussteht (Frist je Zurück) */
  let ownPops: number[] = [];
  /** Das gerade ausgelieferte `popstate` kommt vom eigenen Zurück */
  let ownPop = false;

  const flush = () => {
    if (!removing) return;
    const { waiting, timer } = removing;
    removing = null;
    win.clearTimeout(timer as never);
    for (const start of waiting) start();
  };
  // Vor den Fenstern angemeldet – läuft also vor deren eigenem `popstate`
  win.addEventListener("popstate", () => {
    const t = win.now();
    ownPops = ownPops.filter((bis) => bis > t);
    // Gilt für dieses eine `popstate` (die Fenster hören es gleich danach)
    ownPop = ownPops.shift() !== undefined;
    flush();
  });

  const openIds = (): number[] => {
    const s = win.history.state as { sheets?: unknown } | null;
    return Array.isArray(s?.sheets) ? (s.sheets as number[]) : [];
  };

  /** Eigenen Eintrag entfernen; bis das `popstate` da ist, warten neue Fenster */
  const removeEntry = () => {
    removing ??= { waiting: new Set(), timer: win.setTimeout(flush, WAIT_MAX_MS) };
    ownPops.push(win.now() + OWN_POP_MS);
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
      if (ownPop || openIds().includes(id)) return;
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
        removeEntry();
        return;
      }
      const closedAt = win.now();
      const timer = win.setTimeout(() => {
        if (pending?.id === id) pending = null;
        // Inzwischen geht es woanders hin → Verlauf so lassen (sonst nähme Zurück die neue Seite weg)
        if (lastNavAt >= closedAt) return;
        if (isTop()) removeEntry();
      }, REMOVE_AFTER_MS);
      pending = { id, timer, isTop };
    };
  }

  /**
   * Nach dem Schließen weiter (z. B. auf eine andere Seite): Eintrag des eben
   * geschlossenen Fensters sofort entfernen und erst nach dessen `popstate`
   * (im nächsten Takt, damit der Router das Zurück schon verarbeitet hat)
   * `weiter` ausführen. Ohne offenen Eintrag gleich.
   */
  function danach(weiter: () => void) {
    if (pending) {
      const p = pending;
      pending = null;
      win.clearTimeout(p.timer as never);
      if (p.isTop()) removeEntry();
    }
    if (removing) removing.waiting.add(() => void win.setTimeout(weiter, 0));
    else weiter();
  }

  return {
    oeffne,
    danach,
    /** Jemand hat selbst „Zurück“ ausgelöst */
    zurueck: () => (lastBackAt = win.now()),
    /** Eine Navigation beginnt */
    navigation: () => (lastNavAt = win.now()),
  };
}
