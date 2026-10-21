"use client";

import { useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";

export type RowAction = { label: string; icon: LucideIcon; tone?: "danger"; onClick: () => void };

const ACTION_WIDTH = 84;

/**
 * Zeile mit Wischen nach links (Aktionen dahinter) und langem Drücken.
 * Ein Wisch löst keinen Klick aus.
 */
export function SwipeRow({
  actions,
  onLongPress,
  children,
  label,
}: {
  actions: RowAction[];
  onLongPress?: () => void;
  children: React.ReactNode;
  label: string;
}) {
  const width = actions.length * ACTION_WIDTH;
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; dx: number; moved: boolean; timer: ReturnType<typeof setTimeout> | null } | null>(null);
  const suppressClick = useRef(false);

  const end = () => {
    const s = start.current;
    if (s?.timer) clearTimeout(s.timer);
    start.current = null;
    setDragging(false);
    if (s?.moved) setDx((v) => (v < -width / 2 ? -width : 0));
  };

  return (
    <li className="relative overflow-hidden border-b border-line bg-surface last:border-b-0" aria-label={label}>
      <div className="absolute inset-y-0 right-0 flex" style={{ width }} aria-hidden={dx === 0}>
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              type="button"
              tabIndex={dx === 0 ? -1 : 0}
              onClick={() => {
                setDx(0);
                a.onClick();
              }}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-bold ${
                a.tone === "danger" ? "bg-danger-soft text-danger" : "bg-fill text-muted"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
              {a.label}
            </button>
          );
        })}
      </div>
      <div
        className={`relative bg-surface ${dragging ? "" : "transition-transform duration-200"}`}
        style={{ transform: `translateX(${dx}px)`, touchAction: "pan-y" }}
        onPointerDown={(e) => {
          const timer = onLongPress
            ? setTimeout(() => {
                if (start.current && !start.current.moved) {
                  suppressClick.current = true;
                  onLongPress();
                }
              }, 500)
            : null;
          start.current = { x: e.clientX, y: e.clientY, dx, moved: false, timer };
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s) return;
          const ddx = e.clientX - s.x;
          if (!s.moved && Math.abs(ddx) > 10 && Math.abs(ddx) > Math.abs(e.clientY - s.y)) {
            s.moved = true;
            if (s.timer) clearTimeout(s.timer);
            setDragging(true);
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }
          if (s.moved) setDx(Math.max(-width, Math.min(0, s.dx + ddx)));
        }}
        onPointerUp={() => {
          if (start.current?.moved) suppressClick.current = true;
          end();
        }}
        onPointerCancel={end}
        // Links in der Zeile nicht als Bild/Link ziehen (sonst bricht das Wischen mit der Maus ab)
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          if (suppressClick.current || dx !== 0) {
            e.preventDefault();
            e.stopPropagation();
            suppressClick.current = false;
            if (dx !== 0) setDx(0);
          }
        }}
      >
        {children}
      </div>
    </li>
  );
}

