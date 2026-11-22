'use client';

import { useEffect, useRef, useState } from 'react';

// The Web Speech API isn't in TypeScript's DOM lib in every version, so
// describe just the parts we use.
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: RecognitionAlternative;
}
interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [index: number]: RecognitionResult };
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const speechInputSupported = () => recognitionCtor() !== null;

/**
 * Listens continuously while `enabled`, calling `onPhrase` with the
 * recogniser's alternatives (best first) for each finished phrase.
 */
export function useSpeechInput(enabled: boolean, onPhrase: (alternatives: string[]) => void) {
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const handler = useRef(onPhrase);
  useEffect(() => {
    handler.current = onPhrase;
  });

  useEffect(() => {
    const Ctor = recognitionCtor();
    if (!enabled || !Ctor) return;
    let active = true;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.maxAlternatives = 4;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (!result.isFinal) continue;
        const alts: string[] = [];
        for (let j = 0; j < result.length; j++) alts.push(result[j].transcript.trim());
        handler.current(alts.filter(Boolean));
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        active = false;
        setError('Microphone access was blocked.');
      } else if (e.error === 'audio-capture') {
        active = false;
        setError('No microphone found.');
      }
    };
    // Recognisers stop after a pause in speech; keep restarting while enabled.
    rec.onend = () => {
      if (!active) {
        setListening(false);
        return;
      }
      setTimeout(() => {
        if (!active) return;
        try {
          rec.start();
        } catch {
          /* already started */
        }
      }, 250);
    };
    setError(null);
    try {
      rec.start();
      setListening(true);
    } catch {
      setError('Could not start the microphone.');
    }
    return () => {
      active = false;
      setListening(false);
      rec.onend = null;
      rec.abort();
    };
  }, [enabled]);

  return { listening: enabled && listening && !error, error };
}
