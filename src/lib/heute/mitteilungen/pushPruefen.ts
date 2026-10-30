"use client";

// Erinnerungen bei geschlossener App prüfen (A-069), Gerät: Homescreen,
// Erlaubnis, Konto, Abo und was der Server weiß (`/api/push/status`); dazu
// „Test: in 1 Minute erinnern“ (`/api/push/test`, läuft über den Server) und
// das Protokoll für „Für Entwickler“. Nur Technik, nie Inhalte.

import { getBackend } from "@/lib/konten/backend";
import { notifyPermission } from "@/lib/heute/mitteilungen/geraet";
import { loadNotify } from "@/lib/heute/mitteilungen/einstellungen";
import { letzteAnmeldung, syncPushSubscription } from "@/lib/heute/mitteilungen/serverPush";
import { loadProfile } from "@/lib/einstellungen/profileStore";
import { helperName } from "@/lib/einstellungen/profile";
import { loadRoutine } from "@/lib/heute/tagesablauf";
import { now } from "@/lib/core/now";
import { anmeldeText, type AnmeldeFehler, type ServerStatus, type StatusEingang } from "@/lib/heute/mitteilungen/pushStatus";

/** Liegt die App auf dem Homescreen (eigenes Fenster)? */
function aufHomescreen(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Abo beim Server auffrischen (Einstellungen, Pause, Tagesablauf, Absender) */
export function aboAuffrischen(): Promise<boolean> {
  const s = loadNotify();
  const profile = loadProfile();
  const r = loadRoutine();
  return syncPushSubscription({ kinds: s.kinds, pause: profile?.pause ?? null, routine: { ruhe: r.ruhe, morgenBis: r.morgenBis, feierabendAb: r.feierabendAb, nachArbeit: r.nachArbeit, arbeitstage: r.arbeitstage }, name: helperName(profile ?? null) });
}

async function sitzung(): Promise<string | null> {
  const backend = await getBackend();
  return backend?.mode === "supabase" ? backend.accessToken() : null;
}

async function endpunkt(): Promise<string | null> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
    const reg = await navigator.serviceWorker.ready;
    return (await reg.pushManager.getSubscription())?.endpoint ?? null;
  } catch {
    return null;
  }
}

/** Alles für die vier Status-Zeilen */
export async function pushStatusLaden(): Promise<StatusEingang> {
  const token = await sitzung();
  const erlaubt = notifyPermission() === "granted";
  let server: ServerStatus | null = null;
  if (token) {
    if (erlaubt) await aboAuffrischen();
    const ep = await endpunkt();
    try {
      const res = await fetch(`/api/push/status${ep ? `?endpoint=${encodeURIComponent(ep)}` : ""}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
      if (res.ok) server = (await res.json()) as ServerStatus;
    } catch {
      server = null;
    }
  }
  return { homescreen: aufHomescreen(), erlaubt, konto: Boolean(token), server, anmeldung: letzteAnmeldung()?.code ?? null, nowMs: now().getTime() };
}

export type TestErgebnis = "ok" | "nicht_erlaubt" | "kein_konto" | "kein_abo" | "fehler" | AnmeldeFehler;

/** „Test: in 1 Minute erinnern“ – über den Server, damit man die App schließen kann */
export async function testErinnern(): Promise<TestErgebnis> {
  if (notifyPermission() !== "granted") return "nicht_erlaubt";
  const token = await sitzung();
  if (!token) return "kein_konto";
  if (!(await aboAuffrischen())) return letzteAnmeldung()?.code ?? "kein_abo";
  const ep = await endpunkt();
  if (!ep) return "kein_abo";
  try {
    const res = await fetch("/api/push/test", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ endpoint: ep }) });
    return res.ok ? "ok" : res.status === 404 ? "kein_abo" : "fehler";
  } catch {
    return "fehler";
  }
}

const TEST_TEXT: Record<"ok" | "nicht_erlaubt" | "kein_konto" | "kein_abo" | "fehler", string> = {
  ok: "Kommt in einer Minute. Jetzt ruhig die App schließen.",
  nicht_erlaubt: "Erst Mitteilungen erlauben, dann klappt der Test.",
  kein_konto: "Für den Test braucht es ein Konto.",
  kein_abo: "Ich konnte dieses Handy nicht anmelden. Später nochmal.",
  fehler: "Hat grad nicht geklappt. Nochmal?",
};

/** Antwort auf den Test-Knopf – bei einer Anmelde-Ursache der genaue Satz */
export const testText = (e: TestErgebnis) => (e in TEST_TEXT ? TEST_TEXT[e as keyof typeof TEST_TEXT] : anmeldeText(e as AnmeldeFehler, helperName(loadProfile() ?? null)));

/** „Für Entwickler“: letzter Fehler-Code der Anmeldung dieses Geräts */
export function anmeldeStand(): { code: string; at: string } | null {
  const a = letzteAnmeldung();
  return a ? { code: a.code ?? "ok", at: a.at } : null;
}

/** „Für Entwickler“: was der Server meldet (Migration, Zeitplan, Adresse) */
export async function serverStandLaden(): Promise<ServerStatus | null> {
  return (await pushStatusLaden()).server;
}

export type PushProtokoll = { letzterLauf: string | null; abos: number; versaende: { at: string; art: string; status: string }[] };

/** „Für Entwickler“: letzter Lauf, Abos im Haushalt, letzte 10 Versände */
export async function pushProtokollLaden(): Promise<PushProtokoll | null> {
  const token = await sitzung();
  if (!token) return null;
  try {
    const res = await fetch("/api/push/protokoll", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
    return res.ok ? ((await res.json()) as PushProtokoll) : null;
  } catch {
    return null;
  }
}
