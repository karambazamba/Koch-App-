// Versand der Mitteilungen (jede Minute von pg_cron über pg_net, Tafel 77).
// Zugang nur mit dem Cron-Zeichen aus push_config (vom Server selbst erzeugt)
// oder CRON_SECRET. Liest Abos und Einträge mit dem geheimen Schlüssel (nur
// hier; dazu die Anzeigenamen des Haushalts), plant mit `planPushes` und schickt per Web Push. Abgelaufene Abos
// (404/410) werden entfernt. Nichts Inhaltliches wird protokolliert.
// A-069: jeder Lauf landet mit Technik-Zahlen in `push_laeufe` (auch ohne
// Abos – daran sieht die App, dass der Zeitplan läuft), jeder Versand mit
// Art und Status in `push_protokoll`; fällige „Test: in 1 Minute“ aus
// `push_tests` gehen mit raus.

import { timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { berlinTime, now } from "@/lib/core/now";
import { supabasePublic, supabaseSecret } from "@/lib/konten/serverEnv";
import { restClient } from "@/lib/heute/mitteilungen/serverRest";
import { planPushes, proactiveAbos, sentKeys, type PushAbo, type PushEntryRow, type PushMessage } from "@/lib/heute/mitteilungen/versand";
import { personName } from "@/lib/konten/namen";
import { artVon, testNachricht } from "@/lib/heute/mitteilungen/pushStatus";
import { helperName } from "@/lib/einstellungen/profile";

export const maxDuration = 60;

type Config = { vapid_public: string; vapid_private: string; cron_token: string };
type Abo = PushAbo & { endpoint: string; p256dh: string; auth: string };

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function POST(request: Request) {
  const pub = supabasePublic();
  const key = supabaseSecret();
  if (!pub || !key) return Response.json({ error: "nicht_eingerichtet" }, { status: 503 });
  const rest = restClient(pub.url, key);
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  try {
    const config = (await rest<Config[]>("push_config?select=vapid_public,vapid_private,cron_token&id=eq.1")).data?.[0];
    const cron = process.env.CRON_SECRET;
    if (!given || !((config && same(given, config.cron_token)) || (cron && same(given, cron)))) return Response.json({ error: "nein" }, { status: 401 });
    if (!config) return Response.json({ sent: 0 });
    const nowIso = now().toISOString();
    const abos = (await rest<Abo[]>("push_abos?select=id,user_id,household_id,settings,endpoint,p256dh,auth&household_id=not.is.null")).data ?? [];
    const lauf = { abos: abos.length, gesendet: 0, fehler: 0 };
    const tests = abos.length ? ((await rest<{ id: string; abo_id: string }[]>(`push_tests?select=id,abo_id&faellig=lte.${nowIso}`)).data ?? []) : [];
    let plan: PushMessage[] = [];
    if (abos.length) {
      const households = [...new Set(abos.map((a) => a.household_id))].join(",");
      const select = "entries?select=household_id,id,typ,raum,besitzer,erstellt,geaendert,data&geloescht=eq.false";
      const rows = (await rest<PushEntryRow[]>(`${select}&typ=in.(termin,aufgabe,pinnwand,memo,unterwegs)&household_id=in.(${households})`)).data ?? [];
      // Einkauf unterwegs: nur, was gerade frisch auf die Liste kam (für die Person im Laden)
      const fresh = new Date(now().getTime() - 15 * 60_000).toISOString();
      const added = (await rest<PushEntryRow[]>(`${select}&typ=eq.einkauf&raum=eq.familie&erstellt=gte.${fresh}&household_id=in.(${households})`)).data ?? [];
      const names = Object.fromEntries(((await rest<{ user_id: string; display_name: string }[]>(`members?select=user_id,display_name&household_id=in.(${households})`)).data ?? []).map((m) => [m.user_id, personName(m.display_name)]));
      const since = new Date(now().getTime() - 2 * 86_400_000).toISOString();
      const sentRows = (await rest<{ abo_id: string; key: string }[]>(`push_gesendet?select=abo_id,key&sent_at=gte.${since}`)).data ?? [];
      const t = berlinTime();
      plan = planPushes({ abos, rows: [...rows, ...added], names, today: t.iso, minute: t.minutes, nowMs: now().getTime(), sent: sentKeys(sentRows), proactiveToday: proactiveAbos(sentRows, t.iso) });
    }
    const byId = new Map(abos.map((a) => [a.id, a]));
    for (const x of tests) {
      const abo = byId.get(x.abo_id);
      if (abo) plan.push(testNachricht(abo.id, x.id, abo.settings?.name?.trim() || helperName(null)));
    }
    const done: { key: string; abo_id: string }[] = [];
    const gone: string[] = [];
    const protokoll: { household_id: string | null; art: string; status: string }[] = [];
    if (plan.length) webpush.setVapidDetails("mailto:mia@karamba-eis.de", config.vapid_public, config.vapid_private);
    for (const m of plan) {
      const abo = byId.get(m.aboId);
      if (!abo) continue;
      const art = artVon(m.key);
      try {
        await webpush.sendNotification({ endpoint: abo.endpoint, keys: { p256dh: abo.p256dh, auth: abo.auth } }, JSON.stringify(m.payload), { TTL: 3600, urgency: "high" });
        done.push({ key: m.key, abo_id: abo.id });
        protokoll.push({ household_id: abo.household_id, art, status: "gesendet" });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        const weg = status === 404 || status === 410;
        if (weg) gone.push(abo.id);
        lauf.fehler++;
        protokoll.push({ household_id: abo.household_id, art, status: weg ? "abgelaufen" : "fehler" });
      }
    }
    lauf.gesendet = done.length;
    if (done.length) await rest("push_gesendet", { method: "POST", prefer: "resolution=ignore-duplicates,return=minimal", body: done });
    if (tests.length) await rest(`push_tests?id=in.(${tests.map((x) => x.id).join(",")})`, { method: "DELETE" });
    if (gone.length) await rest(`push_abos?id=in.(${gone.join(",")})`, { method: "DELETE" });
    if (protokoll.length) await rest("push_protokoll", { method: "POST", prefer: "return=minimal", body: protokoll });
    await rest("push_laeufe", { method: "POST", prefer: "return=minimal", body: lauf });
    // Aufräumen: Läufe einen Tag, Protokoll sieben Tage
    if (new Date(nowIso).getUTCMinutes() === 0) {
      await rest(`push_laeufe?at=lt.${new Date(now().getTime() - 86_400_000).toISOString()}`, { method: "DELETE" });
      await rest(`push_protokoll?at=lt.${new Date(now().getTime() - 7 * 86_400_000).toISOString()}`, { method: "DELETE" });
    }
    return Response.json({ sent: done.length });
  } catch {
    return Response.json({ error: "offline" }, { status: 502 });
  }
}
