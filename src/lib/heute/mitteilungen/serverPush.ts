"use client";

// Gerät beim Server für Web Push anmelden (Tafel 77, Teil 2) – nur mit
// Erlaubnis, Konto und Supabase. Schickt das Abo und die Einstellungen des
// Geräts (Arten, Pause, Tagesablauf, Absender), damit Erinnerungen auch bei
// geschlossener App kommen. Ohne Konto bleibt alles auf dem Gerät.

import { getBackend } from "@/lib/konten/backend";
import { notifyPermission } from "@/lib/heute/mitteilungen/geraet";
import type { AboSettings } from "@/lib/heute/mitteilungen/versand";

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

let last = "";

/** Abo anlegen bzw. auffrischen; `false` = gerade nicht möglich (kein Konto, offline …) */
export async function syncPushSubscription(settings: AboSettings): Promise<boolean> {
  if (notifyPermission() !== "granted" || !("PushManager" in window)) return false;
  const backend = await getBackend();
  if (!backend || backend.mode !== "supabase") return false;
  const token = await backend.accessToken();
  if (!token) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const res = await fetch("/api/push/schluessel");
      if (!res.ok) return false;
      const { key } = (await res.json()) as { key?: string };
      if (!key) return false;
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
    }
    const body = JSON.stringify({ subscription: sub.toJSON(), settings });
    if (body === last) return true;
    const saved = await fetch("/api/push/abo", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body });
    if (saved.ok) last = body;
    return saved.ok;
  } catch {
    return false;
  }
}
