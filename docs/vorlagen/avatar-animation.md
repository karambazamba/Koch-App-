# Vorlage: lebendiger Avatar der Begleitung

Quelle für die Avatar-Animationen (Aufgabe „Lebendiger Avatar“). Die Demo-Knöpfe
der ursprünglichen HTML-Vorlage gehören **nicht** in die App – die Zustände setzt
die App automatisch (nie vom Nutzer gewählt).

- Klassen statt IDs, damit mehrere Avatare auf einer Seite nicht kollidieren.
- Zustand per Attribut `data-zustand` am Wrapper; `--c` = Lieblingsfarbe.
- Größen-Klassen: `.klein` (< 44 px, z. B. Leiste), `.gross` (≥ 56 px, Chat-Kopf, Vorstellung).
- Einmalige Zustände (`begruessen`, `freuen`): nach Ende der Animation zurück auf
  `ruhig`; beim erneuten Auslösen kurz entfernen und neu setzen, damit die
  Animation neu startet.

## SVG

```html
<span class="avatar" data-zustand="ruhig" style="--c:#F26B21">
<svg viewBox="0 0 80 80" overflow="visible">
  <circle class="av-ring" cx="40" cy="40" r="40" fill="none" stroke="var(--c)" stroke-width="3"/>
  <g class="av-body">
    <circle cx="40" cy="40" r="40" fill="var(--c)"/>
    <g transform="translate(11.2 12.5) scale(.72)">
      <rect x="8" y="10" width="64" height="52" rx="20" fill="#fff"/>
      <path d="M33 60 L40 72 L47 60 Z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
      <g transform="translate(40 36) scale(1.05) translate(-40 -36)">
        <g class="av-eyes"><rect x="27.5" y="29" width="5" height="10" rx="2.5" fill="var(--c)"/><rect x="47.5" y="29" width="5" height="10" rx="2.5" fill="var(--c)"/></g>
        <g class="av-happy" fill="none" stroke="var(--c)" stroke-width="3.6" stroke-linecap="round"><path d="M26.5 35c2-3.5 5-3.5 7 0"/><path d="M46.5 35c2-3.5 5-3.5 7 0"/></g>
        <g class="av-closed" fill="none" stroke="var(--c)" stroke-width="3.6" stroke-linecap="round"><path d="M26.5 35c2 2.5 5 2.5 7 0"/><path d="M46.5 35c2 2.5 5 2.5 7 0"/></g>
        <path class="av-flat" d="M33 47h14" stroke="var(--c)" stroke-width="4.2" stroke-linecap="round"/>
        <path class="av-mouth" d="M31 45.5c5 4 13 4 18 0" stroke="var(--c)" stroke-width="4.2" fill="none" stroke-linecap="round"/>
      </g>
    </g>
  </g>
  <g class="av-zzz" fill="var(--c)" font-weight="800"><text x="64" y="12" font-size="11">z</text><text x="72" y="3" font-size="8">z</text></g>
  <g class="av-dots" fill="var(--c)"><circle cx="66" cy="8" r="2.6"/><circle cx="73" cy="3" r="2.6"/><circle cx="80" cy="-2" r="2.6"/></g>
</svg>
</span>
```

## CSS

```css
.avatar svg *{transform-box:view-box}
.av-body{transform-origin:40px 76px}
.av-eyes{transform-origin:40px 34px}
.av-mouth{transform-origin:40px 46px}
.av-ring{opacity:0;transform-origin:40px 40px}
.av-dots,.av-happy,.av-closed,.av-flat,.av-zzz{opacity:0}

/* ruhig: seltenes Blinzeln – nur große Avatare (>= 56 px) */
.avatar.gross[data-zustand="ruhig"] .av-eyes{animation:av-blink2 7s ease-in-out infinite}
@keyframes av-blink2{0%,96%,100%{transform:scaleY(1)}98%{transform:scaleY(.1)}}

/* begruessen: einmalig */
[data-zustand="begruessen"] .av-body{animation:av-pop .55s cubic-bezier(.3,1.6,.5,1) both, av-wave 1.1s .55s ease-in-out both}
[data-zustand="begruessen"] .av-eyes{animation:av-blink .25s 1.3s both}
@keyframes av-pop{0%{transform:scale(.4);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes av-wave{0%,100%{transform:rotate(0)}20%{transform:rotate(-8deg)}45%{transform:rotate(6deg)}70%{transform:rotate(-3deg)}}
@keyframes av-blink{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.1)}}

/* zuhoeren: solange Mikrofon an */
[data-zustand="zuhoeren"] .av-ring{animation:av-ring 1.4s ease-out infinite}
[data-zustand="zuhoeren"] .av-body{animation:av-breathe 1.4s ease-in-out infinite}
@keyframes av-ring{0%{opacity:.55;transform:scale(1)}100%{opacity:0;transform:scale(1.35)}}
@keyframes av-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}

/* denken: solange Antwort lädt (ersetzt jede Lade-Anzeige im Chat) */
[data-zustand="denken"] .av-eyes{animation:av-look 2.4s ease-in-out infinite}
[data-zustand="denken"] .av-dots{opacity:1}
[data-zustand="denken"] .av-dots circle{animation:av-dot 1.2s ease-in-out infinite}
[data-zustand="denken"] .av-dots circle:nth-child(2){animation-delay:.2s}
[data-zustand="denken"] .av-dots circle:nth-child(3){animation-delay:.4s}
.avatar.klein[data-zustand="denken"] .av-dots{opacity:0}
.avatar.klein[data-zustand="denken"] .av-body{animation:av-breathe 1.2s ease-in-out infinite}
@keyframes av-look{0%,100%{transform:translate(0,0)}30%,70%{transform:translate(3px,-2.5px)}}
@keyframes av-dot{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-2px)}}

/* sprechen: nur während Worte gesprochen werden, in Pausen Klasse entfernen */
[data-zustand="sprechen"] .av-mouth{animation:av-talk 1.1s ease-in-out infinite}
[data-zustand="sprechen"] .av-eyes{animation:av-blink .25s 1.2s both}
@keyframes av-talk{0%,100%{transform:scale(1,1)}12%{transform:scale(.9,1.5)}24%{transform:scale(1,1.05)}38%{transform:scale(.88,1.6)}52%{transform:scale(1,1)}64%{transform:scale(.92,1.35)}80%{transform:scale(1,1)}}

/* freuen: nur bei echten Erfolgen */
[data-zustand="freuen"] .av-body{animation:av-jump .7s cubic-bezier(.3,1.5,.5,1) both}
[data-zustand="freuen"] .av-eyes{opacity:0}
[data-zustand="freuen"] .av-happy{opacity:1}
[data-zustand="freuen"] .av-mouth{transform:scale(1.15,1.25)}
@keyframes av-jump{0%{transform:translateY(0) scale(1)}35%{transform:translateY(-10px) scale(1.05,.95)}70%{transform:translateY(0) scale(.97,1.03)}100%{transform:translateY(0) scale(1)}}

/* verwirrt: statt Fehlermeldung */
[data-zustand="verwirrt"] .av-body{animation:av-tilt .6s ease-out both}
[data-zustand="verwirrt"] .av-mouth{opacity:0}
[data-zustand="verwirrt"] .av-flat{opacity:1}
[data-zustand="verwirrt"] .av-eyes{transform:scale(.8)}
@keyframes av-tilt{0%{transform:rotate(0)}100%{transform:rotate(-8deg)}}

/* schlafen: Feierabend / Ruhe nach Feierabend */
[data-zustand="schlafen"] .av-eyes{opacity:0}
[data-zustand="schlafen"] .av-closed{opacity:1}
[data-zustand="schlafen"] .av-mouth{transform:scale(.6)}
[data-zustand="schlafen"] .av-zzz{opacity:1}
[data-zustand="schlafen"] .av-zzz text{animation:av-z 2.4s ease-in-out infinite}
[data-zustand="schlafen"] .av-zzz text:nth-child(2){animation-delay:.6s}
[data-zustand="schlafen"] .av-body{animation:av-breathe 3.2s ease-in-out infinite}
@keyframes av-z{0%,100%{opacity:.2;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}

/* Bewegung reduzieren: nur Gesichtsausdruck, keine Bewegung */
@media (prefers-reduced-motion:reduce){.avatar *{animation:none!important}}
```
