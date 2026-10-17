import { useState, useEffect, useRef, useCallback } from 'react';

// Minimal type definitions for the Web Speech API (not in standard TS lib).
interface SpeechRecognitionResult {
  0: { transcript: string; confidence: number };
  isFinal: boolean;
  length: number;
}
interface SpeechRecognitionEvent extends Event {
  results: {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export type VoiceState = 'idle' | 'listening' | 'processing' | 'success' | 'error' | 'unsupported';

interface UseSpeechRecognitionOptions {
  lang?: string;
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

// Hook wrapping the browser Web Speech API (SpeechRecognition).
// Returns whether speech recognition is supported, the current state,
// the interim transcript, and start/stop functions. Falls back to
// 'unsupported' when the API is not available.
export function useSpeechRecognition({
  lang = 'en-IN',
  onResult,
  onError,
}: UseSpeechRecognitionOptions = {}) {
  const [state, setState] = useState<VoiceState>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  // Keep refs current without re-creating the recognition instance.
  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  });

  // Check support on mount.
  useEffect(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState('unsupported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState('listening');
      setInterimTranscript('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }
      setInterimTranscript(interim);

      if (finalTranscript) {
        setState('processing');
        setInterimTranscript('');
        // Brief processing delay for UX, then deliver result.
        setTimeout(() => {
          setState('success');
          onResultRef.current?.(finalTranscript.trim());
          setTimeout(() => setState('idle'), 1200);
        }, 300);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setState('error');
      const msg = event.error === 'no-speech'
        ? 'No speech detected. Please try again.'
        : event.error === 'not-allowed'
        ? 'Microphone permission denied.'
        : `Speech recognition error: ${event.error}`;
      onErrorRef.current?.(msg);
      setTimeout(() => setState('idle'), 2000);
    };

    recognition.onend = () => {
      // If we haven't transitioned to success/processing, go idle.
      setState((prev) => (prev === 'listening' ? 'idle' : prev));
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onstart = null;
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    };
  }, [lang]);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
    } catch {
      // start() throws if already started — ignore.
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setInterimTranscript('');
  }, []);

  return { state, interimTranscript, start, stop, reset };
}
