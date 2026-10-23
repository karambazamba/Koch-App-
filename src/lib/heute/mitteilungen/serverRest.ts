// Kleine Hilfe für die Push-Routen: Supabase-REST mit einem Schlüssel, den
// die Route mitgibt (geheimer Schlüssel nur in der Route, nie hier gelesen).
// Nur Server.

export type Rest = <T = unknown>(path: string, init?: { method?: string; body?: unknown; prefer?: string }) => Promise<{ ok: boolean; status: number; data: T | null }>;

export function restClient(url: string, apikey: string, bearer: string = apikey): Rest {
  return async (path, init = {}) => {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      method: init.method ?? "GET",
      headers: { apikey, authorization: `Bearer ${bearer}`, "content-type": "application/json", ...(init.prefer ? { prefer: init.prefer } : {}) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data };
  };
}

/** Zufälliges Zeichen (für den Cron-Aufruf) */
export function randomToken(bytes = 24): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Buffer.from(a).toString("base64url");
}
