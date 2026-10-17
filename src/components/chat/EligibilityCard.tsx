import { ExternalLink, FileText, CheckCircle2, AlertTriangle, XCircle, FolderOpen } from 'lucide-react';
import type { EligibilityResult } from '@/services/eligibilityService';

// Maps eligibility status to badge + border colors.
const STATUS_CONFIG = {
  eligible: {
    badge: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400',
    border: 'border-l-success-500',
    icon: CheckCircle2,
    label: 'Eligible',
  },
  partially_eligible: {
    badge: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
    border: 'border-l-warning-500',
    icon: AlertTriangle,
    label: 'Partially Eligible',
  },
  needs_more_information: {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    border: 'border-l-amber-500',
    icon: AlertTriangle,
    label: 'Needs More Info',
  },
  not_eligible: {
    badge: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400',
    border: 'border-l-error-500',
    icon: XCircle,
    label: 'Not Eligible',
  },
} as const;

// Single eligibility result card — shows scheme name, eligibility badge,
// reason(s), required documents, and an "Apply" button to the official site.
export default function EligibilityCard({ result }: { result: EligibilityResult }) {
  const config = STATUS_CONFIG[result.status];
  const StatusIcon = config.icon;

  return (
    <div className={`card border-l-4 ${config.border} animate-slide-up`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-primary-900 dark:text-cream-100">
            {result.scheme.title}
          </h3>
          {result.scheme.ministry && (
            <p className="mt-0.5 text-xs text-primary-400 dark:text-primary-400">
              {result.scheme.ministry}
            </p>
          )}
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.badge}`}>
          <StatusIcon size={14} />
          {config.label}
        </span>
      </div>

      {result.scheme.description && (
        <p className="mt-3 text-sm text-primary-500 dark:text-primary-400">
          {result.scheme.description}
        </p>
      )}

      {/* Reasons */}
      <div className="mt-3 space-y-1">
        {result.reasons.map((reason, idx) => (
          <p key={idx} className="text-sm text-primary-500 dark:text-primary-400">
            {reason}
          </p>
        ))}
      </div>

      {/* Benefits */}
      {result.scheme.benefits && (
        <div className="mt-3 rounded-lg bg-cream-50 px-3 py-2 dark:bg-primary-900/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-400 dark:text-primary-400">
            Benefits
          </p>
          <p className="mt-1 text-sm text-primary-700 dark:text-primary-200">{result.scheme.benefits}</p>
        </div>
      )}

      {/* Required documents */}
      {result.scheme.required_documents && result.scheme.required_documents.length > 0 && (
        <div className="mt-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary-400 dark:text-primary-400">
            <FolderOpen size={14} />
            Required Documents
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {result.scheme.required_documents.map((doc) => (
              <span
                key={doc}
                className="inline-flex items-center gap-1 rounded-md bg-cream-100 px-2 py-0.5 text-xs font-medium text-primary-500 dark:bg-primary-700/50 dark:text-primary-200"
              >
                <FileText size={12} />
                {doc}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Apply button */}
      {result.scheme.official_link && (
        <div className="mt-4">
          <a
            href={result.scheme.official_link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-accent w-full sm:w-auto"
          >
            Apply on Official Portal
            <ExternalLink size={14} />
          </a>
        </div>
      )}
    </div>
  );
}
