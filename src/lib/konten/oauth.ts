// „Mit Apple/Google fortfahren“ (Tafel 22): jeder Knopf nur, wenn der Anbieter
// eingerichtet ist – Schalter über Vercel-Variablen NEXT_PUBLIC_AUTH_APPLE=1
// bzw. NEXT_PUBLIC_AUTH_GOOGLE=1 (beim Bauen eingesetzt, keine Geheimnisse).
// Start: nur E-Mail. Reihenfolge wie bekannt: Apple, Google, E-Mail.

export type OAuthProvider = "apple" | "google";

/** Launch „Mia 1.0“: nur Anmelden per E-Mail-Code – Apple/Google kommen später */
export const LAUNCH_NUR_EMAIL = true;

/** Eingeschaltete Anbieter (Reihenfolge Apple, Google); `launch`: 1.0 = keiner */
export function oauthProviders(env: Record<string, string | undefined> = { apple: process.env.NEXT_PUBLIC_AUTH_APPLE, google: process.env.NEXT_PUBLIC_AUTH_GOOGLE }, launch = LAUNCH_NUR_EMAIL): OAuthProvider[] {
  if (launch) return [];
  return (["apple", "google"] as const).filter((p) => env[p] === "1");
}

/** Wohin nach der Rückkehr (nur eigene Seiten) */
export const RETURN_KEY = "wasgibts.anmelden-zurueck";
export const safeReturn = (path: string | null | undefined) => (path && /^\/(?!\/)[\w\-/?=&.%]*$/.test(path) ? path : "/");
