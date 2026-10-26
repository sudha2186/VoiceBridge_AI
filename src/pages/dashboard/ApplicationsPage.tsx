import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Download,
  Clock,
  CheckCircle2,
  Loader2,
  FilePlus2,
  Sparkles,
  Calendar,
  ExternalLink,
  User,
  Award,
  ScanLine,
  FileCheck2,
  PenLine,
  ScrollText,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Mic,
  Square,
  AlertCircle,
  HelpCircle,
  Edit2,
  Check
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getSchemes, Scheme } from '@/services/schemeService';
import {
  getApplications,
  createApplication,
  ApplicationRecord,
} from '@/services/applicationService';
import { getDocuments, DocumentRecord } from '@/services/documentService';
import { generateApplicationPdf } from '@/services/pdfService';
import { calculateAge } from '@/utils/ageUtils';
import {
  getOfficialSchemeConfig,
  OfficialSchemeFormConfig,
  SchemeFormField
} from '@/services/officialSchemeForms';

// Application wizard steps
const WIZARD_STEPS = [
  { icon: User, label: 'Profile', key: 'personal' },
  { icon: Award, label: 'Eligibility', key: 'eligibility' },
  { icon: FileText, label: 'Documents', key: 'documents' },
  { icon: ScanLine, label: 'Verification', key: 'verification' },
  { icon: PenLine, label: 'Official Form', key: 'form' },
  { icon: FileCheck2, label: 'Review', key: 'review' },
  { icon: ScrollText, label: 'Generate', key: 'generate' },
];

const STATUS_CONFIG: Record<string, {
  badge: string;
  icon: typeof Clock;
  label: string;
}> = {
  draft: {
    badge: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
    icon: Clock,
    label: 'Prepared Draft',
  },
  completed: {
    badge: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
    icon: CheckCircle2,
    label: 'Generated',
  },
};

export default function ApplicationsPage() {
  const [searchParams] = useSearchParams();
  const urlSchemeId = searchParams.get('scheme_id');

  const { user, profile } = useAuth();
  const { language, t } = useLanguage();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('');
  const [schemeFormData, setSchemeFormData] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Voice recording state for conversational missing-field input
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFieldKey, setRecordingFieldKey] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [apps, schemesData, docs] = await Promise.all([
        getApplications(user.id),
        getSchemes(),
        getDocuments(user.id),
      ]);
      setApplications(apps);
      setSchemes(schemesData);
      setDocuments(docs);

      if (urlSchemeId && schemesData.some((s) => s.id === urlSchemeId)) {
        setSelectedSchemeId(urlSchemeId);
      } else if (schemesData.length > 0 && !selectedSchemeId) {
        setSelectedSchemeId(schemesData[0].id);
      }
    } catch {
      setError('Could not load data.');
    } finally {
      setLoading(false);
    }
  }, [user, urlSchemeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update selected scheme if URL param changes
  useEffect(() => {
    if (urlSchemeId && schemes.some((s) => s.id === urlSchemeId)) {
      setSelectedSchemeId(urlSchemeId);
    }
  }, [urlSchemeId, schemes]);

  const activeScheme = schemes.find((s) => s.id === selectedSchemeId);
  const officialConfig: OfficialSchemeFormConfig | null = activeScheme
    ? getOfficialSchemeConfig(
        activeScheme.name || activeScheme.title,
        activeScheme.official_url || activeScheme.official_link || undefined,
        activeScheme.ministry || undefined
      )
    : null;

  // Determine missing required scheme-specific fields
  const missingSchemeFields = (officialConfig?.schemeSpecificFields || []).filter(
    (field) => field.required && (!schemeFormData[field.key] || schemeFormData[field.key].trim() === '')
  );

  const citizenAge = profile ? calculateAge(profile.date_of_birth) ?? profile.age : null;

  // Voice recording for missing field
  const startRecordingField = async (fieldKey: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAndSetField(fieldKey, audioBlob);
      };

      mr.start(200);
      setIsRecording(true);
      setRecordingFieldKey(fieldKey);
    } catch (err) {
      console.error('Microphone error:', err);
      setError('Could not access microphone.');
    }
  };

  const stopRecordingField = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingFieldKey(null);
    }
  };

  const transcribeAndSetField = async (fieldKey: string, audioBlob: Blob) => {
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'field_speech.webm');
      formData.append('language', language);

      const res = await fetch('/api/asr/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Transcription failed');
      }

      const json = await res.json();
      if (json.success && json.text) {
        // Strip trailing punctuation
        const clean = json.text.replace(/[।.,!?]/g, '').trim();
        setSchemeFormData((prev) => ({ ...prev, [fieldKey]: clean }));
      }
    } catch (e: any) {
      console.warn('ASR notice for field:', e.message);
    } finally {
      setTranscribing(false);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setSchemeFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleGeneratePdf = async () => {
    if (!user || !profile || !activeScheme) return;

    if (missingSchemeFields.length > 0) {
      setError(`Please provide all required fields before generating application (${missingSchemeFields.map(f => f.label[language] || f.label.en).join(', ')}).`);
      return;
    }

    setGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const { application } = await createApplication(
        user.id,
        activeScheme,
        profile,
        documents,
        schemeFormData
      );
      setApplications((prev) => [application, ...prev]);
      setSuccess(`Application prepared and PDF downloaded for ${activeScheme.name || activeScheme.title}.`);
      setTimeout(() => setSuccess(null), 6000);
    } catch {
      setError('Could not generate official application draft. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = (app: ApplicationRecord) => {
    try {
      const scheme = schemes.find((s) => s.id === app.scheme_id) || app.scheme;
      if (!scheme) {
        setError('Scheme information unavailable for download.');
        return;
      }
      const activeProfile = profile || (app.form_data?.profile_snapshot as any);
      if (!activeProfile) {
        setError('Profile information unavailable.');
        return;
      }
      const appId = app.form_data?.application_id || `APP-${app.id.slice(0, 8).toUpperCase()}`;
      const customData = app.form_data?.scheme_particulars as Record<string, any> || {};
      const doc = generateApplicationPdf(activeProfile, scheme, documents, appId, customData);
      doc.save(`${appId}_${(scheme.name || scheme.title || 'Scheme').replace(/\s+/g, '_')}.pdf`);
      setSuccess(`Application PDF downloaded for ${scheme.name || scheme.title}.`);
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError('Could not download PDF. Please try again.');
    }
  };

  const sortedApplications = [...applications].sort(
    (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Official Scheme Applications</h1>
        <p className="mt-1 text-sm text-primary-500 dark:text-primary-400">
          Autofill and preview verified official government welfare scheme applications.
          Review all mapped profile information, collect required scheme details, and download your prepared application draft.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-800 dark:bg-error-900/30 dark:text-error-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-success-200 bg-success-50 p-3 text-sm text-success-700 dark:border-success-800 dark:bg-success-900/30 dark:text-success-300">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Scheme Selector */}
      <div className="rounded-2xl border border-cream-200 bg-white p-5 shadow-sm dark:border-primary-700 dark:bg-primary-800">
        <label className="mb-2 block text-sm font-semibold">Select Welfare Scheme</label>
        <select
          value={selectedSchemeId}
          onChange={(e) => setSelectedSchemeId(e.target.value)}
          className="input-field cursor-pointer font-medium"
        >
          {schemes.map((scheme) => (
            <option key={scheme.id} value={scheme.id}>
              {scheme.name || scheme.title} ({scheme.ministry || 'Govt of India'})
            </option>
          ))}
        </select>
      </div>

      {/* Official Scheme Application Form Workflow */}
      {activeScheme && officialConfig && (
        <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-soft dark:border-primary-700 dark:bg-primary-800">
          {/* Official Ministry Banner */}
          <div className="border-b border-cream-200 bg-gradient-to-r from-primary-900 to-primary-800 p-6 text-cream-50">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-cream-200 backdrop-blur-sm">
                  <Building2 size={13} /> {officialConfig.ministry}
                </span>
                <h2 className="mt-2 text-xl font-bold">{officialConfig.schemeName}</h2>
                <p className="mt-0.5 text-xs text-primary-200">{officialConfig.formCode}</p>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span className="rounded-md bg-accent-500/20 border border-accent-400/30 px-2.5 py-1 text-xs font-semibold text-accent-200">
                  Application Mode: {officialConfig.applicationMode}
                </span>
                <a
                  href={officialConfig.officialPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent-300 hover:underline"
                >
                  <ExternalLink size={12} /> Official Portal: {officialConfig.officialPortalUrl}
                </a>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Step 1: Mapped Profile Information (Verified) */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300 flex items-center gap-1.5">
                  <User size={16} className="text-accent-600" />
                  1. Applicant Demographics (Autofilled from Profile)
                </h3>
                <Link
                  to="/dashboard/profile"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent-600 hover:underline dark:text-accent-400"
                >
                  <Edit2 size={12} /> Edit Profile
                </Link>
              </div>

              {profile ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border border-cream-200 bg-cream-50/50 p-4 dark:border-primary-700 dark:bg-primary-900/20 text-xs">
                  <div>
                    <span className="text-primary-400">Full Name</span>
                    <p className="font-semibold text-primary-800 dark:text-cream-100">{profile.full_name || '—'}</p>
                  </div>
                  <div>
                    <span className="text-primary-400">Date of Birth & Age</span>
                    <p className="font-semibold text-primary-800 dark:text-cream-100">
                      {profile.date_of_birth || '—'} {citizenAge !== null && `(${citizenAge} yrs)`}
                    </p>
                  </div>
                  <div>
                    <span className="text-primary-400">Gender</span>
                    <p className="font-semibold text-primary-800 dark:text-cream-100">{profile.gender || '—'}</p>
                  </div>
                  <div>
                    <span className="text-primary-400">Mobile Number</span>
                    <p className="font-semibold text-primary-800 dark:text-cream-100">{profile.phone || '—'}</p>
                  </div>
                  <div>
                    <span className="text-primary-400">Domicile State</span>
                    <p className="font-semibold text-primary-800 dark:text-cream-100">{profile.state || '—'}</p>
                  </div>
                  <div>
                    <span className="text-primary-400">District</span>
                    <p className="font-semibold text-primary-800 dark:text-cream-100">{profile.district || '—'}</p>
                  </div>
                  <div>
                    <span className="text-primary-400">Occupation</span>
                    <p className="font-semibold text-primary-800 dark:text-cream-100">{profile.occupation || '—'}</p>
                  </div>
                  <div>
                    <span className="text-primary-400">Annual Income</span>
                    <p className="font-semibold text-primary-800 dark:text-cream-100">
                      {profile.has_personal_income === false ? (
                        <>
                          <span className="block text-primary-600 dark:text-cream-300">₹0 (Personal)</span>
                          <span className="text-[11px] text-accent-600 dark:text-accent-400">
                            Parent/Guardian: ₹{profile.guardian_income ? Number(profile.guardian_income).toLocaleString('en-IN') : '0'}
                          </span>
                        </>
                      ) : profile.annual_income != null ? (
                        `₹${profile.annual_income.toLocaleString('en-IN')}`
                      ) : (
                        '—'
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 text-xs text-warning-700 dark:border-warning-800 dark:bg-warning-900/20">
                  Profile information incomplete. Please complete your profile first.
                </div>
              )}
            </div>

            {/* Step 2: Conversational Missing Scheme-Specific Fields */}
            <div>
              <div className="mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300 flex items-center gap-1.5">
                  <PenLine size={16} className="text-accent-600" />
                  2. Scheme-Specific Required Particulars
                </h3>
                <p className="mt-0.5 text-xs text-primary-500 dark:text-primary-400">
                  You can type or speak in English, Hindi, or Marathi using the microphone button.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {officialConfig.schemeSpecificFields.map((field) => {
                  const val = schemeFormData[field.key] || '';
                  const isCurrentRecording = isRecording && recordingFieldKey === field.key;
                  const labelText = field.label[language] || field.label.en;
                  const placeholderText = field.placeholder ? (field.placeholder[language] || field.placeholder.en) : '';
                  const promptText = field.promptQuestion ? (field.promptQuestion[language] || field.promptQuestion.en) : null;

                  return (
                    <div
                      key={field.key}
                      className="rounded-xl border border-cream-200 bg-white p-4 shadow-sm dark:border-primary-700 dark:bg-primary-900/30"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-primary-800 dark:text-cream-100">
                          {labelText} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        {val && <CheckCircle2 size={13} className="text-emerald-500" />}
                      </div>

                      {promptText && (
                        <p className="text-[11px] text-accent-600 dark:text-accent-400 mb-2 italic">
                          "{promptText}"
                        </p>
                      )}

                      {field.type === 'select' && field.options ? (
                        <select
                          value={val}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          className="input-field text-xs py-2"
                        >
                          <option value="">Select option...</option>
                          {field.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label[language] || opt.label.en}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="relative flex items-center">
                          <input
                            type={field.type === 'number' ? 'number' : 'text'}
                            value={val}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            placeholder={placeholderText}
                            className="input-field text-xs py-2 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (isCurrentRecording) stopRecordingField();
                              else startRecordingField(field.key);
                            }}
                            className={`absolute right-1.5 p-1.5 rounded-lg transition-colors ${
                              isCurrentRecording
                                ? 'bg-rose-500 text-white animate-pulse'
                                : 'text-primary-400 hover:bg-cream-100 dark:hover:bg-primary-700'
                            }`}
                            title="Speak with microphone (Whisper Small)"
                          >
                            {isCurrentRecording ? <Square size={13} /> : <Mic size={13} />}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Required & Attached Documents Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-accent-600" />
                  3. Scheme Document Checklist & Verification Status
                </h3>
                <Link
                  to="/dashboard/documents"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent-600 hover:underline dark:text-accent-400"
                >
                  <FilePlus2 size={12} /> Manage Documents
                </Link>
              </div>

              {/* Scheme requirements matching */}
              {activeScheme.document_requirements && activeScheme.document_requirements.length > 0 ? (
                <div className="space-y-2">
                  {activeScheme.document_requirements.map((req, reqIdx) => {
                    const isAttached = documents.some(
                      (d) =>
                        d.document_type.toLowerCase().includes(req.name.toLowerCase()) ||
                        req.name.toLowerCase().includes(d.document_type.toLowerCase()) ||
                        (req.name.toLowerCase().includes('income') && d.document_type.toLowerCase().includes('income')) ||
                        (req.name.toLowerCase().includes('aadhaar') && d.document_type.toLowerCase().includes('aadhaar')) ||
                        (req.name.toLowerCase().includes('caste') && d.document_type.toLowerCase().includes('caste')) ||
                        (req.name.toLowerCase().includes('bank') && (d.document_type.toLowerCase().includes('bank') || d.document_type.toLowerCase().includes('passbook')))
                    );
                    const matchingDoc = documents.find(
                      (d) =>
                        d.document_type.toLowerCase().includes(req.name.toLowerCase()) ||
                        req.name.toLowerCase().includes(d.document_type.toLowerCase()) ||
                        (req.name.toLowerCase().includes('income') && d.document_type.toLowerCase().includes('income')) ||
                        (req.name.toLowerCase().includes('aadhaar') && d.document_type.toLowerCase().includes('aadhaar'))
                    );
                    const isVerified = matchingDoc?.verification?.status === 'verified';

                    return (
                      <div
                        key={`${req.name}-${reqIdx}`}
                        className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 text-xs ${
                          isVerified
                            ? 'border-emerald-200 bg-emerald-50/40 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'
                            : isAttached
                            ? 'border-blue-200 bg-blue-50/40 text-blue-900 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300'
                            : req.status === 'required'
                            ? 'border-amber-200 bg-amber-50/40 text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300'
                            : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText size={14} className="shrink-0" />
                          <div>
                            <span className="font-semibold">{req.name}</span>
                            {profile?.has_personal_income === false && req.name.toLowerCase().includes('income') && (
                              <span className="block text-[11px] text-accent-600 dark:text-accent-400 font-normal">
                                (Parent / Guardian Income Certificate applicable)
                              </span>
                            )}
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{req.reason}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                              req.status === 'required'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {req.status}
                          </span>
                          <span className="text-[10px] font-bold">
                            {isVerified ? '✓ Verified' : isAttached ? '✓ Attached' : 'Not Uploaded'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {documents.map((doc) => {
                    const isVer = doc.verification?.status === 'verified';
                    return (
                      <div
                        key={doc.id}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                          isVer
                            ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'
                            : 'border-cream-200 bg-cream-50 text-primary-700 dark:border-primary-700 dark:bg-primary-900/30 dark:text-cream-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={14} />
                          <span className="font-semibold truncate">{doc.document_type}</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase">
                          {isVer ? 'Verified' : 'Attached'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 4: Official Submission Notice & Instructions */}
            <div className="rounded-xl border border-primary-200 bg-cream-50/70 p-4 text-xs text-primary-600 dark:border-primary-700 dark:bg-primary-900/40 dark:text-primary-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-primary-800 dark:text-cream-100">
                <HelpCircle size={15} className="text-accent-600" />
                <span>Official Government Submission Instructions</span>
              </div>
              <p>
                {officialConfig.submissionGuidance[language] || officialConfig.submissionGuidance.en}
              </p>
              <p className="text-[11px] text-primary-500 dark:text-primary-400">
                <span className="font-semibold">Notice:</span> Downloading this PDF prepares a complete, verified application form.
                To complete your official legal application, visit <a href={officialConfig.officialPortalUrl} target="_blank" rel="noreferrer" className="underline font-bold text-accent-600">{officialConfig.officialPortalUrl}</a> or hand over the printed form at your designated block/panchayat office.
              </p>
            </div>

            {/* Generate & Download CTA */}
            <div className="pt-2">
              <button
                onClick={handleGeneratePdf}
                disabled={generating || !profile}
                className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-soft-lg"
              >
                {generating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Preparing Official Application Form & Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Generate & Download Official Scheme Application PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application history */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Prepared Application Records</h2>

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-cream-200 bg-white py-12 dark:border-primary-700 dark:bg-primary-800">
            <Loader2 size={24} className="animate-spin text-primary-400" />
          </div>
        ) : sortedApplications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary-200 bg-white py-16 text-center dark:border-primary-500 dark:bg-primary-800"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30">
              <FileText size={32} className="text-primary-700 dark:text-primary-400" />
            </div>
            <h3 className="mt-4 text-base font-semibold">No applications prepared yet</h3>
            <p className="mt-2 max-w-sm text-sm text-primary-500 dark:text-primary-400">
              Select a recommended welfare scheme above to generate and autofill your official application form.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {sortedApplications.map((app, idx) => {
              const status = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.draft;
              const StatusIcon = status.icon;
              const scheme = app.scheme;
              const appDate = new Date(app.created_at || Date.now()).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-cream-200 bg-white p-5 transition-all hover:shadow-soft dark:border-primary-700 dark:bg-primary-800"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-primary-900 dark:text-cream-100">
                        {(scheme?.name || scheme?.title) ?? 'Government Welfare Scheme'}
                      </h3>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${status.badge}`}
                      >
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </div>
                    {scheme?.ministry && (
                      <p className="mt-0.5 text-xs text-primary-400 dark:text-primary-400">
                        {scheme.ministry}
                      </p>
                    )}
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-primary-400 dark:text-primary-400">
                      <Calendar size={12} />
                      Prepared on {appDate}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => handleDownload(app)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-2 text-xs font-semibold text-cream-50 transition-all hover:bg-accent-700 hover:scale-105"
                    >
                      <Download size={14} />
                      Download PDF
                    </button>
                    {(scheme?.official_url || scheme?.official_link) && (
                      <a
                        href={(scheme?.official_url || scheme?.official_link) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 px-3 py-2 text-xs font-semibold text-primary-500 transition-all hover:bg-cream-50 hover:scale-105 dark:border-primary-500 dark:text-primary-200 dark:hover:bg-primary-700"
                      >
                        <ExternalLink size={14} />
                        Official Portal
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
