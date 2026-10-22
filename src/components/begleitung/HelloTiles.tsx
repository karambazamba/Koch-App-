"use client";

// Deko des Hallo-Bildschirms (Tafel 19): drei kleine Pastell-Kacheln, leicht
// gedreht und überlappend – Termine, Essen, Einkauf. Nur zum Anschauen
// (aria-hidden, nicht antippbar). Sie fliegen nacheinander von unten herein
// (`hello-tile`, je 120 ms); beim Start blendet `fadeOutGhost` sie weich aus,
// während die Begleitung in die Jetzt-Karte fliegt.

import type { CSSProperties, RefObject } from "react";

type Tile = { tone: "termine" | "essen" | "einkauf"; rot: number; className: string };

const TILES: Tile[] = [
  { tone: "termine", rot: -7, className: "left-0 top-2 w-[47%]" },
  { tone: "essen", rot: 5, className: "right-0 top-0 w-[50%]" },
  { tone: "einkauf", rot: -3, className: "left-[22%] bottom-[28px] w-[56%] pb-9 pt-2.5" },
];

function TileBody({ tone }: { tone: Tile["tone"] }) {
  if (tone === "termine")
    return (
      <div className="flex flex-col gap-1 text-[13px] leading-tight">
        <span>
          <b className="font-extrabold text-tile-accent">08:00</b> Kita
        </span>
        <span>
          <b className="font-extrabold text-tile-accent">16:00</b> Zahnarzt
        </span>
      </div>
    );
  if (tone === "essen")
    return (
      <div className="flex items-center gap-2">
        {/* Eingebautes Bild des Beispielgerichts (wie im Beispiel-Tag) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/demo/gericht.webp" alt="" className="h-10 w-10 shrink-0 rounded-field object-cover" />
        <span className="text-[13px] font-bold leading-tight">Pasta mit Burrata</span>
      </div>
    );
  return <span className="block text-center text-[13px] font-semibold text-tile-accent">Milch · Brot · Äpfel</span>;
}

/** `visible(i)`: Kachel i fliegt herein (vorher unsichtbar); `still` = ohne Bewegung, gleich da */
export function HelloTiles({ visible, still, tilesRef }: { visible: (i: number) => boolean; still: boolean; tilesRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={tilesRef} className="relative mx-auto h-[178px] w-[300px] max-w-full [@media(max-height:620px)]:h-[150px] [@media(max-height:620px)]:w-[262px]" aria-hidden>
      {TILES.map((t, i) => (
        <div
          key={t.tone}
          data-tone={t.tone}
          className={`absolute rounded-card bg-tile px-3.5 py-3 text-ink shadow-float ${t.className} ${still ? "" : visible(i) ? "hello-tile" : "opacity-0"}`}
          style={{ rotate: `${t.rot}deg`, "--rot": `${t.rot}deg` } as CSSProperties}
        >
          <TileBody tone={t.tone} />
        </div>
      ))}
    </div>
  );
}

/** Kacheln beim Start weich ausblenden – als Kopie, die den Bildschirmwechsel überdauert */
export function fadeOutGhost(el: HTMLElement | null) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const ghost = el.cloneNode(true) as HTMLElement;
  for (const node of [ghost, ...ghost.querySelectorAll<HTMLElement>("*")]) node.style.animation = "none";
  Object.assign(ghost.style, { position: "fixed", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: "0", zIndex: "45", pointerEvents: "none", transition: "opacity 280ms ease-out" });
  document.body.appendChild(ghost);
  requestAnimationFrame(() => requestAnimationFrame(() => (ghost.style.opacity = "0")));
  window.setTimeout(() => ghost.remove(), 360);
}
