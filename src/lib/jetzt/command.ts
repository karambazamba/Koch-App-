// "Blende die Jetzt-Karte aus" / "Zeig die Jetzt-Karte wieder" – auch die
// alten Sätze zur Startseite ("Lass die Startseite immer gleich" → aus,
// "Startseite soll mitdenken" → an). Rein, für die Regeln ohne KI und den
// Testmodus. null = kein solcher Satz.

export function jetztCommand(text: string): boolean | null {
  const t = text.trim();
  const card = /\bjetzt[\s-]?karte\b/i.test(t);
  const home = /\bstartseite\b/i.test(t);
  if (card && /\b(aus|weg|ausblenden|ausschalten|verstecken|nicht\s+mehr|brauch\w*\s+(ich\s+)?nicht)\b/i.test(t)) return false;
  if (card && /\b(an|zeig\w*|einblenden|einschalten|wieder|zurück)\b/i.test(t)) return true;
  if (home && /\b(immer\s+gleich|gleich\s+bleiben|bleibt\s+gleich|nicht\s+(mehr\s+)?mitdenk\w*)\b/i.test(t)) return false;
  if (home && /\b(mitdenk\w*|denk\w*\s+mit)\b/i.test(t) && !/\bnicht\b/i.test(t)) return true;
  return null;
}
