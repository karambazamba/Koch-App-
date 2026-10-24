// Nur Server: Signatur der Resend-Webhooks prüfen (Svix-Verfahren). Geheimnis
// RESEND_WEBHOOK_SECRET („whsec_…“) nur aus Vercel – nie im Code, nie im Log.
// Signiert wird `${id}.${timestamp}.${body}` mit HMAC-SHA256; Kopfzeile
// „svix-signature: v1,<base64> v1,<base64>“. Höchstens 5 Minuten alt.

import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_S = 300;

export function verifySvix(body: string, headers: { id: string | null; timestamp: string | null; signature: string | null }, secret: string, nowS = Math.floor(Date.now() / 1000)): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature || !secret) return false;
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowS - ts) > TOLERANCE_S) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${headers.id}.${headers.timestamp}.${body}`).digest();
  return headers.signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
