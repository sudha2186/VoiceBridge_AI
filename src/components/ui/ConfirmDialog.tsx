import { ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';

// Reusable confirmation dialog for destructive actions (delete, remove).
// Renders a modal overlay with a title, message, and confirm/cancel buttons.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-primary-900/40 p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md animate-scale-in rounded-2xl bg-white p-6 shadow-soft-xl dark:bg-primary-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-primary-400 transition-colors hover:bg-cream-100 hover:text-primary-500 dark:hover:bg-primary-700"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
              variant === 'danger'
                ? 'bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400'
                : 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
            }`}
          >
            <AlertTriangle size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-primary-900 dark:text-cream-100">{title}</h3>
            <div className="mt-1.5 text-sm text-primary-500 dark:text-primary-400">{message}</div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={variant === 'danger' ? 'btn-primary bg-error-600 hover:bg-error-700' : 'btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
