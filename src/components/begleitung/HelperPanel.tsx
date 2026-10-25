"use client";

// Chat mit der Begleitung als Fenster von unten: Kopf, Verlauf, Eingabe.
// Jede Nachricht geht an die KI, wenn sie erreichbar ist – sonst an die
// festen Regeln (`useChatRules`); Spontan kochen, Supermarkt und die
// KI-Anfrage stecken in eigenen Hooks.

import { onKiVersuchOhneCode } from "@/lib/begleitung/codeAbfrage";
import { rezeptLinkIn } from "@/lib/essen/rezeptLink/lesen";
import { listeAusChat, openListe } from "@/lib/kalender/liste/einfuegen";
import { fetchRezeptLink } from "@/lib/essen/rezeptLink/abrufen";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { isIdeaFilterRequest } from "@/lib/essen/spontan";
import { isKochtippRequest } from "@/lib/essen/kochtipp/start";
import { unlockKochtipp } from "@/lib/essen/kochtipp/store";
import { useKochidee } from "@/components/essen/kochtipp/useKochidee";
import { useStock } from "@/lib/essen/useStock";
import { effectivePlanStyle, helperName } from "@/lib/einstellungen/profile";
import { saveProfile } from "@/lib/einstellungen/profileStore";
import { finalizeProfile, type OnboardingState } from "@/lib/einstellungen/onboarding/engine";
import { noteUserAction } from "@/lib/core/activity";
import { GuidedChat } from "@/components/begleitung/GuidedChat";
import { isRegisteredUndo, pushUndo } from "@/lib/core/undo";
import { useAssistantStatus } from "@/lib/begleitung/client";
import { setAvatarFlag, triggerAvatar } from "@/lib/core/avatarState";
import { shouldRead, speak, stopSpeaking, unlockSpeech, useSpeakingId, useSpeechSettings } from "@/lib/begleitung/speech";
import type { AssistantData } from "@/lib/begleitung/ops";
import { textFieldFocused, useKeyboardInset } from "@/lib/core/useMobileKeyboard";
import { TIPPEN_ZU_MS, tippenSchliessen } from "@/lib/begleitung/tippModus";
import { useSpeechInput } from "@/lib/begleitung/useSpeechInput";
import { toIsoDate, useToday, weekStartFor, weekdayName } from "@/lib/essen/weekPlan";
import { chatSuggestions, noteChatMessage, useShowSuggestions } from "@/lib/begleitung/chatSuggestions";
import { mealOverOn, useCookedDays } from "@/lib/essen/mealDone";
import { useMinutes } from "@/lib/core/now";
import { useShoppingSettings } from "@/lib/einkauf/shoppingList";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { looksLikeMail, splitInstruction } from "@/lib/begleitung/mail";
import { useTipStore } from "@/lib/essen/healthTips";
import { useFeature } from "@/lib/core/features";
import { onReleaseHelperVoice } from "@/lib/begleitung/open";
import { isDayQuestion } from "@/lib/heute/deinTag";
import { showToast } from "@/lib/core/toast";

import type { ChatState } from "@/components/begleitung/chatTypes";
import type { RuleContext } from "@/components/begleitung/localRules";
import { ChatHistory } from "@/components/begleitung/ChatHistory";
import { ChatInputBar } from "@/components/begleitung/ChatInputBar";
import { MiaLayer, StageFoot, StageMia } from "@/components/begleitung/MiaStage";
import { stageHint, stageLabel, stageLayout, stageState, stageTap } from "@/lib/begleitung/stage";
import { SuggestionChips } from "@/components/begleitung/SuggestionChips";
import { useAskAssistant } from "@/components/begleitung/useAskAssistant";
import { useChatRules } from "@/components/begleitung/useChatRules";
import { useMarketChat } from "@/components/begleitung/useMarketChat";
import { useSpontanChat } from "@/components/begleitung/useSpontanChat";
import { VoiceOffer } from "@/components/begleitung/VoiceOffer";

/** Zustimmung per Sprache („ja“, „passt“, „mach“) */
const YES = /^(ja|jo|jap|jawohl|passt|passt so|mach( das| es)?|übernehmen|übernimm|okay|ok|gerne?|genau)[.!]*$/i;
/** Nach einer Rückfrage mit Knöpfen hört Mia kurz mit – höchstens so lange */
const ASK_BACK_MS = 8000;

type Props = {
  data: AssistantData | null | undefined;
  chat: ChatState;
  setChat: Dispatch<SetStateAction<ChatState>>;
  onApply: (selected: Set<string>) => void;
  onClose: () => void;
  /** Mikrofon beim Öffnen direkt starten */
  startListening?: boolean;
  /** Beim Öffnen gleich diese Frage stellen */
  initialAsk?: string;
};

/** Panel von unten: Chatverlauf, Vorschlag, großes Mikrofon und Textfeld */
export function HelperPanel({ data, chat, setChat, onApply, onClose, startListening, initialAsk }: Props) {
  const router = useRouter();
  const status = useAssistantStatus(true);
  // Zurück (Pfeil/Geste) schließt den Chat – eine Ebene
  const today = useToday();
  // Ohne sichtbaren Knopf (nur Löschen hat einen): jedes Zurücknehmen bleibt für "Mach das rückgängig" gemerkt
  useEffect(() => {
    for (const turn of chat.turns.slice(-3)) if (turn.undo && !isRegisteredUndo(turn.undo)) pushUndo(turn.text.slice(0, 60), turn.undo);
  }, [chat.turns]);
  const inset = useKeyboardInset();
  const [input, setInput] = useState("");
  const tipsOn = useFeature("tipps");
  const [adjusting, setAdjusting] = useState(false);
  const speechSettings = useSpeechSettings();
  const speakingId = useSpeakingId();
  // Zuletzt per Mikrofon gefragt? Dann liest Lotte (Standard "automatisch") vor
  const [viaVoice, setViaVoice] = useState(Boolean(startListening));
  const [dictationHint, setDictationHint] = useState(false);
  // Zugangscode "Später" – gilt, bis das Panel wieder geöffnet wird
  const [codeLater, setCodeLater] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ready = Boolean(status?.ready && data && today);
  // Eingabe auch ohne KI möglich – z. B. für "neue Person" (ohne KI per Regeln)
  const canType = Boolean(data && today);
  const name = helperName(data?.profile);
  // Neue Person: geführtes Gespräch wie beim Kennenlernen
  const [guided, setGuided] = useState<OnboardingState | null>(null);
  const voice = data?.profile.helper.voice ?? "weiblich";
  // Aktueller Bestand: Vorrat + Gekauftes (abgehakt / "Haben wir schon") – immer live
  const pantry = useStock();
  const tipStore = useTipStore();
  const shoppingSettings = useShoppingSettings();
  const shopping = useWeekShoppingList("planning");
  // "Ich koche spontan" (diese Woche): keine Planungs-Beispiele, Wünsche und "doch planen" lokal
  const spontanStyle = Boolean(data && today && effectivePlanStyle(data.profile, weekStartFor(today, data.profile.shoppingDay || "Montag")) === "spontan");
  // "Zum Beispiel:" – passend zur Situation, je Chat einmal gewürfelt; weg nach der ersten eigenen Nachricht
  const [suggestRand] = useState(() => Math.random());
  const [suggestionsGone, setSuggestionsGone] = useState(false);
  const showSuggestions = useShowSuggestions();
  const minutes = useMinutes();
  const cooked = useCookedDays();
  const suggestions =
    data && today && minutes !== undefined && cooked && showSuggestions && !suggestionsGone && chat.turns.length === 0 && !guided
      ? chatSuggestions({
          profile: data.profile,
          mealOver: mealOverOn(toIsoDate(today), weekdayName(today), data.profile, minutes, cooked),
          pantry: pantry ?? [],
          shopping: shopping?.list.items.map((i) => i.name) ?? [],
          ai: ready,
          rand: suggestRand,
        })
      : [];

  const { busy, streaming, ask, notUnderstood } = useAskAssistant({ data, today, ready, chat, setChat, setInput, setAdjusting, pantry, shopping, tipStore });

  // Avatar der Begleitung: denkt, solange die Antwort lädt (noch kein Text da) …
  const thinking = busy && !streaming;
  useEffect(() => {
    if (!thinking) return;
    setAvatarFlag("denken", true);
    return () => setAvatarFlag("denken", false);
  }, [thinking]);
  // … und schaut verwirrt statt einer Fehlermeldung
  const lastTurn = chat.turns[chat.turns.length - 1];
  const confused = lastTurn?.role === "assistant" && lastTurn.error ? chat.turns.length : 0;
  useEffect(() => {
    if (confused) triggerAvatar("verwirrt");
  }, [confused]);

  const ruleCtx: RuleContext = { data, today, setChat, setInput, router, onClose };

  // --- Spontan kochen ("mit dem, was da ist") und Supermarkt ------------------
  const spontan = useSpontanChat({ data, today, pantry, spontanStyle, setChat, setInput });
  const market = useMarketChat({ data, today, spontanStyle, setChat });
  const mealOver = Boolean(data && today && minutes !== undefined && cooked && mealOverOn(toIsoDate(today), weekdayName(today), data.profile, minutes, cooked));
  const kochidee = useKochidee({ data, today, pantry, mealOver, setChat, onClose });
  // Kochidee gerade geöffnet: sofort drei Vorschläge (keine Frage davor)
  const freshIdea = chat.kochtipp?.fresh && data && today && pantry !== undefined ? chat.kochtipp : null;
  useEffect(() => {
    if (freshIdea) kochidee.start(freshIdea.planned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshIdea]);

  const { rules } = useChatRules({ ruleCtx, chat, setGuided, startSpontan: spontan.startSpontan, pantry, shopping, shoppingSettings, speechSettings, spontanStyle, ready, ask });

  // Mia-Ansicht: Tippen-Feld, Verlauf, „Erledigt“
  // Nur das aktuelle Gespräch zählt (ab `since`, Früheres steht im „Verlauf“)
  const since = Math.min(chat.since ?? 0, chat.turns.length);
  const userTurns = chat.turns.filter((t, i) => i >= since && t.role === "user").length;
  const lastIndex = chat.turns.length - 1;
  const newest = chat.turns[lastIndex];
  const [typing, setTyping] = useState(false);
  const [history, setHistory] = useState(false);
  const [done, setDone] = useState(false);
  /** „Passt“ (Knopf oder „ja“): übernehmen, Mia freut sich, nach ~1 s zu, kurze Meldung */
  const applyAndClose = (selected: Set<string>) => {
    onApply(selected);
    setDone(true);
    triggerAvatar("freuen");
    stopSpeaking();
    window.setTimeout(() => {
      onClose();
      showToast({ text: "Übernommen", small: true });
    }, 1100);
  };

  /** Rezept-Link: kurz „schau rein“, dann die Karte (oder ein freundlicher Satz) */
  const showRezeptLink = (url: string, said: string) => {
    setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: said, local: true }, { role: "assistant", text: "Moment, ich schau rein …", local: true }] }));
    void fetchRezeptLink(url).then((r) =>
      setChat((c) => {
        const turns = [...c.turns];
        const at = turns.map((x) => x.text).lastIndexOf("Moment, ich schau rein …");
        const reply = "rezept" in r ? { role: "assistant" as const, text: "Hab’s gelesen. Das brauchst du dafür:", local: true, rezept: r.rezept } : { role: "assistant" as const, text: r.error, local: true };
        if (at >= 0) turns[at] = reply;
        else turns.push(reply);
        return { ...c, turns };
      }),
    );
  };

  /** Eingabe abschicken: neue Person, Reste-Modus oder Frage an die KI (`byVoice` = per Mikrofon) */
  const submit = (text: string, byVoice = false) => {
    const t = text.trim();
    if (!t || busy || !data || !today) return;
    // Aufnahme verwerfen – ihr Ende darf nichts mehr ins Feld schreiben
    speech.reset();
    setSuggestionsGone(true);
    noteChatMessage();
    setViaVoice(byVoice);
    noteUserAction(toIsoDate(today));
    // Offener Vorschlag + „ja“, „passt“, „mach“ = übernehmen
    if (chat.proposal && chat.proposal.selected.size > 0 && YES.test(t)) {
      setInput("");
      applyAndClose(chat.proposal.selected);
      return;
    }
    // Ein Rezept-Link ist ein App-Befehl (wie ein geteilter Link): Seite lesen, Karte zeigen
    const link = rezeptLinkIn(t);
    if (link) {
      setInput("");
      showRezeptLink(link, t);
      return;
    }
    // Eine eingefügte To-do-Liste ist ein App-Befehl: Vorschau „Liste einfügen“ (dort wird abgewählt und übernommen)
    const liste = listeAusChat(t);
    if (liste !== null) {
      setInput("");
      const reply = liste ? "Hab sie sortiert. Schau kurz drüber:" : "Gern. Füg sie einfach hier ein:";
      setChat((c) => ({ ...c, turns: [...c.turns, { role: "user", text: t, local: true }, { role: "assistant", text: reply, local: true }] }));
      openListe(liste);
      return;
    }
    // „Kochidee“, „Was soll ich kochen?“ schaltet den Knopf frei (auch mit KI)
    if (isKochtippRequest(t)) unlockKochtipp();
    // „Was steht heute an?“ – Mia fasst kurz zusammen und öffnet „Dein Tag“ (ein App-Befehl wie der Wochencheck)
    if (isDayQuestion(t) && rules(t)) return;
    // Offene Kochidee: Erzähltes („Ich hab Hähnchen gekauft …“, „nicht schon wieder Hähnchen“)
    // → neues Karussell; alles andere beendet sie und geht den normalen Weg
    if (chat.kochtipp) {
      setInput("");
      if (kochidee.input(t, chat.kochtipp)) return;
      setChat((c) => ({ ...c, kochtipp: null }));
    }
    // Eine eingefügte Mail ist nie eine Zutatenliste
    if (chat.spontan && looksLikeMail(splitInstruction(t).mail)) {
      setChat((c) => ({ ...c, spontan: null }));
      route(t);
      return;
    }
    // Selbst geöffneter Spontan-Modus: "Was Schnelles mit Nudeln" passt die Ideen an,
    // genannte Zutaten landen im Vorrat; alles andere beendet ihn
    if (chat.spontan && isIdeaFilterRequest(t)) {
      rules(t);
      return;
    }
    if (chat.spontan) {
      void spontan.spontanInput(t).then((handled) => {
        if (handled) return;
        setChat((c) => ({ ...c, spontan: null }));
        route(t);
      });
      return;
    }
    route(t);
  };

  /**
   * Grundregel: Ist die KI erreichbar, bekommt IMMER sie die Nachricht. Die
   * festen Regeln (Stichwörter) sind nur die Notlösung ohne KI – und keine
   * Regel hinterlässt einen Zustand, der weitere Nachrichten abfängt.
   */
  const route = (t: string) => {
    if (ready) {
      void ask(t, undefined, rules);
      return;
    }
    // KI eingerichtet, aber kein Testcode („Später“): einmal den Code-Bildschirm zeigen, die Regeln helfen trotzdem
    if (status?.askCode) onKiVersuchOhneCode();
    if (rules(t)) return;
    setInput("");
    notUnderstood(t);
  };

  // Panel geschlossen → eine noch laufende Aufnahme nicht mehr abschicken
  // (vor useSpeechInput, damit dieses Aufräumen zuerst läuft)
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Gesprochenes dieser Aufnahme anzeigen; wenn sie endet, wird genau das abgeschickt.
  // Bühne: Atempausen schicken nichts ab (erst 2,5 s Stille, Antippen oder „fertig“).
  // Spricht man weiter, während Mia antwortet, wird es gemerkt („wartet“) und danach geschickt.
  const [wartend, setWartend] = useState("");
  const busyNow = useRef(busy);
  useEffect(() => {
    busyNow.current = busy;
  }, [busy]);
  /** Nach einer Sprach-Nachricht weiter zuhören (Vorlesen aus: sofort; an: nach dem Vorlesen) */
  const weiterHoeren = useRef(false);
  const speech = useSpeechInput({
    buehne: true,
    onTranscript: (t) => setInput(t),
    onEnd: (t) => {
      setInput("");
      if (!t || !mounted.current) return;
      if (busyNow.current) {
        setWartend((w) => `${w} ${t}`.trim());
        return;
      }
      submit(t, true);
      weiterHoeren.current = true;
    },
  });

  const toggleMic = () => {
    // Erste Berührung schaltet auf dem iPhone auch die Sprachausgabe frei
    unlockSpeech();
    stopSpeaking();
    if (speech.supported === false) {
      // Fallback: Diktat über die Tastatur
      setDictationHint(true);
      inputRef.current?.focus();
      return;
    }
    if (speech.listening) {
      speech.stop();
    } else {
      // Wer spricht, braucht keine Beispiele mehr
      setSuggestionsGone(true);
      stopSpeaking();
      setInput("");
      speech.start();
    }
  };

  // Von der Startseite geöffnet: einmalig Mikrofon starten bzw. Frage stellen
  const stopListening = () => speech.listening && speech.stop();
  const cancelIfSilent = () => speech.listening && !input.trim() && !speech.interim && speech.cancel();
  const latest = useRef({ submit, toggleMic, stopListening, cancelIfSilent });
  useEffect(() => {
    latest.current = { submit, toggleMic, stopListening, cancelIfSilent };
  });
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !data || !today) return;
    started.current = true;
    if (initialAsk) latest.current.submit(initialAsk);
    else if (startListening) latest.current.toggleMic();
  }, [data, today, initialAsk, startListening]);

  // Mia-Knopf lange gedrückt: Loslassen schickt das Gesagte ab
  useEffect(() => onReleaseHelperVoice(() => latest.current.stopListening()), []);

  // Nach Mias Antwort wartet sie (Strom, Privatsphäre) – nur bei einer Rückfrage mit
  // Knöpfen hört sie nach dem Vorlesen kurz mit (höchstens 8 s, dann leise aus)
  const withButtons = Boolean(newest?.chips?.length || newest?.choices?.length);
  const askedBack = newest?.role === "assistant" && !newest.local && newest.text.trim().endsWith("?") && withButtons && viaVoice ? lastIndex : -1;
  const listenedFor = useRef(-1);
  useEffect(() => {
    if (askedBack < 0 || listenedFor.current === askedBack || speakingId !== null || busy || speech.blocked) return;
    listenedFor.current = askedBack;
    latest.current.toggleMic();
    const t = window.setTimeout(() => latest.current.cancelIfSilent(), ASK_BACK_MS);
    return () => window.clearTimeout(t);
  }, [askedBack, speakingId, busy, speech.blocked]);

  // Weiterreden: Vorlesen aus → Mikro bleibt gleich an, während Mia denkt/antwortet;
  // Vorlesen an → erst sprechen lassen, dann sofort wieder zuhören (sonst hört Mia sich selbst)
  const readsVoice = shouldRead(speechSettings.mode, true);
  const listenAgain = () => {
    if (!weiterHoeren.current || speech.listening || speech.blocked || speech.supported === false) return;
    weiterHoeren.current = false;
    speech.start();
  };
  const again = useRef(listenAgain);
  useEffect(() => {
    again.current = listenAgain;
  });
  useEffect(() => {
    if (readsVoice || !busy) return;
    const t = window.setTimeout(() => again.current(), 300);
    return () => window.clearTimeout(t);
  }, [busy, readsVoice]);
  useEffect(() => {
    if (!readsVoice || busy || speakingId !== null) return;
    const t = window.setTimeout(() => again.current(), 350);
    return () => window.clearTimeout(t);
  }, [busy, readsVoice, speakingId]);
  // Gemerktes nach Mias Antwort abschicken
  useEffect(() => {
    if (busy || !wartend || speech.listening) return;
    const timer = window.setTimeout(() => {
      setWartend("");
      latest.current.submit(wartend, true);
      weiterHoeren.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [busy, wartend, speech.listening]);

  // Schließen beendet das Vorlesen (Escape, Danebentippen, Zurück übernimmt das Fenster)
  useEffect(() => () => stopSpeaking(), []);

  // Antworten vorlesen: an, wenn eingeschaltet – im Standard, wenn per Mikrofon gefragt
  const readingOn = shouldRead(speechSettings.mode, viaVoice);

  // Neue Antworten von Lotte vorlesen (nicht, was beim Öffnen schon dastand)
  const speechRef = useRef(spontan.speechFor);
  useEffect(() => {
    speechRef.current = spontan.speechFor;
  });
  const spokenUpTo = useRef(chat.turns.length);
  const [readCount, setReadCount] = useState(0);
  useEffect(() => {
    const from = spokenUpTo.current;
    spokenUpTo.current = chat.turns.length;
    if (chat.turns.length <= from || !readingOn) return;
    const fresh = chat.turns.map((t, i) => ({ t, i })).slice(from).filter(({ t }) => t.role === "assistant");
    if (!fresh.length) return;
    speak(fresh.map(({ t }) => speechRef.current(t)).join(" "), { id: `turn-${fresh[fresh.length - 1].i}`, gender: voice });
    // Nach dem ersten Vorlesen: schönere Stimme anbieten (nur, wenn nötig – VoiceOffer)
    setReadCount((n) => n + 1);
  }, [chat.turns, readingOn, voice]);

  const newChat = () => {
    // Verlauf, offener Vorschlag, Spontan-Modus und geführte Fragen weg – gespeicherte Daten bleiben
    setChat({ turns: [], proposal: null, spontan: null });
    setGuided(null);
    setAdjusting(false);
    setInput("");
  };
  // --- Die Bühne: Gespräch oben, Mia unten ------------------------------------
  const heard = speech.listening ? `${input}${speech.interim ? ` ${speech.interim}` : ""}`.trim() : "";
  const state = stageState({ listening: speech.listening, thinking, speaking: speakingId !== null || (busy && streaming != null) });
  const mic = { blocked: speech.blocked, supported: speech.supported };
  // Tippen-Feld: auf Wunsch, ohne Mikro, beim Ändern eines Vorschlags und im geführten Gespräch
  const layout = stageLayout({ typing: typing || dictationHint || adjusting || Boolean(guided), ...mic });
  const tapMia = () => {
    const what = stageTap(state, mic);
    if (what === "tippen") {
      setTyping(true);
      inputRef.current?.focus();
    } else toggleMic();
  };
  // Feld verlassen (und nichts getippt) → Mia wieder groß unten. Nur nach echtem
  // Fokusverlust, nie wegen eines Layout-Sprungs beim Öffnen der Tastatur (Safari).
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fieldLeft = () => {
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => {
      if (tippenSchliessen({ feldFokussiert: textFieldFocused(), leer: !inputRef.current?.value.trim(), aendern: adjusting })) setTyping(false);
    }, TIPPEN_ZU_MS);
  };
  useEffect(() => () => clearTimeout(leaveTimer.current), []);
  /** „Lieber sprechen“: zurück zu Mia, sie hört gleich zu */
  const preferSpeaking = () => {
    clearTimeout(leaveTimer.current);
    inputRef.current?.blur();
    setTyping(false);
    if (!speech.listening) toggleMic();
  };
  const hint = done ? "Erledigt" : stageHint(state, name, userTurns === 0);
  const mia = <StageMia state={state} size={layout.size} hint={layout.field && !done ? undefined : speech.wartet ? "Gleich schick ich’s ab" : hint} label={stageLabel(state, mic)} done={done} pause={speech.wartet} onTap={tapMia} />;

  return (
    <MiaLayer name={name} onClose={onClose} onHistory={() => setHistory((h) => !h)} history={history} inset={inset}>
        {guided ? (
          <GuidedChat
            state={guided}
            onChange={setGuided}
            onFinish={() => {
              const added = guided.draft.persons.length > (data?.profile.persons.length ?? 0);
              saveProfile(finalizeProfile(guided));
              setGuided(null);
              if (added) {
                setChat((c) => ({
                  ...c,
                  turns: [...c.turns, { role: "assistant", text: "Gespeichert ✓ Ab jetzt plane ich mit.", local: true }],
                }));
              }
            }}
          />
        ) : (
          <>
        {history && chat.turns.length > 0 && (
          <button type="button" onClick={newChat} className="hit mia-gespraech mx-auto min-h-11 text-[15px] font-semibold text-accent-strong">
            Neues Gespräch
          </button>
        )}
        <ChatHistory
          scrollRef={scrollRef}
          inputRef={inputRef}
          status={status}
          data={data}
          name={name}
          voice={voice}
          codeLater={codeLater}
          onCodeLater={() => setCodeLater(true)}
          chat={chat}
          setChat={setChat}
          busy={busy}
          streaming={streaming}
          speakingId={speakingId}
          tipsOn={tipsOn}
          adjusting={adjusting}
          setAdjusting={(on) => {
            setAdjusting(on);
            if (on) setTyping(true);
          }}
          spontan={spontan}
          market={market}
          kochidee={kochidee}
          onTalk={() => (state === "zuhoeren" ? undefined : tapMia())}
          rules={rules}
          onSubmit={submit}
          onAsk={(text) => void ask(text)}
          onApply={applyAndClose}
          onClose={onClose}
          from={history ? 0 : since}
          showGreeting={history || chat.turns.length <= since}
          topic={history ? undefined : chat.topic}
          heard={heard}
          heardWaits={busy}
          waiting={speech.listening ? "" : wartend}
        >
          {!layout.field && suggestions.length > 0 && <SuggestionChips suggestions={suggestions} onPick={submit} />}
          <VoiceOffer readCount={readCount} speaking={speakingId !== null} gender={voice} />
        </ChatHistory>

        {layout.field ? (
          <div className="flex shrink-0 flex-col items-center pt-1">
            {mia}
            <ChatInputBar inputRef={inputRef} input={input} setInput={setInput} name={name} canType={canType} busy={busy} speech={speech} dictationHint={dictationHint} suggestions={suggestions} onSubmit={submit} onLeave={fieldLeft} onSpeak={mic.blocked || mic.supported === false ? undefined : preferSpeaking} />
          </div>
        ) : (
          <StageFoot>
            {mia}
            <div className="mia-gespraech flex items-center gap-5" data-daneben>
              <button type="button" onClick={() => setTyping(true)} disabled={!canType} className="hit min-h-11 text-[15px] font-semibold text-muted underline-offset-2 active:text-ink">
                Lieber tippen
              </button>
            </div>
          </StageFoot>
        )}
          </>
        )}
    </MiaLayer>
  );
}
