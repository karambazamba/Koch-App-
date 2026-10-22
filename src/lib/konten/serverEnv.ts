// Nur Server: Supabase-Variablen aus Vercel (Marketplace-Integration). Mehrere
// Namen werden akzeptiert (ältere „anon/service_role“ und neuere
// „publishable/secret“). Der geheime Schlüssel verlässt den Server nie.
// Test-Backend (`KONTEN_TEST=1`) nur außerhalb der Produktion.

const first = (...values: (string | undefined)[]) => values.find((v) => v && v.trim())?.trim() ?? null;

/** Öffentliche Werte (dürfen in den Browser): Adresse und anon/publishable-Schlüssel */
export function supabasePublic(): { url: string; key: string } | null {
  const url = first(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL);
  const key = first(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, process.env.SUPABASE_ANON_KEY, process.env.SUPABASE_PUBLISHABLE_KEY);
  return url && key && /^https:\/\//.test(url) ? { url: url.replace(/\/+$/, ""), key } : null;
}

/** Geheimer Schlüssel (nur für Konto löschen, Aufräumen) */
export const supabaseSecret = () => first(process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_SECRET_KEY);

/** Test-Backend für den Durchklick – nie in Produktion */
export const kontenTest = () => process.env.KONTEN_TEST === "1" && process.env.VERCEL_ENV !== "production";
