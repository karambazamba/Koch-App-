// Wochentage an EINER Stelle: lang und kurz, ab Montag (Kalender, Woche) bzw.
// ab Sonntag (Reihenfolge von Date.getDay()).

export const WEEKDAYS_MO = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"] as const;
export const WEEKDAYS_SHORT_MO = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;
export const WEEKDAYS_SO = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"] as const;
export const WEEKDAYS_SHORT_SO = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;
