import { Bot } from 'lucide-react';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: number;
}

// Single chat bubble — user messages right-aligned in primary color,
// assistant messages left-aligned in white/slate with subtle shadow.
export default function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex animate-msg-in justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary-700 px-4 py-2.5 text-sm text-cream-50 shadow-sm">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex animate-msg-in items-end gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-700">
        <Bot size={16} className="text-cream-50" />
      </div>
      <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm text-primary-700 shadow-sm dark:bg-primary-700/60 dark:text-cream-200">
        {message.text}
      </div>
    </div>
  );
}
