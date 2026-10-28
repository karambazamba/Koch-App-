"use client";

// Foto vor dem Speichern verkleinern (Browser): längste Seite höchstens
// 1600 px, JPEG – so bleibt es klein auf dem Gerät und im Haushalt. Die
// Rechnung (`fitFoto`) ist rein und getestet; hier nur Bild lesen und malen.

import { FOTO_QUALITY, fitFoto } from "@/lib/pinnwand/foto";

export type KleinesFoto = { blob: Blob; w: number; h: number };

async function decode(file: Blob): Promise<{ img: CanvasImageSource; w: number; h: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    // Drehung aus den Kameradaten gleich mit übernehmen
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    return { img: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  return { img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

/** Verkleinert als JPEG; null, wenn das Bild nicht lesbar ist */
export async function verkleinern(file: Blob): Promise<KleinesFoto | null> {
  try {
    const src = await decode(file);
    const size = fitFoto(src.w, src.h);
    const canvas = document.createElement("canvas");
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return src.close(), null;
    ctx.drawImage(src.img, 0, 0, size.w, size.h);
    src.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", FOTO_QUALITY));
    return blob ? { blob, ...size } : null;
  } catch {
    return null;
  }
}
