// Sprechen hängt nach 3–4 Runden (iPhone): Wachhund, Notausgang, erzwungenes
// Ende, jede Erkennung nur einmal, Mia verstummt vor dem Zuhören.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BELEGT, ENDE_MS, LEER_MS, NOCHMAL, STIMME_PAUSE_MS, Spracherkennung, WACHE_MS, forgetPreviousForTests, vorDemZuhoeren, type Anzeige, type Recognition } from "@/lib/begleitung/spracherkennung";
import { micOwner } from "@/lib/core/mic";

/** Nachgebaute Erkennung: `stumm` = start() wirft nicht, aber es kommt nie ein Ereignis (iPhone-Hänger) */
class FakeRec implements Recognition {
  static all: FakeRec[] = [];
  /** ab dem wievielten Start (gezählt über alle Instanzen) bleibt sie stumm – und wie viele danach */
  static stummAb = Infinity;
  static stummAnzahl = Infinity;
  static starts = 0;
  lang = "";
  continuous = false;
  interimResults = false;
  onstart: (() => void) | null = null;
  onaudiostart: (() => void) | null = null;
  onresult: Recognition["onresult"] = null;
  onerror: Recognition["onerror"] = null;
  onend: (() => void) | null = null;
  started = 0;
  aborted = false;
  stumm = false;
  constructor() {
    FakeRec.all.push(this);
  }
  start() {
    this.started++;
    if (this.started > 1) throw new Error("InvalidStateError: schon gestartet");
    FakeRec.starts++;
    this.stumm = FakeRec.starts >= FakeRec.stummAb && FakeRec.starts < FakeRec.stummAb + FakeRec.stummAnzahl;
    if (!this.stumm) queueMicrotask(() => this.onstart?.());
  }
  stop() {
    if (!this.stumm) queueMicrotask(() => this.onend?.());
  }
  abort() {
    this.aborted = true;
  }
  sag(text: string, final = true) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal: final, 0: { transcript: text } }] });
  }
}

const last = () => FakeRec.all[FakeRec.all.length - 1];

function setup(o: { buehne?: boolean; long?: boolean } = {}) {
  const log = { listening: false, error: "", ends: [] as string[], texts: [] as string[] };
  const anzeige: Anzeige = {
    listening: (on) => (log.listening = on),
    interim: () => {},
    error: (t) => (log.error = t),
    wartet: () => {},
    transcript: (t) => log.texts.push(t),
    end: (t) => log.ends.push(t),
  };
  const e = new Spracherkennung({ micId: "test", ...o, klasse: () => FakeRec, anzeige: () => anzeige });
  return { e, log };
}

const tick = async (ms = 0) => {
  await vi.advanceTimersByTimeAsync(ms);
};

beforeEach(() => {
  vi.useFakeTimers();
  FakeRec.all = [];
  FakeRec.starts = 0;
  FakeRec.stummAb = Infinity;
  FakeRec.stummAnzahl = Infinity;
  forgetPreviousForTests();
});
afterEach(() => vi.useRealTimers());

describe("Wachhund", () => {
  it("nach 3 Starts kommt nichts mehr: hart abbrechen, still neu starten – klappt", async () => {
    FakeRec.stummAb = 4;
    FakeRec.stummAnzahl = 1;
    const { e, log } = setup();
    for (let i = 0; i < 3; i++) {
      e.begin();
      await tick();
      last().sag(`Runde ${i}`);
      e.stop();
      await tick();
      expect(log.ends.at(-1)).toBe(`Runde ${i}`);
    }
    // vierter Start: stumm
    e.begin();
    await tick();
    const stumm = last();
    expect(stumm.stumm).toBe(true);
    await tick(WACHE_MS + 10);
    expect(stumm.aborted).toBe(true);
    expect(stumm.onend).toBeNull();
    const neu = last();
    expect(neu).not.toBe(stumm);
    expect(log.listening).toBe(true);
    neu.sag("klappt wieder");
    e.stop();
    await tick();
    expect(log.ends.at(-1)).toBe("klappt wieder");
    expect(log.error).toBe("");
  });

  it("auch der zweite Start bleibt stumm: ruhig „Nochmal?“, Knopf bereit, Mikro frei", async () => {
    FakeRec.stummAb = 1;
    const { e, log } = setup({ buehne: true });
    e.begin();
    await tick(WACHE_MS + 10);
    await tick(WACHE_MS + 10);
    expect(log.error).toBe(NOCHMAL);
    expect(log.listening).toBe(false);
    expect(e.aktiv).toBe(false);
    expect(micOwner()).toBeNull();
    expect(FakeRec.all).toHaveLength(2);
    expect(FakeRec.all.every((r) => r.aborted)).toBe(true);
    // nächster Versuch geht wieder
    FakeRec.stummAb = Infinity;
    e.begin();
    await tick();
    expect(log.error).toBe("");
    expect(log.listening).toBe(true);
  });

  it("jede Erkennung nur einmal, alte ohne Rückrufe weg", async () => {
    const { e } = setup({ buehne: true });
    e.begin();
    await tick();
    const a = last();
    e.begin();
    await tick();
    expect(a.aborted).toBe(true);
    expect([a.onresult, a.onend, a.onerror, a.onstart]).toEqual([null, null, null, null]);
    expect(FakeRec.all.every((r) => r.started === 1)).toBe(true);
  });
});

// Fehler (Video 28.10. 09:09): Mikro belegt (Bildschirmaufnahme, Telefonat) – onstart kommt,
// onaudiostart nie, die Sitzung endet sofort. Früher: endloser Neustart (Mikro an/aus,
// iOS „Audioaufnahme beenden?“). Jetzt: höchstens EIN stiller Neustart, dann ruhig aufhören.
describe("Mikro belegt: keine Neustart-Schleife", () => {
  it("Sitzungen ohne Ton enden sofort → ein stiller Neustart, dann „Mikro ist gerade belegt“", async () => {
    const { e, log } = setup({ buehne: true });
    e.begin();
    for (let i = 0; i < 6; i++) {
      await tick(50);
      last().onend?.(); // endet sofort, ohne onaudiostart und ohne Ergebnis
    }
    await tick(WACHE_MS * 3);
    expect(FakeRec.starts).toBe(2);
    expect(log.error).toBe(BELEGT);
    expect(log.listening).toBe(false);
    expect(e.aktiv).toBe(false);
    expect(micOwner()).toBeNull();
    // Knopf bereit: nächstes Antippen hört wieder zu
    e.begin();
    await tick();
    expect(log.error).toBe("");
    expect(log.listening).toBe(true);
  });

  it("Pausen mit Ton (onaudiostart) oder lange stille Sitzungen sind kein „belegt“", async () => {
    const { e, log } = setup({ buehne: true });
    e.begin();
    for (let i = 0; i < 4; i++) {
      await tick(50);
      last().onaudiostart?.();
      last().onend?.();
    }
    for (let i = 0; i < 3; i++) {
      await tick(LEER_MS + 100);
      last().onend?.();
    }
    expect(log.error).toBe("");
    expect(log.listening).toBe(true);
    expect(FakeRec.starts).toBe(8);
  });

  it("steht im Mikro-Protokoll", async () => {
    vi.useRealTimers();
    const { fakeWindow } = await import("../helpers");
    const win = fakeWindow();
    vi.resetModules();
    vi.useFakeTimers();
    const se = await import("@/lib/begleitung/spracherkennung");
    const e = new se.Spracherkennung({ micId: "b", buehne: true, klasse: () => FakeRec, anzeige: () => ({ listening: () => {}, interim: () => {}, error: () => {}, wartet: () => {}, transcript: () => {}, end: () => {} }) });
    e.begin();
    for (let i = 0; i < 3; i++) {
      await tick(20);
      last().onend?.();
    }
    const lines = (JSON.parse(win.localStorage.getItem("wasgibts.mikroprotokoll")!).entries as { text: string }[]).map((x) => x.text);
    expect(lines).toContain("Zuhören: kein Ton, einmal neu");
    expect(lines).toContain("Zuhören: Mikro belegt, kein Ton, aufgehört");
  });
});

describe("Hänger während des Zuhörens", () => {
  it("„Fertig“, aber kein onend: nach 2 s selbst abschließen und abschicken", async () => {
    const { e, log } = setup({ buehne: true });
    e.begin();
    await tick();
    const r = last();
    r.sag("Milch kaufen");
    r.stumm = true; // stop() meldet nichts mehr
    e.stop();
    await tick(ENDE_MS + 10);
    expect(log.ends).toEqual(["Milch kaufen"]);
    expect(log.listening).toBe(false);
    expect(e.aktiv).toBe(false);
  });

  it("länger als erlaubt ohne Ende: beendet und abgeschickt, was da ist", async () => {
    const { e, log } = setup();
    e.begin();
    await tick();
    const r = last();
    r.sag("Termin morgen", false);
    r.stumm = true;
    await tick(60_000 + 5000 + ENDE_MS + 50);
    expect(log.ends).toEqual(["Termin morgen"]);
    expect(e.aktiv).toBe(false);
  });

  it("Notausgang: Antippen bei hängendem Start setzt zurück und hört neu zu", async () => {
    FakeRec.stummAb = 1;
    FakeRec.stummAnzahl = 1;
    const { e, log } = setup({ buehne: true });
    e.begin();
    await tick(WACHE_MS - 100);
    expect(e.haengt()).toBe(false);
    vi.setSystemTime(Date.now() + 200);
    expect(e.haengt()).toBe(true);
    expect(e.stop()).toBe(true);
    await tick();
    expect(log.listening).toBe(true);
    expect(last().stumm).toBe(false);
    last().sag("geht");
    expect(e.stop()).toBe(false);
    await tick();
    expect(log.ends).toEqual(["geht"]);
  });
});

describe("10 Runden hintereinander", () => {
  it("jede Runde hört zu und schickt ab – auch mit Hängern zwischendurch", async () => {
    const { e, log } = setup({ buehne: true });
    for (let i = 0; i < 10; i++) {
      // jede dritte Runde bleibt der erste Start stumm
      if (i % 3 === 2) {
        FakeRec.stummAb = FakeRec.starts + 1;
        FakeRec.stummAnzahl = 1;
      }
      e.begin();
      await tick(i % 3 === 2 ? WACHE_MS + 10 : 0);
      last().sag(`Satz ${i}`);
      e.stop();
      await tick();
      expect(log.ends.at(-1)).toBe(`Satz ${i}`);
      expect(log.listening).toBe(false);
      expect(micOwner()).toBeNull();
    }
    expect(log.ends).toHaveLength(10);
    expect(log.error).toBe("");
  });
});

describe("Vor dem Zuhören", () => {
  it("spricht Mia noch: verstummen, kurz warten, dann zuhören", async () => {
    const go = vi.fn();
    const still = vi.fn();
    vorDemZuhoeren(go, { spricht: () => true, still, settle: () => 0 });
    expect(still).toHaveBeenCalledOnce();
    expect(go).not.toHaveBeenCalled();
    await tick(STIMME_PAUSE_MS - 1);
    expect(go).not.toHaveBeenCalled();
    await tick(1);
    expect(go).toHaveBeenCalledOnce();
  });

  it("still und Mikro frei: sofort; gerade abgegebenes Mikro: so lange warten", async () => {
    const go = vi.fn();
    vorDemZuhoeren(go, { spricht: () => false, still: vi.fn(), settle: () => 0 });
    expect(go).toHaveBeenCalledOnce();
    const later = vi.fn();
    const cancel = vorDemZuhoeren(later, { spricht: () => false, still: vi.fn(), settle: () => 300 });
    cancel();
    await tick(400);
    expect(later).not.toHaveBeenCalled();
  });
});

describe("Mikro-Protokoll", () => {
  it("bis zu 50 Zeilen, zum Teilen nur Uhrzeit und Technik", async () => {
    const { migrateMicLog, micLogText } = await import("@/lib/core/micLog");
    const many = Array.from({ length: 70 }, (_, i) => ({ at: Date.UTC(2026, 9, 27, 12, 0, i), text: `Zuhören: Start ${i}` }));
    expect(migrateMicLog({ version: 1, entries: many })!.entries).toHaveLength(50);
    expect(micLogText(many.slice(0, 2))).toBe("13:00:00 Zuhören: Start 0\n13:00:01 Zuhören: Start 1");
  });

  it("Wachhund und Neustart stehen im Protokoll – nie Gesprochenes", async () => {
    vi.useRealTimers();
    const { fakeWindow } = await import("../helpers");
    const win = fakeWindow();
    vi.resetModules();
    vi.useFakeTimers();
    const se = await import("@/lib/begleitung/spracherkennung");
    FakeRec.stummAb = 1;
    FakeRec.stummAnzahl = 1;
    const log = { ends: [] as string[] };
    const e = new se.Spracherkennung({ micId: "p", klasse: () => FakeRec, anzeige: () => ({ listening: () => {}, interim: () => {}, error: () => {}, wartet: () => {}, transcript: () => {}, end: (t) => log.ends.push(t) }) });
    e.begin();
    await tick(WACHE_MS + 10);
    last().sag("Geheimnis 1234");
    e.stop();
    await tick();
    const lines = (JSON.parse(win.localStorage.getItem("wasgibts.mikroprotokoll")!).entries as { text: string }[]).map((x) => x.text);
    expect(lines.some((l) => l.startsWith("Wachhund: kein Start"))).toBe(true);
    expect(lines).toContain("Zuhören: zweiter Start");
    expect(lines.join(" ")).not.toMatch(/Geheimnis|1234/);
    expect(log.ends).toEqual(["Geheimnis 1234"]);
  });
});
