// Mails an Mia – Eingang (Resend „Receiving“-Webhook). Nur annehmen, was
// sicher ist: Signatur geprüft (RESEND_WEBHOOK_SECRET), an eine aktive
// Mia-Adresse, von jemandem aus der Familie weitergeleitet, keine Werbung.
// Gespeichert wird nur der Vorschlag (Domain, Betreff, Auszug) – nie die
// Rohmail; Abgelaufenes wird bei jedem Eingang weggeräumt. Nichts wird
// protokolliert. Testmodus (KONTEN_TEST=1): Test-Backend statt Datenbank.

import { kontenTest, supabasePublic, supabaseSecret } from "@/lib/konten/serverEnv";
import { testKonten } from "@/lib/konten/testServer";
import { verifySvix } from "@/lib/mails/svix";
import { mailAusWebhook, verarbeite } from "@/lib/mails/verarbeiten";
import { ourLocalPart } from "@/lib/mails/adresse";
import { todayIso } from "@/lib/core/now";

const MAX_BYTES = 5_000_000;

export async function POST(request: Request) {
  const body = await request.text();
  if (body.length > MAX_BYTES) return Response.json({ ok: true, verworfen: "zu_gross" });
  const secret = process.env.RESEND_WEBHOOK_SECRET ?? "";
  const headers = { id: request.headers.get("svix-id"), timestamp: request.headers.get("svix-timestamp"), signature: request.headers.get("svix-signature") };
  if (!kontenTest()) {
    if (!secret) return Response.json({ error: "nicht_eingerichtet" }, { status: 503 });
    if (!verifySvix(body, headers, secret)) return Response.json({ error: "signatur" }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return Response.json({ error: "kaputt" }, { status: 400 });
  }
  const mail = mailAusWebhook(payload);
  const local = mail ? ourLocalPart(mail.to) : null;
  // Fremde oder unbekannte Adressen: still annehmen (200), damit nichts erneut geschickt wird
  if (!mail || !local) return Response.json({ ok: true });
  if (kontenTest()) return Response.json(testKonten({ action: "mail_eingang", mail, local }));
  const pub = supabasePublic();
  const key = supabaseSecret();
  if (!pub || !key) return Response.json({ error: "nicht_eingerichtet" }, { status: 503 });
  const rest = (path: string, init: RequestInit = {}) => fetch(`${pub.url}/rest/v1/${path}`, { ...init, headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", ...(init.headers ?? {}) } });
  try {
    await rest(`mail_items?expires_at=lt.${encodeURIComponent(new Date(Date.now()).toISOString())}`, { method: "DELETE" });
    const addr = ((await (await rest(`mail_addresses?local_part=eq.${encodeURIComponent(local)}&active=eq.true&select=household_id,user_id,room`)).json()) as { household_id: string; user_id: string | null; room: "familie" | "arbeit" }[])[0];
    if (!addr) return Response.json({ ok: true });
    const members = (await (await rest(`members?household_id=eq.${addr.household_id}&select=user_id`)).json()) as { user_id: string }[];
    const allowed = addr.room === "arbeit" ? members.filter((m) => m.user_id === addr.user_id) : members;
    const memberEmails = (
      await Promise.all(allowed.map(async (m) => ((await (await fetch(`${pub.url}/auth/v1/admin/users/${m.user_id}`, { headers: { apikey: key, authorization: `Bearer ${key}` } })).json()) as { email?: string }).email ?? ""))
    ).filter(Boolean);
    const owner = addr.room === "arbeit" ? `&user_id=eq.${addr.user_id}` : "&user_id=is.null";
    const learned = ((await (await rest(`mail_senders?household_id=eq.${addr.household_id}&room=eq.${addr.room}&decision=eq.ja${owner}&select=sender`)).json()) as { sender: string }[]).map((s) => s.sender);
    const since = `${todayIso()}T00:00:00Z`;
    const count = await rest(`mail_items?household_id=eq.${addr.household_id}&created_at=gte.${encodeURIComponent(since)}&select=id`, { method: "HEAD", headers: { prefer: "count=exact" } });
    const todayCount = Number(count.headers.get("content-range")?.split("/")[1] ?? 0) || 0;
    const result = verarbeite(mail, { room: addr.room, memberEmails, learned, todayCount, today: todayIso() });
    if (result.action === "verwerfen") return Response.json({ ok: true });
    const it = result.item;
    await rest("mail_items", {
      method: "POST",
      body: JSON.stringify({ household_id: addr.household_id, user_id: addr.room === "arbeit" ? addr.user_id : null, room: addr.room, sender_domain: it.senderDomain, sender_key: it.senderKey, subject: it.subject, excerpt: it.excerpt, vorschlaege: it.vorschlaege, attachments: it.attachments, confirmation: it.confirmation, expires_at: new Date(Date.now() + it.hours * 3_600_000).toISOString() }),
    });
    if (it.senderKey) {
      const filter = `household_id=eq.${addr.household_id}&room=eq.${addr.room}&sender=eq.${encodeURIComponent(it.senderKey)}${owner}`;
      const known = (await (await rest(`mail_senders?${filter}&select=count`)).json()) as { count: number }[];
      if (known[0]) await rest(`mail_senders?${filter}`, { method: "PATCH", body: JSON.stringify({ count: known[0].count + 1, updated_at: new Date(Date.now()).toISOString() }) });
      else await rest("mail_senders", { method: "POST", body: JSON.stringify({ household_id: addr.household_id, user_id: addr.room === "arbeit" ? addr.user_id : null, room: addr.room, sender: it.senderKey, count: 1 }) });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "offline" }, { status: 502 });
  }
}
