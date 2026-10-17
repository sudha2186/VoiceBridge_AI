import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  Loader2,
  ScanLine,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck2,
  ShieldCheck,
  ChevronRight,
  Lock,
  Unlock,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  uploadDocument,
  getDocuments,
  deleteDocument,
  DOCUMENT_TYPES,
  DocumentRecord,
  OcrExtractedData,
} from '@/services/documentService';
import DocumentCard from '@/components/documents/DocumentCard';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

// Workflow stages for the upload→scan→extract→verify timeline.
const WORKFLOW_STAGES = [
  { icon: UploadCloud, label: 'Uploading', key: 'uploading' },
  { icon: ScanLine, label: 'Scanning', key: 'scanning' },
  { icon: FileText, label: 'OCR Processing', key: 'ocr' },
  { icon: FileCheck2, label: 'Extracted', key: 'extracted' },
];

export default function DocumentsPage() {
  const { user, profile } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedType, setSelectedType] = useState<string>(DOCUMENT_TYPES[0]);
  const [dragOver, setDragOver] = useState(false);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [workflowStage, setWorkflowStage] = useState<string | null>(null);
  const [verifyDoc, setVerifyDoc] = useState<DocumentRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    if (!user) return;
    try {
      const docs = await getDocuments(user.id);
      setDocuments(docs);
    } catch {
      setError('Could not load documents.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Run the visual workflow stages during upload + OCR.
  // Run the visual workflow stages during upload + PyMuPDF OCR.
  const runWorkflow = async (newDoc: DocumentRecord) => {
    setWorkflowStage('uploading');
    await new Promise((r) => setTimeout(r, 350));
    setWorkflowStage('scanning');
    await new Promise((r) => setTimeout(r, 400));
    setWorkflowStage('ocr');
    setExtractingId(newDoc.id);
    await new Promise((r) => setTimeout(r, 500));
    setWorkflowStage('extracted');
    setTimeout(() => {
      setWorkflowStage(null);
      setExtractingId(null);
    }, 900);
  };

  // Gating Status Calculations:
  // Stage 1: Aadhaar Card (Primary Identity)
  const aadhaarDoc = documents.find((d) => d.document_type === 'Aadhaar Card');
  const isAadhaarVerified = aadhaarDoc?.verification?.status === 'verified';
  const aadhaarNeedsReview = aadhaarDoc?.verification?.status === 'needs_review' || aadhaarDoc?.verification?.status === 'failed';

  // Stage 2: Income Certificate (Socioeconomic Proof) - unlocked only after Aadhaar is verified
  const incomeDoc = documents.find((d) => d.document_type === 'Income Certificate');
  const isIncomeVerified = incomeDoc?.verification?.status === 'verified';

  // Stage 3: Bank Passbook & Caste Certificate
  const bankDoc = documents.find((d) => d.document_type === 'Bank Passbook');
  const casteDoc = documents.find((d) => d.document_type === 'Caste Certificate');

  // Helper: determine if a document type is gated/locked
  const getDocumentLockStatus = (type: string): { locked: boolean; reason?: string } => {
    if (type === 'Aadhaar Card' || type === 'Photo' || type === 'PAN Card') {
      return { locked: false };
    }
    if (type === 'Income Certificate') {
      if (!isAadhaarVerified) {
        return {
          locked: true,
          reason: 'Aadhaar Card must be uploaded and pass profile verification before Income Certificate can be uploaded.',
        };
      }
      return { locked: false };
    }
    if (type === 'Bank Passbook' || type === 'Caste Certificate') {
      if (!isAadhaarVerified) {
        return {
          locked: true,
          reason: 'Aadhaar Card must be uploaded and verified first.',
        };
      }
      if (!isIncomeVerified) {
        return {
          locked: true,
          reason: 'Income Certificate must be uploaded and verified before proceeding to Bank / Caste documents.',
        };
      }
      return { locked: false };
    }
    return { locked: false };
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    setError(null);

    // Gating check: block upload if document is locked
    const lockInfo = getDocumentLockStatus(selectedType);
    if (lockInfo.locked) {
      setError(lockInfo.reason || 'This document is locked. Please complete prior verification steps.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 15, 85));
      }, 150);

      const newDoc = await uploadDocument(
        user.id,
        selectedType,
        file,
        profile ? { full_name: profile.full_name, date_of_birth: profile.date_of_birth, gender: profile.gender } : undefined,
        (p) => setUploadProgress(p)
      );

      clearInterval(progressInterval);
      setUploadProgress(100);
      setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        runWorkflow(newDoc);
      }, 300);
    } catch (err: unknown) {
      console.error('Document upload error:', err);
      const msg = err instanceof Error ? err.message : 'Could not upload file. Please try again.';
      setError(msg);
      setUploading(false);
      setUploadProgress(0);
      setWorkflowStage(null);
    }
  };

  const handleDelete = async (doc: DocumentRecord) => {
    setDeleteTarget(doc);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const doc = deleteTarget;
    setFadingIds((prev) => new Set(prev).add(doc.id));

    setTimeout(async () => {
      try {
        await deleteDocument(doc.id, user?.id);
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      } catch {
        setError('Could not delete document.');
      } finally {
        setFadingIds((prev) => {
          const next = new Set(prev);
          next.delete(doc.id);
          return next;
        });
        setDeleteTarget(null);
      }
    }, 300);
  };

  const handleUpdateExtracted = async (docId: string, data: OcrExtractedData) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id === docId) {
          const updated = { ...d, extracted_data: data };
          if (user) {
            try {
              const cached = localStorage.getItem(`voicebridge_docs_${user.id}`);
              const list: DocumentRecord[] = cached ? JSON.parse(cached) : [];
              const nextList = list.map((item) => (item.id === docId ? updated : item));
              localStorage.setItem(`voicebridge_docs_${user.id}`, JSON.stringify(nextList));
            } catch {
              // ignore
            }
          }
          return updated;
        }
        return d;
      })
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  // Check if a document has extracted data for the verification view.
  const getExtractedFields = (doc: DocumentRecord): { label: string; value: string; status: 'match' | 'review' | 'missing' }[] => {
    if (!doc.extracted_data) return [];
    const data = doc.extracted_data as Record<string, string>;
    return Object.entries(data)
      .filter(([, v]) => v)
      .map(([key, value]) => ({
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value,
        status: 'match' as const,
      }));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Documents</h1>
        <p className="mt-1 text-sm text-primary-500 dark:text-primary-400">
          Upload and manage the documents used to auto-fill your applications.
          Each document goes through AI-powered OCR extraction.
        </p>
      </div>

      {/* Sequential Gated Upload Pipeline */}
      <div className="rounded-2xl border border-cream-200 bg-white p-5 shadow-sm dark:border-primary-700 dark:bg-primary-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-primary-500 dark:text-primary-400">
            Sequential Document Verification Pipeline
          </h2>
          <span className="text-xs text-primary-400 dark:text-primary-500">
            Per-document verification gating
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Stage 1: Aadhaar Card */}
          <div className={`rounded-xl border p-3.5 transition-all ${
            isAadhaarVerified
              ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
              : aadhaarNeedsReview
              ? 'border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20'
              : 'border-primary-300 bg-cream-50/60 dark:border-primary-600 dark:bg-primary-900/30'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-primary-500 dark:text-primary-400">Step 1 · Identity</span>
              {isAadhaarVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={13} /> Verified
                </span>
              ) : aadhaarNeedsReview ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={13} /> Needs Review
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-300">
                  Required First
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-bold text-primary-800 dark:text-cream-100">Aadhaar Card</p>
            <p className="mt-0.5 text-xs text-primary-500 dark:text-primary-400">
              {isAadhaarVerified
                ? 'Name & DOB matched with profile.'
                : aadhaarNeedsReview
                ? 'Discrepancy detected. Re-upload or edit profile.'
                : 'Upload first to unlock next documents.'}
            </p>
          </div>

          {/* Stage 2: Income Certificate */}
          <div className={`rounded-xl border p-3.5 transition-all ${
            isIncomeVerified
              ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
              : !isAadhaarVerified
              ? 'border-dashed border-primary-200 bg-cream-100/40 opacity-70 dark:border-primary-700 dark:bg-primary-900/10'
              : 'border-accent-300 bg-accent-50/40 dark:border-accent-800 dark:bg-accent-950/20'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-primary-500 dark:text-primary-400">Step 2 · Income</span>
              {isIncomeVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={13} /> Verified
                </span>
              ) : !isAadhaarVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-400 dark:text-primary-500">
                  <Lock size={12} /> Locked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-accent-600 dark:text-accent-400">
                  <Unlock size={12} /> Ready to Upload
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-bold text-primary-800 dark:text-cream-100">Income Certificate</p>
            <p className="mt-0.5 text-xs text-primary-500 dark:text-primary-400">
              {isIncomeVerified
                ? 'Income verified against profile.'
                : !isAadhaarVerified
                ? 'Locked until Aadhaar is verified.'
                : 'Unlocked! Upload to verify income.'}
            </p>
          </div>

          {/* Stage 3: Bank Passbook & Caste */}
          <div className={`rounded-xl border p-3.5 transition-all ${
            bankDoc?.verification?.status === 'verified' || casteDoc?.verification?.status === 'verified'
              ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20'
              : !isIncomeVerified
              ? 'border-dashed border-primary-200 bg-cream-100/40 opacity-70 dark:border-primary-700 dark:bg-primary-900/10'
              : 'border-accent-300 bg-accent-50/40 dark:border-accent-800 dark:bg-accent-950/20'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-primary-500 dark:text-primary-400">Step 3 · Bank / Caste</span>
              {bankDoc?.verification?.status === 'verified' || casteDoc?.verification?.status === 'verified' ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={13} /> Verified
                </span>
              ) : !isIncomeVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-400 dark:text-primary-500">
                  <Lock size={12} /> Locked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-accent-600 dark:text-accent-400">
                  <Unlock size={12} /> Ready to Upload
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-bold text-primary-800 dark:text-cream-100">Bank / Caste Certificate</p>
            <p className="mt-0.5 text-xs text-primary-500 dark:text-primary-400">
              {!isIncomeVerified
                ? 'Locked until Income Certificate is verified.'
                : 'Unlocked! Upload supporting certificates.'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-800 dark:bg-error-900/30 dark:text-error-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload area + workflow timeline */}
      <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white dark:border-primary-700 dark:bg-primary-800">
        {/* Document type selector */}
        <div className="border-b border-cream-100 p-5 dark:border-primary-700/50">
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-medium">Select Document to Upload</label>
            {getDocumentLockStatus(selectedType).locked && (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <Lock size={12} /> Gated Document — Complete Step 1 First
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {DOCUMENT_TYPES.map((type) => {
              const lockInfo = getDocumentLockStatus(type);
              const isLocked = lockInfo.locked;

              return (
                <button
                  key={type}
                  onClick={() => {
                    if (isLocked) {
                      setError(lockInfo.reason || 'This document is locked.');
                    } else {
                      setError(null);
                      setSelectedType(type);
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                    selectedType === type
                      ? 'bg-primary-700 text-cream-50 shadow-sm'
                      : isLocked
                      ? 'border border-dashed border-primary-200 bg-cream-100/50 text-primary-400 hover:bg-cream-100 dark:border-primary-700 dark:bg-primary-900/30 dark:text-primary-500'
                      : 'border border-primary-200 bg-white text-primary-500 hover:border-accent-400 hover:bg-cream-50 dark:border-primary-500 dark:bg-primary-800 dark:text-primary-200 dark:hover:bg-primary-700'
                  }`}
                >
                  {isLocked && <Lock size={12} className="text-primary-400" />}
                  <span>{type}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Drag-and-drop zone */}
        <div className="p-5">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && !workflowStage && fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all ${
              dragOver
                ? 'border-accent-500 bg-accent-50 scale-[1.01] dark:bg-accent-900/20'
                : uploading || workflowStage
                ? 'border-primary-200 opacity-70 dark:border-primary-500'
                : 'border-primary-200 hover:border-accent-400 hover:bg-cream-50 dark:border-primary-500 dark:hover:bg-primary-800/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = '';
              }}
            />
            <motion.div
              animate={dragOver ? { scale: 1.1 } : { scale: 1 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-100 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400"
            >
              <UploadCloud size={32} />
            </motion.div>
            <p className="mt-4 text-sm font-medium text-primary-700 dark:text-primary-200">
              {dragOver ? 'Drop file to upload' : 'Drop your document here'}
            </p>
            <p className="mt-1 text-sm text-accent-600 dark:text-accent-400">
              or <span className="font-semibold underline">Browse Files</span>
            </p>
            <p className="mt-2 text-xs text-primary-400 dark:text-primary-400">
              Upload as: {selectedType} · PDF · JPG · PNG
            </p>
          </div>

          {/* Upload progress bar */}
          {uploading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4"
            >
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-primary-500 dark:text-primary-400">
                  <Loader2 size={14} className="animate-spin" /> Uploading…
                </span>
                <span className="text-accent-600 dark:text-accent-400">{uploadProgress}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-cream-200 dark:bg-primary-700">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-700"
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* OCR workflow timeline */}
        <AnimatePresence>
          {workflowStage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-cream-100 bg-cream-50 p-5 dark:border-primary-700/50 dark:bg-primary-900/30"
            >
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-primary-400 dark:text-primary-400">
                Document Processing
              </p>
              <div className="flex items-center justify-between">
                {WORKFLOW_STAGES.map((stage, idx) => {
                  const currentIdx = WORKFLOW_STAGES.findIndex((s) => s.key === workflowStage);
                  const isDone = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  const Icon = stage.icon;

                  return (
                    <div key={stage.key} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center">
                        <motion.div
                          initial={false}
                          animate={{
                            scale: isCurrent ? [1, 1.15, 1] : 1,
                          }}
                          transition={{ duration: 1, repeat: isCurrent ? Infinity : 0 }}
                          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                            isDone
                              ? 'bg-success-500 text-cream-50'
                              : isCurrent
                              ? 'bg-accent-600 text-cream-50'
                              : 'bg-cream-200 text-primary-400 dark:bg-primary-700'
                          }`}
                        >
                          {isDone ? <CheckCircle2 size={18} /> : isCurrent ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
                        </motion.div>
                        <p className={`mt-2 text-xs font-medium ${isCurrent || isDone ? 'text-primary-700 dark:text-primary-200' : 'text-primary-400'}`}>
                          {stage.label}
                        </p>
                      </div>
                      {idx < WORKFLOW_STAGES.length - 1 && (
                        <div className={`mx-2 h-0.5 flex-1 rounded-full transition-colors ${isDone ? 'bg-success-500' : 'bg-cream-200 dark:bg-primary-700'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Document list */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Uploaded Documents {documents.length > 0 && `(${documents.length})`}
          </h2>
          {documents.some((d) => d.extracted_data) && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-success-600 dark:text-success-400">
              <ShieldCheck size={14} /> OCR processed
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-cream-200 bg-white py-12 dark:border-primary-700 dark:bg-primary-800">
            <Loader2 size={24} className="animate-spin text-primary-400" />
          </div>
        ) : documents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary-200 bg-white py-16 text-center dark:border-primary-500 dark:bg-primary-800"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cream-100 dark:bg-primary-700/50">
              <UploadCloud size={32} className="text-primary-400" />
            </div>
            <h3 className="mt-4 text-base font-semibold">No documents uploaded yet</h3>
            <p className="mt-2 max-w-sm text-sm text-primary-500 dark:text-primary-400">
              You haven't uploaded any documents yet. Upload your Aadhaar, PAN, income
              certificate, and other documents to auto-fill your scheme applications.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary mt-4"
            >
              <UploadCloud size={16} /> Upload Document
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {documents.map((doc) => (
              <div key={doc.id} className="relative">
                {extractingId === doc.id && (
                  <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-lg bg-accent-600 px-2.5 py-1 text-xs font-medium text-cream-50 shadow-sm">
                    <ScanLine size={12} className="animate-pulse" />
                    Extracting…
                  </div>
                )}
                <DocumentCard
                  document={doc}
                  onDelete={handleDelete}
                  onUpdateExtracted={handleUpdateExtracted}
                  fadingOut={fadingIds.has(doc.id)}
                />
                {/* Verify button for documents with extracted data */}
                {doc.extracted_data && (
                  <button
                    onClick={() => setVerifyDoc(doc)}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-cream-200 py-2 text-xs font-semibold text-accent-600 transition-all hover:bg-accent-50 dark:border-primary-700 dark:hover:bg-accent-900/20"
                  >
                    <FileCheck2 size={14} /> View Extracted Data
                    <ChevronRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document verification modal */}
      <AnimatePresence>
        {verifyDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-primary-900/40 p-4"
            onClick={() => setVerifyDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-soft-xl dark:bg-primary-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-cream-200 px-5 py-3 dark:border-primary-700">
                <div className="flex items-center gap-2">
                  <FileCheck2 size={20} className="text-accent-600" />
                  <h3 className="font-semibold">Document Verification</h3>
                </div>
                <button
                  onClick={() => setVerifyDoc(null)}
                  className="rounded-lg p-1.5 text-primary-400 transition-colors hover:bg-cream-100 dark:hover:bg-primary-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-5 p-5 sm:grid-cols-2">
                {/* Left: document info */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-400 dark:text-primary-400">
                    Document
                  </p>
                  <div className="flex items-center gap-3 rounded-xl border border-cream-200 p-4 dark:border-primary-700">
                    <FileText size={28} className="text-primary-600" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{verifyDoc.document_type}</p>
                      <p className="truncate text-xs text-primary-400 dark:text-primary-400">
                        {verifyDoc.file_name}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
                      verifyDoc.verification?.status === 'verified'
                        ? 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-300'
                        : verifyDoc.verification?.status === 'needs_review'
                        ? 'bg-warning-50 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
                        : 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                    }`}>
                      <ShieldCheck size={16} />
                      {verifyDoc.verification?.status === 'verified'
                        ? 'Verified — Matches Citizen Profile'
                        : verifyDoc.verification?.status === 'needs_review'
                        ? 'Needs Review — Discrepancy with Profile'
                        : 'PyMuPDF Text Extracted'}
                    </div>

                    {verifyDoc.verification?.details && verifyDoc.verification.details.length > 0 && (
                      <div className="rounded-lg bg-cream-50 p-2.5 text-xs text-primary-600 dark:bg-primary-900/40 dark:text-primary-300 space-y-1">
                        <p className="font-semibold text-primary-700 dark:text-cream-100">Verification Checks:</p>
                        {verifyDoc.verification.details.map((d, i) => (
                          <p key={i} className="flex items-start gap-1.5">
                            <span className="text-accent-500">•</span> {d}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: structured verification comparisons & extracted data */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-400 dark:text-primary-400">
                    Profile Consistency Verification
                  </p>

                  {verifyDoc.verification?.field_comparisons ? (
                    <div className="space-y-2.5">
                      {Object.entries(verifyDoc.verification.field_comparisons).map(([fieldKey, comp]) => {
                        if (!comp) return null;
                        const label = fieldKey === 'dob' || fieldKey === 'date_of_birth' ? 'Date of Birth' : fieldKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                        const isMatch = comp.status === 'match';
                        const isInsufficient = comp.status === 'insufficient_document_information';
                        const isMismatch = comp.status === 'mismatch';

                        return (
                          <div
                            key={fieldKey}
                            className={`rounded-xl border p-3 text-xs transition-all ${
                              isMatch
                                ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20'
                                : isInsufficient
                                ? 'border-amber-200 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20'
                                : isMismatch
                                ? 'border-rose-200 bg-rose-50/40 dark:border-rose-800 dark:bg-rose-950/20'
                                : 'border-cream-200 bg-cream-50/50 dark:border-primary-700 dark:bg-primary-900/20'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-primary-800 dark:text-cream-100">{label}</span>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isMatch
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : isInsufficient
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  : isMismatch
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                  : 'bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400'
                              }`}>
                                {isMatch ? 'Match' : isInsufficient ? 'Birth Year Only' : isMismatch ? 'Mismatch' : comp.status}
                              </span>
                            </div>

                            <div className="mt-1.5 grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-primary-400">Document:</span>{' '}
                                <span className="font-medium text-primary-700 dark:text-cream-200">
                                  {comp.document_value || 'Not found'}
                                </span>
                              </div>
                              <div>
                                <span className="text-primary-400">Profile:</span>{' '}
                                <span className="font-medium text-primary-700 dark:text-cream-200">
                                  {comp.profile_value || 'None'}
                                </span>
                              </div>
                            </div>

                            {comp.detail && (
                              <p className="mt-1.5 text-[11px] text-primary-500 dark:text-primary-400 border-t border-primary-100/50 pt-1 dark:border-primary-700/50">
                                {comp.detail}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {getExtractedFields(verifyDoc).length > 0 ? (
                        getExtractedFields(verifyDoc).map((field) => (
                          <div
                            key={field.label}
                            className="flex items-center justify-between rounded-lg border border-cream-200 px-3 py-2 dark:border-primary-700"
                          >
                            <div>
                              <p className="text-xs font-medium text-primary-400 dark:text-primary-400">{field.label}</p>
                              <p className="text-sm font-semibold text-primary-800 dark:text-cream-200">{field.value}</p>
                            </div>
                            <CheckCircle2 size={16} className="text-success-600" />
                          </div>
                        ))
                      ) : (
                        <p className="rounded-lg bg-cream-50 p-3 text-xs text-primary-400 dark:bg-primary-700/50 dark:text-primary-400">
                          No selectable text extracted from this document.
                        </p>
                      )}
                    </div>
                  )}

                  <p className="mt-4 rounded-lg bg-primary-50 p-2.5 text-[11px] leading-relaxed text-primary-500 dark:bg-primary-900/30 dark:text-primary-400">
                    <span className="font-semibold">Disclaimer:</span> Automated text consistency verification against profile completed. Official legal authenticity requires issuing authority or DigiLocker verification.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete document?"
        message={`Are you sure you want to delete "${deleteTarget?.document_type}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
