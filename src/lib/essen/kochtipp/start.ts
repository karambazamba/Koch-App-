// Kochidee: woran Mia erkennt, dass jemand eine Kochidee möchte – klein
// gehalten, weil die Begleitung (Layout) es früh braucht.

/** „Kochidee“, „Kochtipp“, „Was soll ich kochen?“ – öffnet die Kochidee („Ich hab noch …“ nur in der Kochidee selbst, sonst ist es Vorrat) */
export const isKochtippRequest = (t: string) => /koch-?(?:tipp|idee)|^was\s+soll\s+ich\s+(?:heute\s+|jetzt\s+)?kochen\??$/i.test(t.trim());
