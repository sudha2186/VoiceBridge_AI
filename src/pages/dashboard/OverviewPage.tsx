import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  FileText,
  FolderOpen,
  ArrowRight,
  CheckCircle2,
  FileEdit,
  Sparkles,
  Award,
  Upload,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  X,
  User,
  ScanLine,
  PenLine,
  ScrollText,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getSchemes, Scheme } from '@/services/schemeService';
import { checkAllEligibility, EligibilityResult } from '@/services/eligibilityService';
import { getDocuments, DocumentRecord } from '@/services/documentService';
import { getApplications, ApplicationRecord } from '@/services/applicationService';

// Journey steps shown in the "Continue your application" timeline.
const JOURNEY_STEPS = [
  { icon: User, label: 'Profile', key: 'profile' },
  { icon: Award, label: 'Eligibility', key: 'eligibility' },
  { icon: FileText, label: 'Documents', key: 'documents' },
  { icon: ScanLine, label: 'Verification', key: 'verification' },
  { icon: PenLine, label: 'Application', key: 'application' },
];

const PROFILE_FIELD_LABELS: Record<string, string> = {
  full_name: 'Full Name',
  date_of_birth: 'Date of Birth',
  gender: 'Gender',
  state: 'State',
  district: 'District',
  occupation: 'Occupation',
  annual_income: 'Annual Income',
  category: 'Category',
  disability_status: 'Disability Status',
  phone: 'Phone Number',
};

const PROFILE_FIELDS = Object.keys(PROFILE_FIELD_LABELS);

export default function OverviewPage() {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileDetails, setShowProfileDetails] = useState(false);
  const [expandedScheme, setExpandedScheme] = useState<string | null>(null);
  const [schemeTab, setSchemeTab] = useState<'eligible' | 'needs_info' | 'not_eligible'>('eligible');

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [s, d, a] = await Promise.all([
          getSchemes(),
          getDocuments(user.id),
          getApplications(user.id),
        ]);
        setSchemes(s);
        setDocuments(d);
        setApplications(a);
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const { completionPct, missingFields } = useMemo(() => {
    if (!profile) return { completionPct: 0, missingFields: [] as string[] };
    const filled = PROFILE_FIELDS.filter((f) => {
      const val = (profile as unknown as Record<string, unknown>)[f];
      return val !== null && val !== undefined && val !== '';
    });
    const missing = PROFILE_FIELDS.filter((f) => {
      const val = (profile as unknown as Record<string, unknown>)[f];
      return val === null || val === undefined || val === '';
    }).map((f) => PROFILE_FIELD_LABELS[f]);
    return {
      completionPct: Math.round((filled.length / PROFILE_FIELDS.length) * 100),
      missingFields: missing,
    };
  }, [profile]);

  const eligibilityResults: EligibilityResult[] | null = useMemo(() => {
    if (!profile || schemes.length === 0) return null;
    return checkAllEligibility(profile, schemes, language);
  }, [profile, schemes, language]);

  const eligibleSchemes = eligibilityResults?.filter((r) => r.status === 'eligible') ?? [];
  const needsInfoSchemes = eligibilityResults?.filter((r) => r.status === 'needs_more_information' || r.status === 'partially_eligible') ?? [];
  const notEligibleSchemes = eligibilityResults?.filter((r) => r.status === 'not_eligible') ?? [];
  const partialSchemes = needsInfoSchemes;
  const draftCount = applications.filter((a) => a.status === 'draft').length;
  const completedCount = applications.filter((a) => a.status === 'completed').length;
  const docsNeedingAttention = documents.filter((d) => !d.extracted_data).length;

  // Determine journey progress.
  const journeyProgress = useMemo(() => {
    const steps = JOURNEY_STEPS.map((step) => {
      let done = false;
      if (step.key === 'profile') done = completionPct >= 80;
      if (step.key === 'eligibility') done = eligibleSchemes.length > 0;
      if (step.key === 'documents') done = documents.length > 0;
      if (step.key === 'verification') done = documents.some((d) => d.extracted_data);
      if (step.key === 'application') done = applications.length > 0;
      return { ...step, done };
    });
    const currentIdx = steps.findIndex((s) => !s.done);
    return { steps, currentIdx: currentIdx === -1 ? steps.length : currentIdx };
  }, [completionPct, eligibleSchemes.length, documents, applications]);

  const ringRadius = 36;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (completionPct / 100) * ringCircumference;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 to-primary-800 p-6 text-cream-50 sm:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Hello, {firstName}</h1>
            <p className="mt-2 max-w-lg text-primary-100">
              Here's what needs your attention.
            </p>
            <Link
              to="/dashboard/assistant"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 transition-all hover:scale-105 hover:bg-primary-50"
            >
              <Bot size={16} /> Talk to AI Assistant
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cream-50/10 px-4 py-3 text-center">
              <Sparkles size={20} className="mx-auto text-accent-300" />
              <p className="mt-1 text-2xl font-bold">{eligibleSchemes.length}</p>
              <p className="text-xs text-primary-200">eligible schemes</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Status cards row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Profile completion */}
        <div
          className="group cursor-pointer rounded-2xl border border-cream-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft dark:border-primary-700 dark:bg-primary-800 lg:col-span-2"
          onClick={() => setShowProfileDetails((v) => !v)}
        >
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r={ringRadius} fill="none" strokeWidth="7" className="stroke-cream-200 dark:stroke-primary-700" />
                <motion.circle
                  cx="48" cy="48" r={ringRadius} fill="none" strokeWidth="7" strokeLinecap="round"
                  className="stroke-accent-600"
                  initial={{ strokeDashoffset: ringCircumference }}
                  animate={{ strokeDashoffset: ringOffset }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  style={{ strokeDasharray: ringCircumference }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-primary-800 dark:text-cream-100">{completionPct}%</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary-700 dark:text-cream-200">Profile Completion</p>
              <p className="mt-1 text-sm text-primary-400 dark:text-primary-400">
                {completionPct === 100 ? 'Complete!' : `${missingFields.length} field${missingFields.length > 1 ? 's' : ''} remaining`}
              </p>
              <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-accent-600 dark:text-accent-400">
                {showProfileDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {completionPct === 100 ? 'View profile' : 'Complete profile'}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showProfileDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden border-t border-cream-100 pt-4 dark:border-primary-700"
              >
                {missingFields.length > 0 ? (
                  <>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary-400 dark:text-primary-400">Missing fields</p>
                    <div className="flex flex-wrap gap-2">
                      {missingFields.map((field) => (
                        <span key={field} className="inline-flex items-center gap-1 rounded-full bg-warning-100 px-3 py-1 text-xs font-medium text-warning-700 dark:bg-warning-900/30 dark:text-warning-400">
                          <AlertCircle size={12} /> {field}
                        </span>
                      ))}
                    </div>
                    <Link to="/dashboard/profile" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800 dark:text-primary-400">
                      Go to profile <ArrowRight size={14} />
                    </Link>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-success-600 dark:text-success-400">
                    <CheckCircle2 size={16} /> All profile fields are complete.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Scheme matches */}
        <Link to="/dashboard/assistant" className="group rounded-2xl border border-cream-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft dark:border-primary-700 dark:bg-primary-800">
          <Award size={24} className="text-accent-600" />
          <p className="mt-3 text-2xl font-bold">{loading ? '—' : eligibleSchemes.length + partialSchemes.length}</p>
          <p className="text-xs text-primary-400 dark:text-primary-400">potential matches</p>
          <span className="mt-2 flex items-center gap-1 text-xs font-medium text-accent-600 dark:text-accent-400">
            Explore <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        {/* Documents */}
        <Link to="/dashboard/documents" className="group rounded-2xl border border-cream-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft dark:border-primary-700 dark:bg-primary-800">
          <FolderOpen size={24} className="text-primary-600" />
          <p className="mt-3 text-2xl font-bold">{loading ? '—' : documents.length}</p>
          <p className="text-xs text-primary-400 dark:text-primary-400">
            {docsNeedingAttention > 0 ? `${docsNeedingAttention} need attention` : 'all processed'}
          </p>
          <span className="mt-2 flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400">
            Manage <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </div>

      {/* Continue your application — journey timeline */}
      <div className="rounded-2xl border border-cream-200 bg-white p-6 dark:border-primary-700 dark:bg-primary-800">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Continue Your Application</h2>
          {journeyProgress.currentIdx < journeyProgress.steps.length && (
            <Link to="/dashboard/applications" className="flex items-center gap-1 text-sm font-medium text-primary-700 dark:text-primary-400">
              Go <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {/* Desktop: horizontal timeline */}
        <div className="hidden items-center justify-between sm:flex">
          {journeyProgress.steps.map((step, idx) => {
            const isDone = step.done;
            const isCurrent = idx === journeyProgress.currentIdx && !isDone;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 2, repeat: isCurrent ? Infinity : 0 }}
                    className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                      isDone
                        ? 'bg-success-500 text-cream-50'
                        : isCurrent
                        ? 'bg-primary-700 text-cream-50 ring-4 ring-primary-200 dark:ring-primary-900/40'
                        : 'bg-cream-100 text-primary-400 dark:bg-primary-700'
                    }`}
                  >
                    {isDone ? <CheckCircle2 size={20} /> : <Icon size={18} />}
                  </motion.div>
                  <p className={`mt-2 text-xs font-medium ${isCurrent || isDone ? 'text-primary-700 dark:text-primary-200' : 'text-primary-400'}`}>
                    {step.label}
                  </p>
                </div>
                {idx < journeyProgress.steps.length - 1 && (
                  <div className={`mx-2 h-0.5 flex-1 rounded-full transition-colors ${isDone ? 'bg-success-500' : 'bg-cream-200 dark:bg-primary-700'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile: vertical timeline */}
        <div className="space-y-3 sm:hidden">
          {journeyProgress.steps.map((step, idx) => {
            const isDone = step.done;
            const isCurrent = idx === journeyProgress.currentIdx && !isDone;
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  isDone ? 'bg-success-500 text-cream-50' : isCurrent ? 'bg-primary-700 text-cream-50' : 'bg-cream-100 text-primary-400 dark:bg-primary-700'
                }`}>
                  {isDone ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                </div>
                <span className={`text-sm ${isCurrent || isDone ? 'font-medium text-primary-700 dark:text-primary-200' : 'text-primary-400'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scheme recommendations */}
      <div id="schemes" className="scroll-mt-6">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Award size={20} className="text-accent-600" />
              Scheme Recommendations
            </h2>
            <p className="text-xs text-primary-400 dark:text-primary-400">
              Personalized matching based on your verified age, income, occupation, and disability status.
            </p>
          </div>
          <Link to="/dashboard/assistant" className="flex items-center gap-1 text-sm font-medium text-primary-700 dark:text-primary-400">
            Explore with AI Assistant <ArrowRight size={14} />
          </Link>
        </div>

        {/* Status Category Tabs */}
        {eligibilityResults && eligibilityResults.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2 border-b border-cream-200 pb-3 dark:border-primary-700">
            <button
              onClick={() => setSchemeTab('eligible')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                schemeTab === 'eligible'
                  ? 'bg-success-600 text-white shadow-soft'
                  : 'bg-cream-100 text-primary-600 hover:bg-cream-200 dark:bg-primary-700 dark:text-cream-200'
              }`}
            >
              <CheckCircle2 size={14} />
              Eligible ({eligibleSchemes.length})
            </button>
            <button
              onClick={() => setSchemeTab('needs_info')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                schemeTab === 'needs_info'
                  ? 'bg-warning-600 text-white shadow-soft'
                  : 'bg-cream-100 text-primary-600 hover:bg-cream-200 dark:bg-primary-700 dark:text-cream-200'
              }`}
            >
              <AlertCircle size={14} />
              Needs More Info ({needsInfoSchemes.length})
            </button>
            <button
              onClick={() => setSchemeTab('not_eligible')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                schemeTab === 'not_eligible'
                  ? 'bg-primary-700 text-white shadow-soft'
                  : 'bg-cream-100 text-primary-600 hover:bg-cream-200 dark:bg-primary-700 dark:text-cream-200'
              }`}
            >
              <X size={14} />
              Not Eligible ({notEligibleSchemes.length})
            </button>
          </div>
        )}

        {eligibilityResults && eligibilityResults.length > 0 ? (
          (() => {
            const currentList =
              schemeTab === 'eligible'
                ? eligibleSchemes
                : schemeTab === 'needs_info'
                ? needsInfoSchemes
                : notEligibleSchemes;

            if (currentList.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cream-300 bg-white py-10 text-center text-primary-400 dark:border-primary-700 dark:bg-primary-800">
                  <Sparkles size={24} className="text-accent-500 mb-2" />
                  <p className="text-sm font-semibold text-primary-700 dark:text-cream-100">
                    No schemes in this category.
                  </p>
                  <p className="mt-1 text-xs text-primary-400">
                    {schemeTab === 'eligible'
                      ? 'Update your profile to unlock more welfare schemes.'
                      : schemeTab === 'needs_info'
                      ? 'All matching criteria have sufficient profile information.'
                      : 'You do not have any rejected schemes.'}
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {currentList.map((result, idx) => {
                  const isExpanded = expandedScheme === result.scheme.id;
                  const isEligible = result.status === 'eligible';
                  const isNeedsInfo =
                    result.status === 'needs_more_information' || result.status === 'partially_eligible';

                  const borderClass = isEligible
                    ? 'border-l-success-500'
                    : isNeedsInfo
                    ? 'border-l-warning-500'
                    : 'border-l-error-500';

                  const badgeClass = isEligible
                    ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                    : isNeedsInfo
                    ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400'
                    : 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400';

                  const badgeLabel = isEligible ? 'Eligible' : isNeedsInfo ? 'Needs Info' : 'Not Eligible';

                  return (
                    <motion.div
                      key={result.scheme.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`cursor-pointer rounded-xl border border-cream-200 bg-white p-5 border-l-4 transition-all hover:-translate-y-0.5 hover:shadow-soft dark:border-primary-700 dark:bg-primary-800 ${borderClass}`}
                      onClick={() => setExpandedScheme(isExpanded ? null : result.scheme.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-primary-900 dark:text-cream-100">
                            {result.scheme.title}
                          </h3>
                          {result.scheme.ministry && (
                            <p className="mt-0.5 text-xs text-primary-400 dark:text-primary-400">
                              {result.scheme.ministry}
                            </p>
                          )}
                        </div>
                        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
                          {isEligible ? <CheckCircle2 size={12} /> : isNeedsInfo ? <AlertCircle size={12} /> : <X size={12} />}
                          {badgeLabel}
                        </span>
                      </div>

                      {/* Primary explanation reason */}
                      <p className="mt-2 text-xs font-medium text-primary-600 dark:text-cream-200">
                        {result.reasons[0]}
                      </p>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 overflow-hidden border-t border-cream-100 pt-3 dark:border-primary-700 space-y-3"
                          >
                            {result.scheme.benefits && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-primary-400 dark:text-primary-400">
                                  Benefits
                                </p>
                                <p className="mt-0.5 text-xs text-primary-600 dark:text-primary-300">
                                  {result.scheme.benefits}
                                </p>
                              </div>
                            )}

                            {/* Detailed eligibility breakdown */}
                            {result.reasons.length > 1 && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-primary-400 dark:text-primary-400">
                                  Eligibility Criteria Evaluation
                                </p>
                                <ul className="mt-1 space-y-1 text-xs text-primary-600 dark:text-primary-300">
                                  {result.reasons.map((r, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <span className="text-accent-500">•</span> {r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {result.scheme.required_documents && result.scheme.required_documents.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-primary-400 dark:text-primary-400">
                                  Required Documents
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {result.scheme.required_documents.map((doc) => (
                                    <span
                                      key={doc}
                                      className="inline-flex items-center gap-1 rounded-md bg-cream-100 px-2 py-0.5 text-xs font-medium text-primary-500 dark:bg-primary-700/50 dark:text-primary-200"
                                    >
                                      <FileText size={10} /> {doc}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-cream-100 dark:border-primary-700/50">
                              {(result.scheme.official_url || result.scheme.official_link) && (
                                <a
                                  href={(result.scheme.official_url || result.scheme.official_link) || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink size={14} /> Official Government Portal
                                </a>
                              )}

                              {isEligible && (
                                <Link
                                  to={`/dashboard/applications?scheme_id=${result.scheme.id}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span>Apply for Scheme</span>
                                  <ArrowRight size={13} />
                                </Link>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!isExpanded && (
                        <p className="mt-2 flex items-center gap-1 text-xs text-primary-400 dark:text-primary-400">
                          <ChevronRight size={12} /> View criteria breakdown
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            );
          })()
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-cream-200 bg-white py-8 px-4 text-primary-400 dark:border-primary-700 dark:bg-primary-800 dark:text-primary-400">
            <Sparkles size={20} className="text-accent-500 shrink-0" />
            <span className="text-sm">
              Complete your profile to discover eligible government welfare schemes.
            </span>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { to: '/dashboard/assistant', icon: Bot, title: 'Talk to AI Assistant', desc: 'Find schemes by chatting with our AI.', color: 'from-primary-600 to-primary-800' },
            { to: '/dashboard/documents', icon: Upload, title: 'Upload Documents', desc: 'Upload and OCR-process your documents.', color: 'from-accent-500 to-accent-700' },
            { to: '/dashboard/applications', icon: FileText, title: 'My Applications', desc: 'View and track your applications.', color: 'from-primary-500 to-accent-600' },
          ].map((action) => (
            <Link key={action.to} to={action.to} className="group overflow-hidden rounded-2xl border border-cream-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-soft-lg dark:border-primary-700 dark:bg-primary-800">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} text-cream-50 shadow-soft transition-transform group-hover:scale-110`}>
                <action.icon size={24} />
              </div>
              <h3 className="mt-4 font-semibold">{action.title}</h3>
              <p className="mt-1 text-sm text-primary-500 dark:text-primary-400">{action.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-600">
                Open <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Trust banner */}
      <div className="flex items-center gap-3 rounded-xl bg-cream-50 p-4 dark:bg-primary-800/50">
        <ShieldCheck size={20} className="shrink-0 text-success-600" />
        <p className="text-sm text-primary-500 dark:text-primary-400">
          Your data is encrypted and never shared without your consent. SahAIta never auto-submits to government portals — you stay in control.
        </p>
      </div>
    </div>
  );
}
