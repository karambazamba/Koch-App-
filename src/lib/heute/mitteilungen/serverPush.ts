"use client";

// Gerät beim Server für Web Push anmelden (Tafel 77, Teil 2) – nur mit
// Erlaubnis, Konto und Supabase. Schickt das Abo und die Einstellungen des
// Geräts (Arten, Pause, Tagesablauf, Absender), damit Erinnerungen auch bei
// geschlossener App kommen. Ohne Konto bleibt alles auf dem Gerät.
// A-069: Klappt die Anmeldung nicht, wird der genaue Grund als Code
// gemerkt (`wasgibts.pushanmeldung`, nur Code und Zeit) – für den Satz in
// Einstellungen → Mitteilungen und „Für Entwickler“.

import { createLocalStore } from "@/lib/core/localStore";
import { nowIso } from "@/lib/core/now";
import { getBackend } from "@/lib/konten/backend";
import { notifyPermission } from "@/lib/heute/mitteilungen/geraet";
import { ANMELDE_FEHLER, type AnmeldeFehler } from "@/lib/heute/mitteilungen/pushStatus";
import type { AboSettings } from "@/lib/heute/mitteilungen/versand";

type Anmeldung = { version: 1; code: AnmeldeFehler | null; at: string };

export function migrateAnmeldung(raw: unknown): Anmeldung | null {
  const r = raw as Partial<Anmeldung> | null;
  if (!r || r.version !== 1 || typeof r.at !== "string") return null;
  return { version: 1, code: ANMELDE_FEHLER.includes(r.code as AnmeldeFehler) ? (r.code as AnmeldeFehler) : null, at: r.at };
}

const store = createLocalStore("wasgibts.pushanmeldung", migrateAnmeldung);

/** Letzter Fehler-Code der Anmeldung (null = zuletzt geklappt bzw. nie versucht) */
export const letzteAnmeldung = (): Anmeldung | null => store.load();

function merke(code: AnmeldeFehler | null) {
  store.save({ version: 1, code, at: nowIso() });
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

let last = "";

/** Fehler der Schlüssel-Route → Code */
const schluesselFehler = (status: number, error: unknown): AnmeldeFehler =>
  status === 503 ? "schluessel_fehlt" : error === "tabelle_fehlt" ? "tabelle_fehlt" : error === "schluessel_ungueltig" ? "schluessel_ungueltig" : "server_fehler";

/** Fehler der Abo-Route → Code */
const aboFehler = (status: number, error: unknown): AnmeldeFehler =>
  status === 401 ? "konto_abgelehnt" : status === 403 || error === "abgelehnt" ? "abo_abgelehnt" : error === "tabelle_fehlt" ? "tabelle_fehlt" : "server_fehler";

/** Abo anlegen bzw. auffrischen; `false` = gerade nicht möglich (kein Konto, offline …) – der Grund steht in `letzteAnmeldung()` */
export async function syncPushSubscription(settings: AboSettings): Promise<boolean> {
  if (notifyPermission() !== "granted" || !("PushManager" in window)) return false;
  const backend = await getBackend();
  if (!backend || backend.mode !== "supabase") return false;
  const token = await backend.accessToken();
  if (!token) return false;
  let reg: ServiceWorkerRegistration;
  try {
    reg = await navigator.serviceWorker.ready;
  } catch {
    merke("kein_service_worker");
    return false;
  }
  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const res = await fetch("/api/push/schluessel");
      const data = (await res.json().catch(() => ({}))) as { key?: string; error?: unknown };
      if (!res.ok || !data.key) {
        merke(schluesselFehler(res.status, data.error));
        return false;
      }
      try {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(data.key) });
      } catch {
        // Apple/Google haben das Abo abgelehnt (Erlaubnis, Homescreen, alter Schlüssel)
        merke("push_abgelehnt");
        return false;
      }
    }
    const body = JSON.stringify({ subscription: sub.toJSON(), settings });
    if (body === last) return true;
    const saved = await fetch("/api/push/abo", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body });
    if (!saved.ok) {
      const data = (await saved.json().catch(() => ({}))) as { error?: unknown };
      merke(aboFehler(saved.status, data.error));
      return false;
    }
    last = body;
    merke(null);
    return true;
  } catch {
    merke("offline");
    return false;
  }
}
