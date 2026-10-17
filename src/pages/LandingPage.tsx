import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  MessageSquareText,
  FileText,
  ShieldCheck,
  Sparkles,
  Download,
  Bot,
  UserCheck,
  ArrowRight,
  Mic,
  ScanLine,
  Award,
  TrendingUp,
  Users,
  Globe,
  IndianRupee,
  Landmark,
  User,
  Lock,
  Eye,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// ============================================================
// CinematicBackground — Ken Burns + drift + parallax + glow
// ============================================================
function CinematicBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <img
        src="/hero.jpeg"
        alt="Government building representing civic services"
        className="h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-cream-50/80 via-cream-50/20 to-transparent dark:from-primary-900/80 dark:via-primary-900/30 dark:to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary-900/40 via-transparent to-cream-50/10 dark:from-primary-900/50 dark:to-transparent" />
    </div>
  );
}

import { useLanguage } from '@/context/LanguageContext';

// ============================================================
// VoicePromptBar — the floating mic prompt at hero bottom
// ============================================================
function VoicePromptBar() {
  const { t } = useLanguage();
  return (
    <div className="absolute bottom-5 left-1/2 z-10 w-[min(92%,550px)] -translate-x-1/2 rounded-full bg-cream-50/95 p-2 pl-3 shadow-soft-xl backdrop-blur-sm dark:bg-primary-800/95">
      <Link to="/dashboard/profile" className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-700 text-cream-50"><Mic size={19} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-primary-700 dark:text-cream-50">{t('landing.voiceBarPrompt')}</p>
          <p className="text-xs text-primary-400">{t('landing.voiceBarSubtext')}</p>
        </div>
        <div className="hidden items-end gap-0.5 pr-4 sm:flex">{[10, 18, 12, 24, 15, 28, 12, 20, 10, 17, 13, 22].map((height, index) => <span key={index} className="w-1 rounded-full bg-accent-500" style={{ height }} />)}</div>
      </Link>
    </div>
  );
}

// ============================================================
// Hero — cinematic background + left copy + right AI visual
// ============================================================
function LoginPanel() {
  const { t } = useLanguage();
  return (
    <div className="rounded-2xl border border-white/60 bg-cream-50/95 p-6 shadow-soft-xl backdrop-blur-md dark:border-primary-700 dark:bg-primary-800/95 sm:p-7">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cream-100 text-primary-700 dark:bg-primary-700 dark:text-cream-50">
        <User size={22} />
      </div>
      <h2 className="mt-4 text-center text-2xl font-bold text-primary-900 dark:text-cream-50">{t('landing.welcomeBack')}</h2>
      <p className="mt-1 text-center text-sm text-primary-400 dark:text-cream-200/60">{t('landing.loginSubtitle')}</p>
      <div className="mt-6 space-y-3">
        <div className="relative">
          <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
          <input className="input-field pl-10" placeholder={t('landing.emailOrPhone')} aria-label={t('landing.emailOrPhone')} />
        </div>
        <div className="relative">
          <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400" />
          <input className="input-field pl-10 pr-10" type="password" placeholder={t('auth.password')} aria-label={t('auth.password')} />
          <Eye size={17} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-primary-400">
        <label className="flex items-center gap-2"><input type="checkbox" className="accent-primary-700" /> {t('landing.rememberMe')}</label>
        <span>{t('landing.forgotPassword')}</span>
      </div>
      <Link to="/login" className="btn-primary mt-5 w-full">{t('landing.loginBtn')}</Link>
      <div className="my-5 flex items-center gap-3 text-xs text-primary-400"><span className="h-px flex-1 bg-cream-200" />{t('landing.orContinueWith')}<span className="h-px flex-1 bg-cream-200" /></div>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/login" className="btn-secondary !px-3 !py-2.5 text-xs"><span className="font-bold text-red-500">G</span> Google</Link>
        <Link to="/login" className="btn-secondary !px-3 !py-2.5 text-xs"><Landmark size={15} /> DigiLocker</Link>
      </div>
    </div>
  );
}

function Hero() {
  const { t } = useLanguage();
  return (
    <section className="relative min-h-[760px] overflow-hidden">
      <CinematicBackground />
      <VoicePromptBar />
      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-40 pt-16 sm:px-6 lg:px-8 lg:pb-44 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_380px]">
          {/* Left: copy */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-300/50 bg-cream-50/70 px-4 py-1.5 text-xs font-semibold text-primary-700 shadow-soft backdrop-blur-sm dark:bg-primary-800/70 dark:text-cream-100">
              <Sparkles size={14} className="text-accent-500" />
              {t('common.tagline')}
            </div>

            <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-primary-800 sm:text-5xl lg:text-[3.5rem] dark:text-cream-50">
              {t('landing.heroTitle')}
            </h1>

            <p className="mt-7 max-w-lg text-base sm:text-lg leading-relaxed text-primary-500 dark:text-cream-200/70">
              {t('landing.heroSubtitle')}
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/signup" className="btn-primary px-6 py-3 text-base">
                <Mic size={18} /> {t('landing.getStarted')}
              </Link>
              <Link to="/login" className="btn-secondary px-6 py-3 text-base">
                {t('landing.signInBtn')} <ArrowRight size={17} />
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-primary-400 dark:text-cream-200/60">
              <span className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-accent-500" /> Secure & private</span>
              <span className="flex items-center gap-1.5"><FileText size={16} className="text-accent-500" /> Verified schemes</span>
              <span className="flex items-center gap-1.5"><Mic size={16} className="text-accent-500" /> Voice-enabled</span>
              <span className="flex items-center gap-1.5"><Download size={16} className="text-accent-500" /> Instant PDF</span>
            </div>
          </motion.div>

          {/* Right: existing sign-in feature */}
          <div className="lg:block">
            <LoginPanel />
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// QuickLinks — services row card
// ============================================================
function QuickLinks() {
  const items = [
    { icon: FileText, label: 'Aadhaar' },
    { icon: FileText, label: 'PAN Card' },
    { icon: Globe, label: 'Passport' },
    { icon: Landmark, label: 'Voter ID' },
    { icon: IndianRupee, label: 'Tax Filing' },
    { icon: Sparkles, label: 'More' },
  ];

  return (
    <section className="relative -mt-16 z-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-cream-200 bg-white p-6 shadow-soft-lg dark:border-primary-700 dark:bg-primary-800"
        >
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {items.map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="group flex flex-col items-center gap-2"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cream-100 text-primary-700 transition-all group-hover:scale-110 group-hover:bg-accent-100 group-hover:text-accent-700 dark:bg-primary-700 dark:text-cream-50 dark:group-hover:bg-accent-900/30 dark:group-hover:text-accent-400">
                  <item.icon size={20} />
                </div>
                <span className="text-xs font-medium text-primary-600 dark:text-cream-200/70">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// Features
// ============================================================
const FEATURES = [
  { icon: MessageSquareText, title: 'Conversational AI Assistant', description: 'Chat naturally in plain language. The AI asks about your background and finds schemes you qualify for — no browsing endless lists.', accent: 'from-primary-600 to-primary-800' },
  { icon: Mic, title: 'Voice-First Interaction', description: 'Speak your answers in any language. The AI understands your voice and helps you through every step — typing is always available too.', accent: 'from-accent-400 to-accent-600' },
  { icon: ScanLine, title: 'OCR Document Processing', description: 'Upload your documents and the system extracts key information automatically. No more typing the same details repeatedly.', accent: 'from-accent-500 to-primary-600' },
  { icon: Download, title: 'Downloadable PDF Applications', description: 'Generate a complete, printable PDF application in seconds. You stay in control — KathyaAI never auto-submits to any government portal.', accent: 'from-accent-500 to-accent-700' },
  { icon: ShieldCheck, title: 'Secure Document Vault', description: 'Upload and store your Aadhaar, income certificate, and other documents securely. They are reused across applications with your consent.', accent: 'from-primary-700 to-primary-900' },
  { icon: UserCheck, title: 'Track Your Applications', description: 'See all your saved and completed applications in one dashboard. Know exactly where you left off and what is still pending.', accent: 'from-accent-400 to-primary-600' },
];

function Features() {
  return (
    <section id="features" className="section-padding">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-primary-700 sm:text-4xl dark:text-cream-50">
            Everything you need to access government schemes
          </h2>
          <p className="mt-4 text-lg text-primary-400 dark:text-cream-200/70">
            From discovery to a ready-to-submit application — KathyaAI guides you through every step.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-cream-200 bg-white p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-soft-lg dark:border-primary-700 dark:bg-primary-800"
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${feature.accent} opacity-0 transition-opacity group-hover:opacity-100`} />
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.accent} text-cream-50 shadow-soft transition-transform group-hover:scale-110`}>
                <feature.icon size={24} />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-primary-700 dark:text-cream-100">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-primary-400 dark:text-cream-200/60">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// How it works
// ============================================================
const STEPS = [
  { icon: Mic, step: '01', title: 'Tell us about yourself', description: 'Speak or type your details — name, income, occupation, location. The AI guides you one question at a time.' },
  { icon: Bot, step: '02', title: 'AI understands your needs', description: 'The AI processes your information and identifies which schemes are relevant to your profile.' },
  { icon: Award, step: '03', title: 'Find matching schemes', description: 'See schemes you are eligible for with match scores, benefits, and required documents clearly shown.' },
  { icon: ScanLine, step: '04', title: 'Verify documents', description: 'Upload your documents. The system extracts and verifies information using OCR technology.' },
  { icon: FileText, step: '05', title: 'Prepare your application', description: 'The system auto-fills your application form using your profile and verified documents. Review and download.' },
];

function HowItWorks() {
  const prefersReduced = useReducedMotion() ?? false;

  return (
    <section id="how-it-works" className="bg-cream-50 py-20 dark:bg-primary-800/30 lg:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
          <p className="mt-4 text-lg text-primary-500 dark:text-cream-200/70">
            From your voice to a ready application — five guided steps.
          </p>
        </motion.div>

        <div className="mt-16 space-y-0">
          {STEPS.map((step, idx) => (
            <ScrollStep key={step.step} step={step} idx={idx} isLast={idx === STEPS.length - 1} prefersReduced={prefersReduced} />
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link to="/signup" className="btn-primary group">
            Get started — it is free
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ScrollStep({
  step,
  idx,
  isLast,
  prefersReduced,
}: {
  step: typeof STEPS[0];
  idx: number;
  isLast: boolean;
  prefersReduced: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <div ref={ref} className="relative flex gap-6 pb-12 last:pb-0">
      {!isLast && (
        <div className="absolute left-[31px] top-16 h-full w-0.5 bg-gradient-to-b from-accent-300 to-transparent dark:from-accent-700" />
      )}
      <motion.div
        initial={prefersReduced ? { opacity: 0 } : { scale: 0, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.4, type: 'spring' }}
        className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-800 text-lg font-bold text-cream-50 shadow-soft-lg"
      >
        {step.step}
      </motion.div>
      <motion.div
        initial={prefersReduced ? { opacity: 0 } : { opacity: 0, x: -20 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="flex-1 pt-1"
      >
        <div className="flex items-center gap-2">
          <step.icon size={20} className="text-accent-500 dark:text-accent-400" />
          <h3 className="text-lg font-semibold">{step.title}</h3>
        </div>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-primary-500 dark:text-cream-200/70">
          {step.description}
        </p>
      </motion.div>
    </div>
  );
}

// ============================================================
// Impact section
// ============================================================
function ImpactSection() {
  const stats = [
    { icon: FileText, label: 'Schemes Covered', value: '1000+', color: 'text-primary-700 dark:text-primary-400' },
    { icon: Users, label: 'Citizens Helped', value: '50,000+', color: 'text-accent-600 dark:text-accent-400' },
    { icon: Globe, label: 'States Supported', value: '28+', color: 'text-primary-700 dark:text-primary-400' },
    { icon: TrendingUp, label: 'Avg. Time Saved', value: '85%', color: 'text-accent-600 dark:text-accent-400' },
  ];

  return (
    <section className="overflow-hidden section-padding">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold tracking-tight text-primary-700 sm:text-4xl dark:text-cream-50">
              Built for every citizen across India
            </h2>
            <p className="mt-4 text-lg text-primary-400 dark:text-cream-200/70">
              From rural farmers to urban students, KathyaAI makes government schemes accessible
              to everyone — regardless of language, literacy, or tech experience.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
              {stats.map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.1 }}
                  className="rounded-xl border border-cream-200 bg-white p-5 shadow-soft dark:border-primary-700 dark:bg-primary-800"
                >
                  <stat.icon size={24} className={stat.color} />
                  <p className="mt-2 text-2xl font-bold text-primary-700 dark:text-cream-100">{stat.value}</p>
                  <p className="text-sm text-primary-400 dark:text-cream-200/60">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative flex items-center justify-center"
          >
            <IndiaCivicVisual />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function IndiaCivicVisual() {
  const prefersReduced = useReducedMotion() ?? false;

  return (
    <div className="relative h-80 w-80">
      <svg viewBox="0 0 320 320" className="h-full w-full">
        <defs>
          <radialGradient id="civicGrad" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#1A1A1F" stopOpacity="0.15" />
            <stop offset="70%" stopColor="#C9A876" stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <circle cx="160" cy="160" r="150" fill="url(#civicGrad)" />
        {[120, 90, 60].map((r) => (
          <circle key={r} cx="160" cy="160" r={r} fill="none" stroke="currentColor" className="text-primary-300 dark:text-primary-700" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
        ))}
        {[0, 60, 120, 180, 240, 300].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x = 160 + 110 * Math.cos(rad);
          const y = 160 + 110 * Math.sin(rad);
          return <line key={angle} x1="160" y1="160" x2={x} y2={y} stroke="currentColor" className="text-accent-400 dark:text-accent-600" strokeWidth="1.5" opacity="0.3" />;
        })}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x = 160 + 110 * Math.cos(rad);
          const y = 160 + 110 * Math.sin(rad);
          return (
            <motion.circle
              key={`node-${i}`}
              cx={x} cy={y} r="6"
              fill={i % 2 === 0 ? '#1A1A1F' : '#C9A876'}
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, type: 'spring' }}
              animate={prefersReduced ? {} : undefined}
            />
          );
        })}
        <circle cx="160" cy="160" r="20" fill="#1A1A1F" opacity="0.9" />
        <circle cx="160" cy="160" r="12" fill="#C9A876" />
      </svg>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <p className="text-xs font-bold text-cream-50">AI</p>
      </div>
      <div className="absolute left-0 top-1/4 text-xs font-medium text-primary-700 dark:text-primary-400">North</div>
      <div className="absolute right-0 top-1/3 text-xs font-medium text-accent-600 dark:text-accent-400">South</div>
      <div className="absolute bottom-1/4 left-1/4 text-xs font-medium text-accent-600 dark:text-accent-400">West</div>
      <div className="absolute bottom-1/4 right-1/4 text-xs font-medium text-primary-700 dark:text-primary-400">East</div>
    </div>
  );
}

// ============================================================
// Landing page
// ============================================================
export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-cream-100 dark:bg-primary-900">
      {/* Static background image for the whole landing page */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <img
          src="/hero.jpeg"
          alt=""
          className="h-full w-full object-cover object-center"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-cream-100/85 dark:bg-primary-900/88" />
      </div>
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <QuickLinks />
        <Features />
        <HowItWorks />
        <ImpactSection />
      </main>
      <Footer />
    </div>
  );
}
