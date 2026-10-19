// "Lotte → Mails" (pro Gerät, `wasgibts.mails` v1): Grußformel, Signatur
// (nur bei förmlichen Mails) und die gemerkte Anrede je Empfänger. Mails
// selbst werden nie gespeichert.

import { createLocalStore } from "../core/localStore";
import { useExternalStore } from "../core/useExternalStore";
import { DEFAULT_MAIL_STYLE, type MailStyle, type MailTone } from "./mail";

type Stored = MailStyle & { version: 1 };

const store = createLocalStore("wasgibts.mails", (raw: unknown): Stored | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<Stored>;
  const tones: Record<string, MailTone> = {};
  if (r.tones && typeof r.tones === "object") {
    for (const [k, v] of Object.entries(r.tones).slice(0, 100)) if (v === "du" || v === "sie") tones[k] = v;
  }
  return {
    version: 1,
    greeting: typeof r.greeting === "string" ? r.greeting.slice(0, 60) : DEFAULT_MAIL_STYLE.greeting,
    signature: typeof r.signature === "string" ? r.signature.slice(0, 300) : "",
    tones,
  };
});

export function loadMailStyle(): MailStyle {
  return store.load() ?? DEFAULT_MAIL_STYLE;
}

export function saveMailStyle(style: MailStyle) {
  store.save({ version: 1, greeting: style.greeting, signature: style.signature, tones: style.tones });
}

export function useMailStyle(): MailStyle | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data ?? DEFAULT_MAIL_STYLE);
}
