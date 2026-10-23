// Marke Mia (Teil 1): Farben und der Schriftzug „Mia“ als Pfad – Plus Jakarta
// Sans ExtraBold (800), leicht eng, mit rundem i-Punkt (statt des eckigen der
// Schrift). Einheiten: 1000 = Schriftgröße, Versalhöhe 745, Grundlinie bei y = 745.
// Eine Quelle für die Komponente BrandMark und für `npm run brand`
// (scripts/generate-brand.mjs liest die Werte hier heraus).

/** Mia-Orange: Schrift und Marke (hell) */
export const BRAND = "#EE5F14";
/** Schrift auf dunklem Grund */
export const BRAND_DARK = "#F7843E";
/** Punkt in „Mia.“ (Werbung) */
export const BRAND_SOFT = "#F7A36E";

/** Versalhöhe des M (Einheiten des Pfads) */
export const WORD_CAP = 745;
/** Breite des Schriftzugs „Mia“ */
export const WORD_WIDTH = 1586;
/** Breite von „Mia.“ (mit Punkt) – @public für scripts/generate-brand.mjs */
export const WORD_DOT_WIDTH = 1786;
/** Schriftzug „Mia“ (Pfad, kein Text) */
export const WORD_PATH = "M155 745L0 745L0 0L150 0L393 323L630 0L780 0L780 745L625 745L625 265L400 555L380 555L155 254L155 745M1027 745L877 745L877 199L1027 199L1027 745M872 75a80 80 0 1 0 160 0a80 80 0 1 0 -160 0ZM1282 757L1282 757Q1223 757 1180 738Q1137 719 1114 683.5Q1091 648 1091 599L1091 599Q1091 553 1112 517.5Q1133 482 1176.5 458Q1220 434 1285 424L1285 424L1436 400L1436 385Q1436 354 1411.5 333Q1387 312 1345 312L1345 312Q1305 312 1274.5 334Q1244 356 1230 392L1230 392L1110 335Q1126 289 1161 256Q1196 223 1245 205Q1294 187 1352 187L1352 187Q1421 187 1474 212Q1527 237 1556.5 281.5Q1586 326 1586 385L1586 385L1586 745L1446 745L1446 693Q1437 703 1427 710L1427 710Q1398 734 1362 745.5Q1326 757 1282 757M1436 527L1436 510L1312 532Q1280 538 1263 552.5Q1246 567 1246 594L1246 594Q1246 619 1265 633Q1284 647 1312 647L1312 647Q1349 647 1377 631Q1405 615 1420.5 587.5Q1436 560 1436 527L1436 527";
/** Punkt hinter „Mia.“ – @public für scripts/generate-brand.mjs */
export const WORD_DOT_PATH = "M1618 670a84 84 0 1 0 168 0a84 84 0 1 0 -168 0Z";
