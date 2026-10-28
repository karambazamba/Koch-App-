"use client";

// Gesten an der Kühlschranktür (Tafel 123), wie das Kachel-Ziehen der
// Startseite: lange drücken (≈ 0,45 s) hebt den Zettel an. Loslassen ohne
// Bewegung = Fenster (Größe, Nach oben, Nur für mich, Erledigt); halten und
// ziehen = der Zettel folgt dem Finger, die anderen rutschen weich nach
// (0,8 s, nur transform, „Bewegung reduzieren“ = ohne Gleiten). Losgelassen
// wird die neue Reihenfolge gespeichert. Kurzes Antippen bleibt beim Zettel
// (Menü bzw. Foto groß). Vor dem Anheben gewinnt Scrollen (Bewegung > 10 px
// bricht das Halten ab); nach dem Anheben steht die Seite still (nicht-
// passives touchmove) und Wischen wechselt keine Seite (`data-no-swipe`).

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { moveInList } from "@/lib/pinnwand";
import { buzz } from "@/components/heute/actions";

const HALTEN_MS = 450;
const WACKEL_PX = 10;
const ZIEH_PX = 6;
const GLEITEN = "transform 0.8s cubic-bezier(.16,1,.3,1)";

type Press = {
  id: string;
  pointer: number;
  x: number;
  y: number;
  timer: ReturnType<typeof setTimeout> | null;
  lifted: boolean;
  dragging: boolean;
  /** Fingerpunkt im Zettel beim Anheben */
  grabX: number;
  grabY: number;
  /** zuletzt gesetzte Verschiebung des gezogenen Zettels */
  tx: number;
  ty: number;
  /** Ziel, über dem der Finger zuletzt war (gegen Hin- und Herspringen) */
  over: string | null;
  /** letzter Fingerpunkt */
  lastX: number;
  lastY: number;
};

const reduced = () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

export function useWandGesten<T extends { id: string }>({ items, enabled, onHold, onDrop }: { items: T[]; enabled: boolean; onHold: (id: string) => void; onDrop: (id: string, to: number) => void }) {
  const [preview, setPreview] = useState<string[] | null>(null);
  const [lifted, setLifted] = useState<string | null>(null);
  const press = useRef<Press | null>(null);
  const suppress = useRef(false);
  const container = useRef<HTMLDivElement>(null);
  /** Die Zettel der Wand (je `data-flip` = ID) – frisch aus dem DOM, nie während des Renderns */
  const elements = () => new Map([...(container.current?.querySelectorAll<HTMLElement>("[data-flip]") ?? [])].map((el) => [el.dataset.flip ?? "", el]));
  const idAt = (target: EventTarget | null) => (target instanceof Element ? (target.closest<HTMLElement>("[data-flip]")?.dataset.flip ?? null) : null);
  const pos = useRef(new Map<string, { x: number; y: number }>());

  const byId = new Map(items.map((i) => [i.id, i]));
  const order = preview ? [...preview.map((id) => byId.get(id)).filter((i): i is T => Boolean(i)), ...items.filter((i) => !preview.includes(i.id))] : items;
  const signature = order.map((i) => i.id).join("|");

  // Seite steht still, solange ein Zettel angehoben ist (iPhone: nur ein nicht-passives touchmove hält sie fest)
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const halt = (e: TouchEvent) => {
      if (press.current?.lifted) e.preventDefault();
    };
    el.addEventListener("touchmove", halt, { passive: false });
    return () => el.removeEventListener("touchmove", halt);
  }, []);

  /** Gezogenen Zettel unter den Finger legen (Layout-Platz minus aktuelle Verschiebung) */
  const follow = (p: Press, x: number, y: number) => {
    const el = elements().get(p.id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    p.lastX = x;
    p.lastY = y;
    const tx = x - p.grabX - (r.left - p.tx);
    const ty = y - p.grabY - (r.top - p.ty);
    p.tx = tx;
    p.ty = ty;
    el.style.transition = "none";
    el.style.transform = `translate(${tx}px, ${ty}px)`;
    el.style.zIndex = "30";
  };

  // Nachrutschen (FLIP): wer seinen Platz wechselt, gleitet vom alten an den neuen
  useLayoutEffect(() => {
    const box = container.current?.getBoundingClientRect();
    if (!box) return;
    const dragged = press.current?.dragging ? press.current.id : null;
    const next = new Map<string, { x: number; y: number }>();
    const moves: [HTMLElement, number, number][] = [];
    for (const [id, el] of elements()) {
      if (id === dragged) continue;
      el.style.transition = "none";
      el.style.transform = "";
      const r = el.getBoundingClientRect();
      const now = { x: r.left - box.left, y: r.top - box.top };
      next.set(id, now);
      const before = pos.current.get(id);
      if (before && (Math.abs(before.x - now.x) > 1 || Math.abs(before.y - now.y) > 1)) moves.push([el, before.x - now.x, before.y - now.y]);
    }
    pos.current = next;
    if (dragged && press.current) follow(press.current, press.current.lastX, press.current.lastY);
    if (reduced() || !moves.length) return;
    for (const [el, dx, dy] of moves) el.style.transform = `translate(${dx}px, ${dy}px)`;
    const raf = requestAnimationFrame(() => {
      for (const [el] of moves) {
        el.style.transition = GLEITEN;
        el.style.transform = "";
      }
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur, wenn sich die Reihenfolge ändert
  }, [signature]);

  const end = (p: Press) => {
    if (p.timer) clearTimeout(p.timer);
    press.current = null;
    const el = elements().get(p.id);
    if (el) {
      el.style.zIndex = "";
      el.style.transition = reduced() ? "none" : GLEITEN;
      el.style.transform = "";
    }
    setLifted(null);
  };

  const handlers = {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      const id = idAt(e.target);
      const el = id ? elements().get(id) : undefined;
      if (!enabled || !id || !el || e.button > 0 || press.current) return;
      const p: Press = { id, pointer: e.pointerId, x: e.clientX, y: e.clientY, timer: null, lifted: false, dragging: false, grabX: 0, grabY: 0, tx: 0, ty: 0, over: null, lastX: e.clientX, lastY: e.clientY };
      suppress.current = false;
      p.timer = setTimeout(() => {
        if (press.current !== p) return;
        const r = el.getBoundingClientRect();
        p.lifted = true;
        p.grabX = p.x - r.left;
        p.grabY = p.y - r.top;
        try {
          el.setPointerCapture(p.pointer);
        } catch {
          // Zeiger schon weg
        }
        buzz();
        setLifted(id);
      }, HALTEN_MS);
      press.current = p;
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const p = press.current;
      if (!p || p.pointer !== e.pointerId) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (!p.lifted) {
        if (Math.hypot(dx, dy) > WACKEL_PX) end(p);
        return;
      }
      if (!p.dragging && Math.hypot(dx, dy) < ZIEH_PX) return;
      p.dragging = true;
      follow(p, e.clientX, e.clientY);
      // Über welchem anderen Zettel ist der Finger?
      let over: string | null = null;
      for (const [other, el] of elements()) {
        if (other === p.id) continue;
        const r = el.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) over = other;
      }
      if (!over || over === p.over) return;
      p.over = over;
      const ids = order.map((i) => i.id);
      setPreview(moveInList(ids.map((x) => ({ id: x })), p.id, ids.indexOf(over)).map((x) => x.id));
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      const p = press.current;
      if (!p || p.pointer !== e.pointerId) return;
      if (p.lifted) suppress.current = true;
      if (p.dragging) {
        const to = order.findIndex((i) => i.id === p.id);
        onDrop(p.id, to);
      } else if (p.lifted) onHold(p.id);
      end(p);
      setPreview(null);
    },
    onPointerCancel: () => {
      const p = press.current;
      if (p) end(p);
      setPreview(null);
    },
    onClickCapture: (e: { stopPropagation(): void; preventDefault(): void }) => {
      if (!suppress.current) return;
      suppress.current = false;
      e.stopPropagation();
      e.preventDefault();
    },
  };

  return { order, lifted, container, handlers };
}
