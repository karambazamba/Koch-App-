# A-033 Nachtrag Mia-Zubehör: Sonne das ganze Jahr (Wortlaut 28.10.)

- `src/lib/mia/zubehoer.ts` → `wetter()`:
  · Regen bald → „schirm“ (wie bisher, hat Vorrang).
  · Sonnig und ≥ 18 °C (ganzjährig) → „sonnenbrille“.
  · Sonnig und < 18 °C, tagsüber (nach Sonnenaufgang, vor Sonnenuntergang) → NEU „sonne“: kleine Sonne (Kreis + kurze Strahlen, Gelb #F5B82E) halb hinter Mia, oben rechts am Mia-Knopf und auf der Bühne, Strahlen drehen sich einmal sehr langsam beim Öffnen (miaMoment, prefers-reduced-motion = still).
  · Nachts nie Sonne/Sonnenbrille.
- Rangfolge bleibt: Geburtstag > Anlass > Kochen > Wetter > Jahreszeit > Tageszeit. Immer nur EIN Zubehör.
- Auf dem eckigen Logo (BrandMark) kein Zubehör, nur am runden Mia-Knopf und auf der Bühne.
- Tests: zubehoer-Tests um „sonne“ (Oktober 13 °C sonnig mittags), Sonnenbrille 19 °C im April, nachts nichts, Regen schlägt Sonne. bilder:vergleich Mia-Knopf.
- Version, PR, mergen.
