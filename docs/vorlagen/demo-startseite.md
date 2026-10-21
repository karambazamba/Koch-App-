# Vorlage: Startseite „Heute“ – Beispiel-Tag

Aufbau, Größen und Farben für den Beispiel-Tag beim ersten Start (Änderung zu
„Erster Start ganz clean“, aus werbung3.png – nur das linke Handy). Inhalte sind
neutrale Beispiele, nichts Persönliches. „Mia“ = Name der Begleitung.
Avatar = bestehende Avatar-Komponente, Wetter-Symbol = bestehendes Symbol-Set;
vorhandene Tokens/Bausteine verwenden, die Werte unten sind Zielwerte.

Regeln (seit v0.38): Beispiel-Termine kommen aus einem festen Tagesplan einer
Familie (`DEMO_DAY`): 07:30 Frühstück · 08:00 Kita bringen · 10:30 Kaffeepause ·
12:30 Mittagessen · 15:00 Kinder abholen · 17:00 Einkaufen · 18:30 Kochen ·
20:15 Lieblingsserie · 22:30 Ins Bett. Gezeigt wird nur, was noch kommt
(sortiert, so viele wie die Kachel-Größe zeigt). Kommen heute weniger als 2,
gilt der Beispiel-Tag für morgen ab dem Morgen mit „MORGEN · {Wochentag}“ (auch
die Aufgaben). Beispiele: 19:55 → Lieblingsserie 20:15, Ins Bett 22:30 · 21:00 →
morgen ab 07:30 · 06:00 → Frühstück, Kita bringen, Kaffeepause … Essen: bis
18:30 + 90 Min „ESSEN · 18:30“ Pasta mit Tomaten & Burrata, danach „MORGEN · Do ·
18:30“ Ofengemüse mit Feta (mit Bild) – nie eine Uhrzeit, die schon vorbei ist.
Die Jetzt-Karte nimmt dieselben Zeiten. Beispiele
verschwinden je Kachel beim ersten eigenen Eintrag, alle nach 3 Tagen oder mit
„Jetzt leeren“; nie in Sicherung, Kalender, Push oder KI.

```html
<!-- Startseite „Heute“ – Beispiel-Tag (Bildschirmbreite ca. 350 px, Seitenrand 16 px) -->
<div class="seite">
  <nav class="reiter"><span>Kalender</span><span class="an">Heute</span><span>Essen</span></nav> <span class="zahnrad">⚙</span>
  <h1 class="gruss">Hallo, {Name}.</h1>
  <p class="datum">{Wochentag}, {Datum}</p>
  <div class="satz"><Avatar size=28 /> Das hier ist ein <b>Beispiel-Tag</b> – probier alles aus!</div>

  <!-- Reihe 1: Pinnwand S + Wetter S -->
  <div class="paar">
    <div class="kachel pinnwand">
      <div class="kopf">📌 PINNWAND <i class="neu"></i> <span class="bsp">BEISPIEL</span></div>
      <div class="zettel"><Avatar size=24 /><div><b>Willkommen! Hier hinterlasst ihr euch kleine Nachrichten 💛</b><small>Mia · gerade eben</small></div></div>
    </div>
    <div class="kachel wetter sonnig">
      <div class="kopf">WETTER</div>
      <div class="wert"><WetterSymbol heiter size=30 /> <b>14°</b></div>
      <div class="satz-klein">bleibt trocken</div>
    </div>
  </div>

  <!-- Termine (Beispiel um 16:40): 3 Kärtchen + „+1 weitere“ -->
  <div class="abschnitt">Termine <span class="bsp">BEISPIEL</span> <span class="rechts">+1 weitere <span class="plus">+</span></span></div>
  <div class="kaertchen-reihe">
    <div class="kaertchen familie"><b>17:00</b><span>Einkaufen</span><i class="box"></i></div>
    <div class="kaertchen familie"><b>18:30</b><span>Kochen</span><i class="box"></i></div>
    <div class="kaertchen familie"><b>20:15</b><span>Lieblingsserie</span><i class="box"></i></div>
  </div>   <!-- +1 weitere = „22:30 Ins Bett“ -->

  <!-- Aufgaben: Raster 2 × 2 + „+1 weitere“ -->
  <div class="abschnitt">Aufgaben <span class="bsp">BEISPIEL</span> <span class="rechts">+1 weitere <span class="plus">+</span></span></div>
  <div class="raster">
    <div class="feld erledigt"><i class="kreis">✓</i><div><b>App kennenlernen 👀</b><small>● heute</small></div></div>
    <div class="feld"><i class="kreis"></i><div><b><span class="dringend">!</span>Mia etwas fragen 🎙</b><small class="heute">● heute</small></div></div>
    <div class="feld"><i class="kreis"></i><div><b>Ersten Termin eintragen</b><small class="heute">● heute</small></div></div>
    <div class="feld"><i class="kreis"></i><div><b>Kachel verschieben</b><small>● diese Woche</small></div></div>
  </div>   <!-- +1 weitere = „Pinnwand ausprobieren“ -->

  <!-- Reihe: Essen S + Einkauf S -->
  <div class="paar">
    <div class="kachel essen"><i class="knopf">⇄</i><div class="kopf">ESSEN · 18:30</div><b>Nudeln mit Tomatensoße</b><small class="gruen">Beispiel-Idee · 20 Min</small></div>
    <div class="kachel einkauf"><i class="knopf">+</i><div class="kopf">EINKAUF · 3</div><b>Milch · Brot · Äpfel</b><small>Beispiel</small></div>
  </div>

  <div class="hinweis">✨ Beispiele verschwinden, sobald du Eigenes einträgst. <b>Jetzt leeren</b></div>

  <div class="leiste"><Avatar size=40 /><span>Sag Mia, was ansteht …</span><i class="mikro">🎙</i></div>
</div>
```

```css
.seite{background:#F7F4EF;font-family:"Plus Jakarta Sans";color:#1F1B17;padding:0 16px}
.reiter{display:flex;gap:4px;background:#EFEAE3;border-radius:14px;padding:4px}
.reiter span{flex:1;text-align:center;font:700 12.5px/1 inherit;color:#8C847C;padding:7px 0;border-radius:10px}
.reiter .an{background:#fff;color:#1F1B17}
.gruss{font:800 26px/1.1 inherit;letter-spacing:-.02em;margin-top:16px}
.datum{font-size:12.5px;color:#8C847C;margin-top:3px}
.satz{display:flex;gap:9px;align-items:center;margin-top:12px;font-size:13.5px;color:#3d362f}
.paar{display:flex;gap:8px;margin-top:14px}
.kachel{flex:1;border-radius:16px;padding:9px 11px;position:relative;min-height:72px;background:#fff}
.kopf{font:800 9.5px/1 inherit;letter-spacing:.08em;color:#8C847C}
.kachel b{display:block;font:700 12.5px/1.3 inherit;margin-top:5px}
.kachel small{display:block;font:600 10.5px/1.3 inherit;color:#8C847C;margin-top:2px}
.neu{display:inline-block;width:6px;height:6px;border-radius:50%;background:#F26B21;margin-left:4px}
.zettel{display:flex;gap:7px;align-items:flex-start;margin-top:6px}
.wetter.sonnig{background:linear-gradient(135deg,#FFF1CC,#FFF9EA)} .wetter .kopf{color:#B07A0A}
.wetter .wert b{font:800 22px/1 inherit;display:inline} .satz-klein{font:700 10.5px inherit;color:#7a5a12;margin-top:2px}
.essen{background:linear-gradient(135deg,#FFE7D6,#FFF6EF)} .gruen{color:#2f7d4f!important;font-weight:700!important}
.knopf{position:absolute;right:8px;top:8px;width:20px;height:20px;border-radius:50%;background:#FDEBDF;color:#C4531A;display:grid;place-items:center;font:800 11px inherit}
.abschnitt{display:flex;align-items:center;gap:8px;margin:18px 2px 8px;font:800 15px inherit}
.rechts{margin-left:auto;display:flex;gap:8px;align-items:center;color:#C4531A;font:800 11.5px inherit}
.plus{width:20px;height:20px;border-radius:50%;background:#FDEBDF;color:#C4531A;display:grid;place-items:center;font-size:13px}
.bsp{font:800 9px inherit;letter-spacing:.06em;color:#9A8740;background:#FFF3C4;border-radius:6px;padding:2px 6px}
.kaertchen-reihe{display:flex;gap:6px}
.kaertchen{flex:1;background:#fff;border-radius:14px;padding:7px 9px 7px 12px;position:relative;overflow:hidden}
.kaertchen:before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#F26B21}
.kaertchen b{display:block;font:800 13.5px inherit} .kaertchen span{display:block;font:600 12px inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.box{position:absolute;right:7px;top:7px;width:13px;height:13px;border-radius:5px;border:2px solid #D8D0C6}
.raster{display:grid;grid-template-columns:1fr 1fr;background:#fff;border-radius:14px;overflow:hidden}
.feld{display:flex;gap:8px;align-items:center;padding:7px 10px;border-bottom:1px solid #F0EBE4;border-right:1px solid #F0EBE4;min-height:44px}
.feld:nth-child(2n){border-right:none} .feld:nth-last-child(-n+2){border-bottom:none}
.feld b{font:700 12.5px inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
.feld small{font:700 10px inherit;color:#8C847C} .feld small.heute{color:#C4531A}
.kreis{width:16px;height:16px;border-radius:50%;border:2px solid #CFC7BD;flex:none}
.erledigt .kreis{background:#F26B21;border-color:#F26B21;color:#fff;font-size:9px;display:grid;place-items:center}
.erledigt b{text-decoration:line-through;color:#8C847C}
.dringend{display:inline-grid;place-items:center;width:13px;height:13px;border-radius:50%;background:#FDEBDF;color:#C4531A;font:900 9px inherit;margin-right:3px}
.kachel,.kaertchen,.raster{outline:1.5px dashed #E8D9A8;outline-offset:-1.5px} /* nur bei Beispielen */
.hinweis{display:flex;gap:8px;align-items:center;background:#FFFBEA;border:1.5px solid #F3E7B8;border-radius:14px;padding:8px 11px;margin-top:12px;font:600 12px inherit;color:#7a6a2a}
.hinweis b{margin-left:auto;color:#C4531A;font-weight:800}
.leiste{position:fixed;left:14px;right:14px;bottom:22px;height:56px;border-radius:28px;background:#fff;box-shadow:0 8px 24px rgba(60,40,20,.14);display:flex;align-items:center;gap:10px;padding:0 6px 0 8px}
.leiste span{flex:1;color:#8C847C;font-size:13.5px}
.mikro{width:44px;height:44px;border-radius:50%;background:#F26B21;color:#fff;display:grid;place-items:center}
```
