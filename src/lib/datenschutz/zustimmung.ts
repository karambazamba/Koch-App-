// Wann „Bevor’s losgeht“ vor der App steht (rein, für ZustimmungGate).

/** Hier nie davor: Rechtstexte bleiben lesbar, Anmelden/Beitreten/Einladung haben ihr eigenes Häkchen */
const FREI = ["/datenschutz", "/impressum", "/nutzungsbedingungen", "/anmelden", "/beitreten"];

export function zustimmungNoetig(pathname: string, erteilt: boolean): boolean {
  if (erteilt) return false;
  return !FREI.includes(pathname) && !pathname.startsWith("/e/");
}
