import { useState, useEffect } from 'react';
import { FileText, Trash2, Loader2, CheckCircle2, Edit3, X, Save, Eye, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { DocumentRecord, OcrExtractedData } from '@/services/documentService';
import { getSignedUrl } from '@/services/documentService';
import FilePreviewModal from './FilePreviewModal';

// Maps document types to a short label badge.
const TYPE_LABELS: Record<string, string> = {
  'Aadhaar Card': 'Aadhaar',
  'PAN Card': 'PAN',
  'Income Certificate': 'Income',
  'Caste Certificate': 'Caste',
  'Bank Passbook': 'Bank',
  Photo: 'Photo',
};

// Single document card — shows file type icon, name, thumbnail preview,
// OCR extraction status, editable extracted fields, and delete button.
// The `fadingOut` prop triggers a fade-out animation before removal.
export default function DocumentCard({
  document,
  onDelete,
  onUpdateExtracted,
  fadingOut,
}: {
  document: DocumentRecord;
  onDelete: (doc: DocumentRecord) => void;
  onUpdateExtracted: (docId: string, data: OcrExtractedData) => Promise<void>;
  fadingOut: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<OcrExtractedData>(document.extracted_data ?? {});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(document.file_name);

  // Fetch a signed URL for image thumbnails.
  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    (async () => {
      try {
        const signed = await getSignedUrl(document.storage_path);
        if (!cancelled) setThumbUrl(signed);
      } catch {
        // Thumbnail will just not show — non-critical.
      }
    })();
    return () => { cancelled = true; };
  }, [document.storage_path, isImage]);

  const handleDelete = async () => {
    setDeleting(true);
    onDelete(document);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await onUpdateExtracted(document.id, editData);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const hasExtractedData = document.extracted_data && Object.keys(document.extracted_data).length > 0;

  return (
    <>
      <div
        className={`card border-l-4 border-l-accent-500 transition-all duration-300 ${
          fadingOut ? 'opacity-0 scale-95 -translate-y-2' : 'opacity-100'
        }`}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {/* File icon / thumbnail */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent-100 dark:bg-accent-900/30">
              {isImage && thumbUrl ? (
                <img
                  src={thumbUrl}
                  alt={document.file_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <FileText size={24} className="text-accent-700 dark:text-accent-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                  {TYPE_LABELS[document.document_type] ?? document.document_type}
                </span>
                {document.verification?.status === 'verified' ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <ShieldCheck size={12} /> Verified
                  </span>
                ) : document.verification?.status === 'needs_review' ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    <AlertTriangle size={12} /> Review
                  </span>
                ) : hasExtractedData ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <CheckCircle2 size={12} /> Extracted
                  </span>
                ) : null}
              </div>
              <p className="mt-1 truncate text-sm font-medium text-primary-800 dark:text-cream-200">
                {document.file_name}
              </p>
              <p className="mt-0.5 text-xs text-primary-400 dark:text-primary-400">
                {document.file_size ? formatFileSize(document.file_size) : ''}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setPreviewOpen(true)}
              className="rounded-lg p-2 text-primary-400 transition-colors hover:bg-accent-50 hover:text-accent-600 dark:hover:bg-accent-900/30 dark:hover:text-accent-400"
              aria-label="Preview document"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg p-2 text-primary-400 transition-colors hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-900/30 dark:hover:text-error-400"
              aria-label="Delete document"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
          </div>
        </div>

        {/* Image thumbnail preview (larger, below header) */}
        {isImage && thumbUrl && (
          <button
            onClick={() => setPreviewOpen(true)}
            className="mt-3 block w-full overflow-hidden rounded-lg border border-cream-200 transition-all hover:opacity-90 dark:border-primary-700"
          >
            <img
              src={thumbUrl}
              alt={document.file_name}
              className="h-40 w-full object-cover bg-cream-100 dark:bg-primary-800"
            />
          </button>
        )}

        {/* Extracted data display / edit */}
        {hasExtractedData && !editing && (
          <div className="mt-3 rounded-lg bg-cream-50 p-3 dark:bg-primary-900/40">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-400 dark:text-primary-400">
                Extracted Details
              </p>
              <button
                onClick={() => {
                  setEditData(document.extracted_data ?? {});
                  setEditing(true);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400"
              >
                <Edit3 size={12} /> Edit
              </button>
            </div>
            <dl className="space-y-1">
              {Object.entries(document.extracted_data!).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-sm">
                  <dt className="shrink-0 capitalize text-primary-400 dark:text-primary-400">{key.replace(/_/g, ' ')}:</dt>
                  <dd className="text-primary-700 dark:text-primary-200">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Editable OCR form */}
        {editing && (
          <div className="mt-3 rounded-lg border border-accent-200 p-3 dark:border-accent-800">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-600 dark:text-accent-400">
                Edit Extracted Details
              </p>
              <button
                onClick={() => setEditing(false)}
                className="rounded p-1 text-primary-400 hover:text-primary-500"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-2">
              {Object.keys(editData).length === 0 && (
                <p className="text-xs text-primary-400">No fields extracted. Add them manually below.</p>
              )}
              {Object.entries(editData).map(([key, value]) => (
                <div key={key}>
                  <label className="mb-0.5 block text-xs font-medium capitalize text-primary-400 dark:text-primary-400">
                    {key.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="text"
                    value={String(value)}
                    onChange={(e) =>
                      setEditData((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="input-field py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="btn-accent mt-3 w-full py-2 text-xs"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Full-screen preview modal */}
      {previewOpen && (
        <FilePreviewModal
          storagePath={document.storage_path}
          fileName={document.file_name}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
