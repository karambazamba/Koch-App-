"use client";

// Mitteilungen auf dem Gerät: Erlaubnis lesen und erfragen (nur nach Mias
// „Ja, gern“, im Tipp – Pflicht bei iOS), und eine Erinnerung über den
// Service Worker zeigen. Antippen öffnet den Eintrag (sw.js
// „notificationclick“). Mias Frage wird über `askForNotifications` angestoßen
// und von `NotifyHost` gezeigt.

import { useSyncExternalStore } from "react";
import { isIosBrowserTab } from "@/lib/core/homescreen";
import { BEGLEITUNG_PUSH_ICON } from "@/lib/core/app";
import type { AskMoment, Permission } from "@/lib/heute/mitteilungen/einstellungen";

export function notifyPermission(): Permission {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  return Notification.permission;
}

export const iosTab = () => isIosBrowserTab();

/** Systemabfrage – nur aus einem Tipp heraus aufrufen */
export async function requestNotifyPermission(): Promise<Permission> {
  if (notifyPermission() === "unsupported") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return notifyPermission();
  }
}

/** Eine Mitteilung zeigen (Absender Mia), `tag` verhindert Doppelte */
export async function showNotify(title: string, body: string, href: string, tag: string): Promise<boolean> {
  if (notifyPermission() !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, { body, tag, icon: BEGLEITUNG_PUSH_ICON, badge: BEGLEITUNG_PUSH_ICON, data: { href } });
    return true;
  } catch {
    return false;
  }
}

type Listener = (moment: AskMoment) => void;
const listeners = new Set<Listener>();

export function onAskForNotifications(l: Listener) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

let busy = false;
let pending: AskMoment | null = null;

/** Im passenden Moment fragen (erster Termin mit Uhrzeit, erste Pinnwand-Nachricht) – nie mitten ins Tippen */
export function askForNotifications(moment: AskMoment) {
  if (busy) {
    pending ??= moment;
    return;
  }
  for (const l of listeners) l(moment);
}

/** Schnelleingabe offen: Frage aufheben, bis sie zu ist */
export function holdNotifyAsk(on: boolean) {
  busy = on;
  if (on || !pending) return;
  const moment = pending;
  pending = null;
  askForNotifications(moment);
}

const noop = () => () => {};

/** Erlaubnis für die Oberfläche (erst im Browser bekannt) */
export function useNotifyPermission(): Permission | null {
  return useSyncExternalStore(noop, notifyPermission, () => null);
}
