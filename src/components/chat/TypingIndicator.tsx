import { Bot } from 'lucide-react';

// Animated typing indicator — three bouncing dots shown while the
// assistant is "composing" a reply.
export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 animate-msg-in">
      {/* Assistant avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-700">
        <Bot size={16} className="text-cream-50" />
      </div>

      <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm dark:bg-primary-700/60">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary-400 animate-bounce-dot" style={{ animationDelay: '0ms' }} />
          <span className="h-2 w-2 rounded-full bg-primary-400 animate-bounce-dot" style={{ animationDelay: '200ms' }} />
          <span className="h-2 w-2 rounded-full bg-primary-400 animate-bounce-dot" style={{ animationDelay: '400ms' }} />
        </div>
      </div>
    </div>
  );
}
