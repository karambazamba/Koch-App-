"use client";

import { useEffect } from "react";
import { buttonClass } from "./styles";

/**
 * Kurze Rückfrage als kleines Fenster (statt window.confirm): Frage, evtl.
 * ein Satz dazu, zwei Knöpfe. Escape oder Tippen daneben = Abbrechen.
 */
export function ConfirmDialog({
  title,
  text,
  confirmLabel,
  cancelLabel = "Abbrechen",
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  text?: string;
  confirmLabel: string;
  /** Beschriftung des zweiten Knopfs (Standard "Abbrechen") */
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="alertdialog" aria-modal aria-label={title}>
      <button type="button" aria-label="Rückfrage schließen" tabIndex={-1} onClick={onCancel} className="absolute inset-0 bg-black/40" />
      <div className="relative mb-[env(safe-area-inset-bottom)] flex w-full max-w-sm flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-sheet">
        <div className="flex flex-col gap-1">
          <p className="text-lg font-bold">{title}</p>
          {text && <p className="text-base text-muted">{text}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className={buttonClass("secondary", "lg")}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={buttonClass(danger ? "danger" : "primary", "lg")} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
