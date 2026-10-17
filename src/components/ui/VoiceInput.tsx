import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle, Square } from 'lucide-react';
import { useSpeechRecognition, VoiceState } from '@/hooks/useSpeechRecognition';

// Renders the correct icon + label for each voice state.
const STATE_CONFIG: Record<VoiceState, { icon: typeof Mic; label: string; color: string }> = {
  idle: { icon: Mic, label: 'Speak', color: 'text-primary-400 hover:text-accent-600' },
  listening: { icon: Mic, label: 'Listening…', color: 'text-error-600' },
  processing: { icon: Loader2, label: 'Processing…', color: 'text-accent-600' },
  success: { icon: CheckCircle2, label: 'Captured', color: 'text-success-600' },
  error: { icon: AlertCircle, label: 'Try again', color: 'text-error-600' },
  unsupported: { icon: MicOff, label: 'Unsupported', color: 'text-primary-200 dark:text-primary-500' },
};

// Reusable voice input button. Wraps the Web Speech API via
// useSpeechRecognition. When speech is not supported, renders a
// disabled mic icon with a tooltip explaining the fallback to typing.
//
// Props:
//   onResult — called with the final transcript after recognition
//   onError  — called with an error message string
//   lang     — BCP-47 language tag (default en-IN)
//   size     — button size ('sm' | 'md' | 'lg')
export default function VoiceInput({
  onResult,
  onError,
  lang = 'en-IN',
  size = 'md',
}: {
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
  lang?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { state, interimTranscript, start, stop } = useSpeechRecognition({
    lang,
    onResult,
    onError,
  });

  const config = STATE_CONFIG[state];
  const Icon = config.icon;
  const isActive = state === 'listening' || state === 'processing';

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };
  const iconSizes = { sm: 16, md: 18, lg: 22 };

  // Unsupported browser — disabled button with tooltip.
  if (state === 'unsupported') {
    return (
      <button
        type="button"
        disabled
        title="Voice input isn't supported in this browser. You can continue by typing."
        className={`relative ${sizeClasses[size]} shrink-0 items-center justify-center rounded-full text-primary-200 dark:text-primary-500`}
        aria-label="Voice input not supported"
      >
        <Icon size={iconSizes[size]} />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={isActive ? stop : start}
        title={config.label}
        aria-label={config.label}
        className={`relative flex ${sizeClasses[size]} shrink-0 items-center justify-center rounded-full transition-all ${config.color} ${
          state === 'listening'
            ? 'bg-error-50 dark:bg-error-900/30'
            : state === 'success'
            ? 'bg-success-50 dark:bg-success-900/30'
            : 'hover:bg-cream-100 dark:hover:bg-primary-700'
        }`}
      >
        {/* Pulse rings while listening */}
        {state === 'listening' && (
          <>
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-error-400/40" />
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-error-400/30" style={{ animationDelay: '0.4s' }} />
          </>
        )}
        <Icon
          size={iconSizes[size]}
          className={state === 'processing' ? 'animate-spin' : ''}
        />
        {/* Stop indicator overlay */}
        {state === 'listening' && (
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-error-600 text-cream-50">
            <Square size={8} className="fill-white" />
          </span>
        )}
      </button>

      {/* Interim transcript tooltip */}
      {interimTranscript && (
        <div className="absolute bottom-full right-0 mb-2 max-w-[200px] whitespace-normal rounded-lg bg-primary-800 px-2.5 py-1.5 text-xs text-cream-50 shadow-soft-lg dark:bg-primary-700">
          {interimTranscript}
        </div>
      )}
    </div>
  );
}

// Animated waveform visualizer — used in conversational voice flows.
// Renders a row of bars that animate while in the 'listening' state.
export function VoiceWaveform({ active }: { active: boolean }) {
  const bars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  return (
    <div className="flex h-12 items-center justify-center gap-1">
      {bars.map((i) => (
        <span
          key={i}
          className={`w-1 rounded-full bg-accent-600 transition-all ${
            active ? 'animate-wave' : 'h-2 opacity-30'
          }`}
          style={{
            height: active ? `${20 + Math.random() * 24}px` : undefined,
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}
