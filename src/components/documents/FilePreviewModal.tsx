import { useEffect, useState } from 'react';
import { X, Loader2, FileText, Download } from 'lucide-react';
import { getSignedUrl } from '@/services/documentService';

// Full-screen modal that previews a document — shows the image inline
// or embeds a PDF in an <iframe>. Falls back to a "file type not
// previewable" message with a download link for other formats.
export default function FilePreviewModal({
  storagePath,
  fileName,
  onClose,
}: {
  storagePath: string;
  fileName: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
  const isPdf = /\.pdf$/i.test(fileName);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const signed = await getSignedUrl(storagePath);
        if (!cancelled) setUrl(signed);
      } catch {
        if (!cancelled) setError('Could not load file preview.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  // Close on Escape key.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary-900/50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-soft-xl dark:bg-primary-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cream-200 px-4 py-3 dark:border-primary-700">
          <div className="flex min-w-0 items-center gap-2">
            <FileText size={18} className="shrink-0 text-accent-600" />
            <p className="truncate text-sm font-medium text-primary-700 dark:text-cream-200">
              {fileName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {url && (
              <a
                href={url}
                download={fileName}
                className="rounded-lg p-2 text-primary-400 transition-colors hover:bg-cream-100 hover:text-accent-600 dark:hover:bg-primary-700"
                aria-label="Download file"
              >
                <Download size={18} />
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-primary-400 transition-colors hover:bg-cream-100 hover:text-primary-500 dark:hover:bg-primary-700"
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-cream-50 p-4 dark:bg-primary-900/50">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-primary-400">
              <Loader2 size={32} className="animate-spin" />
            </div>
          ) : error ? (
            <div className="flex h-64 flex-col items-center justify-center text-primary-400 dark:text-primary-400">
              <FileText size={40} className="mb-3" />
              <p className="text-sm">{error}</p>
            </div>
          ) : isImage && url ? (
            <div className="flex items-center justify-center">
              <img
                src={url}
                alt={fileName}
                className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-sm"
              />
            </div>
          ) : isPdf && url ? (
            <iframe
              src={url}
              title={fileName}
              className="h-[70vh] w-full rounded-lg border-0"
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-primary-400 dark:text-primary-400">
              <FileText size={40} className="mb-3" />
              <p className="text-sm">Preview not available for this file type.</p>
              {url && (
                <a
                  href={url}
                  download={fileName}
                  className="btn-accent mt-4"
                >
                  <Download size={16} /> Download File
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
