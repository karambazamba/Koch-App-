"use client";

// Freundlicher Ton für abgelaufene Timer (Web Audio). Auf dem iPhone muss der
// Ton durch ein Antippen freigeschaltet werden – das passiert beim Starten
// eines Timers (`unlockTimerSound`). Geht es nicht (kein Web Audio, stumm):
// still weiter, ohne Meldung.

type Ctx = AudioContext;
let ctx: Ctx | null = null;

function audio(): Ctx | null {
  if (ctx) return ctx;
  try {
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    ctx = AC ? new AC() : null;
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Beim Antippen aufrufen (Timer starten), damit der Ton später klingen darf */
export function unlockTimerSound() {
  const c = audio();
  try {
    if (c?.state === "suspended") void c.resume();
    // Ein unhörbarer Ton schaltet iOS frei
    if (c) {
      const o = c.createOscillator();
      const g = c.createGain();
      g.gain.value = 0.0001;
      o.connect(g).connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.02);
    }
  } catch {
    // ohne Ton
  }
}

/** Ein kurzer, freundlicher Zweiklang */
export function chime() {
  const c = audio();
  if (!c) return;
  try {
    if (c.state === "suspended") void c.resume();
    const t0 = c.currentTime;
    [660, 880, 660].forEach((freq, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      const at = t0 + i * 0.22;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.25, at + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
      o.connect(g).connect(c.destination);
      o.start(at);
      o.stop(at + 0.22);
    });
  } catch {
    // ohne Ton
  }
}
