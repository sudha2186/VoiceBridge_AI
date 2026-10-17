// Pill-shaped suggested-question chips.
// Clicking a chip sends that question as a user message.
export default function SuggestedChips({
  suggestions,
  onSelect,
  disabled,
}: {
  suggestions: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.map((text) => (
        <button
          key={text}
          onClick={() => onSelect(text)}
          disabled={disabled}
          className="rounded-full border border-accent-200 bg-accent-50 px-3.5 py-1.5 text-xs font-medium text-accent-700 transition-all hover:scale-105 hover:bg-accent-100 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 dark:border-accent-800 dark:bg-accent-900/30 dark:text-accent-300 dark:hover:bg-accent-900/50"
        >
          {text}
        </button>
      ))}
    </div>
  );
}
