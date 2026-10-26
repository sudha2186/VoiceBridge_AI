import { useState, FormEvent, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Calendar,
  MapPin,
  Briefcase,
  IndianRupee,
  Tag,
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Mic,
  MicOff,
  Square,
  Volume2,
  RotateCcw,
  MessageSquare,
  HelpCircle,
  Quote,
  Check,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { updateProfile } from '@/services/profileService';
import { useToast } from '@/context/ToastContext';
import { calculateAge, validateDateOfBirth, formatDateForInput } from '@/utils/ageUtils';

// Standard Indian states list for clean auto-completion / selection
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry'
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const CATEGORY_OPTIONS = ['General', 'OBC', 'SC', 'ST', 'EWS'];
const COMMON_OCCUPATIONS = [
  'Farmer', 'Student', 'Artisan', 'Rural Worker', 'Urban Worker',
  'Unemployed', 'Self-Employed', 'Salaried', 'Teacher', 'Other'
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  // Profile completion fields including accessible disability status
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [occupation, setOccupation] = useState('');
  const [annualIncome, setAnnualIncome] = useState('');
  const [hasPersonalIncome, setHasPersonalIncome] = useState<boolean | null>(null);
  const [guardianIncome, setGuardianIncome] = useState('');
  const [incomeSource, setIncomeSource] = useState<'father' | 'mother' | 'legal_guardian' | 'family' | 'personal'>('personal');
  const [category, setCategory] = useState('');
  const [disabilityStatus, setDisabilityStatus] = useState<'Yes' | 'No' | 'Prefer not to say' | ''>('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Voice recording & ASR / NLP extraction state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessingAsr, setIsProcessingAsr] = useState(false);
  const [isProcessingNlp, setIsProcessingNlp] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputVal, setTextInputVal] = useState('');
  const [missingFieldsPrompt, setMissingFieldsPrompt] = useState<string | null>(null);
  const [missingFieldsList, setMissingFieldsList] = useState<string[]>([]);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize fields from Supabase profile on load
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setDob(profile.date_of_birth ? formatDateForInput(profile.date_of_birth) : '');
      setGender(profile.gender || '');
      setState(profile.state || '');
      setDistrict(profile.district || '');
      setOccupation(profile.occupation || '');
      setAnnualIncome(profile.annual_income != null ? profile.annual_income.toString() : '');
      setHasPersonalIncome(profile.has_personal_income ?? null);
      setGuardianIncome(profile.guardian_income != null ? profile.guardian_income.toString() : '');
      if (profile.income_source) {
        setIncomeSource(profile.income_source as any);
      } else if (profile.has_personal_income === false) {
        setIncomeSource('family');
      }
      setCategory(profile.category || '');
      setDisabilityStatus(
        profile.disability_status ? (profile.disability_status as 'Yes' | 'No' | 'Prefer not to say') : ''
      );
    }
  }, [profile]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Dynamic age calculation from DOB — single source of truth
  const calculatedAge = useMemo(() => {
    return calculateAge(dob);
  }, [dob]);

  // Detect student or minor status
  const isChild = useMemo(() => {
    return calculatedAge != null && calculatedAge < 18;
  }, [calculatedAge]);

  const isStudent = useMemo(() => {
    return occupation.toLowerCase().trim() === 'student';
  }, [occupation]);

  const isChildOrStudent = useMemo(() => {
    return isChild || isStudent;
  }, [isChild, isStudent]);

  // Effective income string for completeness evaluation
  const effectiveIncome = useMemo(() => {
    if (isChildOrStudent && hasPersonalIncome === false) {
      return guardianIncome;
    }
    return annualIncome;
  }, [isChildOrStudent, hasPersonalIncome, guardianIncome, annualIncome]);

  // Completion calculation across all 9 fields
  const completionPct = useMemo(() => {
    const fields = [fullName, dob, gender, state, district, occupation, effectiveIncome, category, disabilityStatus];
    const filled = fields.filter((f) => f && f.toString().trim().length > 0).length;
    return Math.round((filled / 9) * 100);
  }, [fullName, dob, gender, state, district, occupation, effectiveIncome, category, disabilityStatus]);

  // ==========================================================
  // Web Speech synthesis helper (read out in native language)
  // ==========================================================
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (language === 'hi') utterance.lang = 'hi-IN';
      else if (language === 'mr') utterance.lang = 'mr-IN';
      else utterance.lang = 'en-IN';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
    }
  };

  // ==========================================================
  // Voice Recording with WebRTC MediaRecorder
  // ==========================================================
  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/ogg')
        ? 'audio/ogg'
        : '';
      const mediaRecorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const actualType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualType });
        // Stop all tracks to release microphone hardware
        stream.getTracks().forEach((track) => track.stop());
        if (audioBlob.size > 200) {
          await handleSendAudioToWhisper(audioBlob);
        } else {
          setMicError(t('voice.noAudioCaptured'));
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error('Microphone error:', err);
      setMicError(t('voice.micPermissionDenied'));
      setShowTextInput(true);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // ==========================================================
  // Whisper Small ASR API Call
  // ==========================================================
  const handleSendAudioToWhisper = async (audioBlob: Blob) => {
    setIsProcessingAsr(true);
    try {
      const formData = new FormData();
      const ext = audioBlob.type.includes('ogg')
        ? 'profile_speech.ogg'
        : audioBlob.type.includes('wav')
        ? 'profile_speech.wav'
        : 'profile_speech.webm';
      formData.append('audio', audioBlob, ext);
      formData.append('language', language);

      // Try local direct Python microservice port 8000 first, fallback to proxy
      let res: Response;
      try {
        res = await fetch('http://127.0.0.1:8000/api/asr/transcribe', {
          method: 'POST',
          body: formData,
        });
      } catch {
        res = await fetch('/api/asr/transcribe', {
          method: 'POST',
          body: formData,
        });
      }

      const data = await res.json();
      if (data.success && data.text) {
        setSpokenTranscript(data.text);
        setTextInputVal(data.text);
        // Automatically trigger NLP entity extraction on the captured transcript
        await handleExtractNlpEntities(data.text);
      } else {
        setMicError(data.error || t('voice.noAudioCaptured'));
      }
    } catch (err: unknown) {
      console.error('Whisper ASR error:', err);
      setMicError('ASR service could not be reached. You can type your details below.');
      setShowTextInput(true);
    } finally {
      setIsProcessingAsr(false);
    }
  };

  // ==========================================================
  // NLP Entity Extraction & Field Auto-Population
  // ==========================================================
  const handleExtractNlpEntities = async (rawText: string) => {
    const textToProcess = rawText.trim();
    if (!textToProcess) return;

    setIsProcessingNlp(true);
    setError(null);

    // Snapshot existing confirmed values to pass for smart multi-turn merging
    const currentProfileSnapshot = {
      full_name: fullName.trim() || null,
      date_of_birth: dob.trim() || null,
      gender: gender.trim() || null,
      state: state.trim() || null,
      district: district.trim() || null,
      occupation: occupation.trim() || null,
      annual_income: annualIncome ? parseFloat(annualIncome.replace(/[^\d.]/g, '')) : null,
      category: category.trim() || null,
    };

    try {
      let res: Response;
      const payload = {
        text: textToProcess,
        language: language,
        previous_profile: currentProfileSnapshot,
      };

      try {
        res = await fetch('http://127.0.0.1:8000/api/nlp/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        res = await fetch('/api/nlp/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (data.success && data.extracted_fields) {
        const fields = data.extracted_fields;

        // Auto-populate the 8 profile fields without overwriting previously confirmed fields with null
        if (fields.full_name) setFullName(fields.full_name);
        if (fields.date_of_birth) setDob(formatDateForInput(fields.date_of_birth));
        if (fields.gender) setGender(fields.gender);
        if (fields.state) setState(fields.state);
        if (fields.district) setDistrict(fields.district);
        if (fields.occupation) setOccupation(fields.occupation);
        if (fields.annual_income != null) setAnnualIncome(fields.annual_income.toString());
        if (fields.category) setCategory(fields.category);

        // Check for missing fields
        const missing = data.missing_fields || [];
        setMissingFieldsList(missing);

        if (missing.length > 0 && data.clarification_prompt) {
          setMissingFieldsPrompt(data.clarification_prompt);
          // Optional native voice readout for citizen assistance
          speakText(data.clarification_prompt);
        } else {
          setMissingFieldsPrompt(null);
          toast('success', 'Information Extracted', 'All 8 fields have been identified. Please review and save.');
        }
      } else {
        toast('error', 'Extraction notice', data.error || 'Could not extract fields from the text.');
      }
    } catch (err: unknown) {
      console.error('NLP Extraction error:', err);
      toast('error', 'NLP Service Error', 'Could not connect to extraction service.');
    } finally {
      setIsProcessingNlp(false);
    }
  };

  // ==========================================================
  // Form Submission — Persist to Supabase `profiles`
  // ==========================================================
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedSuccess(false);

    if (!user) {
      setError('You must be signed in to save your profile.');
      return;
    }

    if (!fullName.trim()) {
      setError(t('auth.errNameRequired'));
      return;
    }

    if (dob) {
      const dobValidation = validateDateOfBirth(dob);
      if (!dobValidation.isValid) {
        setError(dobValidation.error || 'Please enter a valid Date of Birth.');
        return;
      }
    }

    let parsedIncome: number | null = null;
    let parsedGuardianIncome: number | null = null;

    if (isChildOrStudent && hasPersonalIncome === false) {
      if (guardianIncome.trim()) {
        const gNum = parseFloat(guardianIncome.replace(/[₹,\s]/g, ''));
        if (isNaN(gNum) || gNum < 0) {
          setError('Please enter a valid parent/guardian annual income.');
          return;
        }
        parsedGuardianIncome = gNum;
      }
      parsedIncome = 0; // Citizen has no personal income
    } else {
      if (annualIncome.trim()) {
        const num = parseFloat(annualIncome.replace(/[₹,\s]/g, ''));
        if (isNaN(num) || num < 0) {
          setError('Please enter a valid annual income.');
          return;
        }
        parsedIncome = num;
      }
    }

    setSaving(true);

    try {
      await updateProfile(user.id, {
        full_name: fullName.trim() || null,
        date_of_birth: dob.trim() || null,
        gender: gender.trim() || null,
        state: state.trim() || null,
        district: district.trim() || null,
        occupation: occupation.trim() || null,
        annual_income: parsedIncome,
        has_personal_income: isChildOrStudent ? hasPersonalIncome : true,
        guardian_income: parsedGuardianIncome,
        income_source: isChildOrStudent && hasPersonalIncome === false ? incomeSource : 'personal',
        category: category.trim() || null,
        disability_status: disabilityStatus || null,
        age: calculatedAge, // Synchronize calculated age dynamically
      });

      await refreshProfile();
      setSavedSuccess(true);

      const allFieldsFilled = [
        fullName,
        dob,
        gender,
        state,
        district,
        occupation,
        effectiveIncome,
        category,
        disabilityStatus,
      ].every((val) => val && val.toString().trim().length > 0);

      if (allFieldsFilled) {
        toast('success', t('profile.saveSuccess'), 'Profile 100% complete! Redirecting to recommended schemes...');
        setTimeout(() => {
          navigate('/dashboard/schemes');
        }, 1200);
      } else {
        toast('success', t('profile.saveSuccess'), `${completionPct}% details saved successfully.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('profile.saveError');
      setError(msg);
      toast('error', 'Save error', msg);
    } finally {
      setSaving(false);
    }
  };

  const ringRadius = 28;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference - (completionPct / 100) * ringCircumference;

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-2">
      {/* Page Header with Completion Tracker */}
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-primary-800 to-primary-900 p-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-primary-100 backdrop-blur-sm">
            <Sparkles size={14} /> {t('profile.badgeCompletion')}
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{t('profile.title')}</h1>
          <p className="mt-1 text-sm text-primary-200">
            {t('profile.subtitle')}
          </p>
        </div>

        {/* Circular Progress Gauge */}
        <div className="flex items-center gap-4 self-start rounded-xl bg-white/10 p-3 backdrop-blur-sm sm:self-auto">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <svg className="h-16 w-16 -rotate-90 transform">
              <circle
                cx="32"
                cy="32"
                r={ringRadius}
                stroke="currentColor"
                strokeWidth="5"
                className="text-white/20"
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r={ringRadius}
                stroke="currentColor"
                strokeWidth="5"
                className="text-emerald-400 transition-all duration-500 ease-out"
                fill="transparent"
                strokeDasharray={ringCircumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-sm font-bold text-white">{completionPct}%</span>
          </div>
          <div>
            <div className="text-xs font-semibold text-primary-200">{t('profile.completeness')}</div>
            <div className="text-sm font-medium text-white">
              {completionPct === 100
                ? t('profile.allFieldsComplete')
                : t('profile.fieldsComplete', { filled: Math.round((completionPct / 100) * 9) })}
            </div>
          </div>
        </div>
      </div>

      {/* 100% Complete Banner with Explore Schemes Button */}
      {completionPct === 100 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 text-emerald-900 shadow-sm dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Your profile is 100% complete!</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                All mandatory information has been verified. You can review your matched schemes anytime.
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/schemes"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-soft transition hover:bg-emerald-700"
          >
            Explore Recommended Schemes →
          </Link>
        </div>
      )}

      {/* ========================================================== */}
      {/* SECTION 4: Prominent Voice Instruction Panel in Selected Language */}
      {/* ========================================================== */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-accent-300 bg-gradient-to-br from-accent-50/80 via-white to-cream-50 p-6 shadow-soft-lg dark:border-accent-700 dark:from-primary-800 dark:via-primary-850 dark:to-primary-900 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-600 text-white shadow-soft">
            <Mic className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold tracking-tight text-primary-900 dark:text-cream-50">
                {t('profile.voiceInstructionTitle')}
              </h2>
              <span className="rounded-full bg-accent-100 px-2.5 py-0.5 text-[11px] font-bold text-accent-800 dark:bg-accent-900/60 dark:text-accent-300">
                {language.toUpperCase()}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-primary-700 dark:text-cream-200/90">
              {t('profile.voiceInstructionBody')}
            </p>
          </div>
        </div>

        {/* ========================================================== */}
        {/* SECTION 5: Natural-Speech Example in Selected Language */}
        {/* ========================================================== */}
        <div className="mt-5 rounded-2xl border border-accent-200 bg-white/90 p-4 shadow-sm dark:border-primary-700 dark:bg-primary-800/80">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-700 dark:text-accent-300">
            <Quote size={14} />
            <span>{t('profile.exampleTitle')}</span>
          </div>
          <p className="mt-1.5 text-sm italic leading-relaxed text-primary-800 dark:text-cream-100">
            {t('profile.exampleBody')}
          </p>
        </div>

        {/* ========================================================== */}
        {/* Live Voice & Natural Text Recording Controls */}
        {/* ========================================================== */}
        <div className="mt-6 border-t border-accent-200/80 pt-5 dark:border-primary-700">
          {micError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{micError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            {/* Record / Stop Toggle Button */}
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={isProcessingAsr || isProcessingNlp}
                className="btn-primary flex items-center gap-2.5 !py-3 !px-5 text-sm font-bold shadow-soft-lg transition-transform hover:scale-[1.02]"
              >
                <Mic size={18} />
                <span>{t('voice.speakNow')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-2.5 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-soft transition-all hover:bg-red-700 animate-pulse"
              >
                <Square size={16} />
                <span>{t('voice.stopRecording')} ({recordingSeconds}s)</span>
              </button>
            )}

            {/* Toggle Manual Text Input Option */}
            <button
              type="button"
              onClick={() => setShowTextInput((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl border border-cream-200 bg-white px-4 py-2.5 text-xs font-semibold text-primary-700 shadow-sm hover:bg-cream-100 dark:border-primary-700 dark:bg-primary-800 dark:text-cream-100"
            >
              <MessageSquare size={15} />
              <span>{showTextInput ? t('voice.recordVoice') : t('voice.typeInstead')}</span>
            </button>

            {/* Processing Indicators */}
            {(isProcessingAsr || isProcessingNlp) && (
              <div className="flex items-center gap-2 text-xs font-medium text-accent-700 dark:text-accent-300">
                <Loader2 size={16} className="animate-spin" />
                <span>
                  {isProcessingAsr ? t('voice.processing') : t('voice.extractingNlp')}
                </span>
              </div>
            )}
          </div>

          {/* Spoken Transcript or Natural Text Input Area */}
          {(spokenTranscript || showTextInput) && (
            <div className="mt-4 space-y-3 rounded-2xl border border-cream-200 bg-white p-4 shadow-sm dark:border-primary-700 dark:bg-primary-900/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-cream-200">
                  {t('voice.transcriptLabel')}
                </label>
                {spokenTranscript && (
                  <button
                    type="button"
                    onClick={() => speakText(spokenTranscript)}
                    className="inline-flex items-center gap-1 text-xs text-primary-500 hover:text-primary-700 dark:text-cream-200/60"
                    title="Listen to transcript"
                  >
                    <Volume2 size={14} />
                    <span>Listen</span>
                  </button>
                )}
              </div>

              <textarea
                value={textInputVal}
                onChange={(e) => setTextInputVal(e.target.value)}
                placeholder={t('voice.transcriptPlaceholder')}
                rows={3}
                className="w-full rounded-xl border border-cream-200 bg-cream-50/50 p-3 text-sm text-primary-900 placeholder-primary-400 focus:border-accent-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-primary-700 dark:bg-primary-800 dark:text-cream-50"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleExtractNlpEntities(textInputVal)}
                  disabled={isProcessingNlp || !textInputVal.trim()}
                  className="btn-primary flex items-center gap-2 !py-2 !px-4 text-xs font-bold"
                >
                  {isProcessingNlp ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{t('voice.extractBtn')}</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* Targeted Missing Fields Clarification Box */}
          {/* ========================================================== */}
          {missingFieldsPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/40"
            >
              <div className="flex items-start gap-3">
                <HelpCircle size={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                      {t('voice.missingFieldPromptTitle')}
                    </span>
                    <button
                      type="button"
                      onClick={() => speakText(missingFieldsPrompt)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:text-amber-950 dark:text-amber-300"
                    >
                      <Volume2 size={14} />
                      <span>{language === 'hi' ? 'सुनें' : language === 'mr' ? 'ऐका' : 'Listen'}</span>
                    </button>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-amber-950 dark:text-amber-100">
                    {missingFieldsPrompt}
                  </p>
                  <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-300/80">
                    {language === 'hi'
                      ? 'आप माइक बटन दबाकर बोल सकते हैं या सीधे नीचे दिए गए रकाने भर सकते हैं।'
                      : language === 'mr'
                      ? 'तुम्ही माइक दाबून बोलू शकता किंवा थेट खालील रकाने भरू शकता.'
                      : 'You can tap Speak to provide these missing details, or edit the form below.'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ========================================================== */}
      {/* Main Profile Form: Exactly 8 Mandatory Profile Fields */}
      {/* ========================================================== */}
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-cream-200 bg-white p-6 shadow-soft-lg dark:border-primary-700 dark:bg-primary-900 sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between border-b border-cream-200 pb-4 dark:border-primary-700">
          <div>
            <h3 className="text-lg font-bold text-primary-900 dark:text-cream-50">
              {t('profile.manualSectionTitle')}
            </h3>
            <p className="text-xs text-primary-400 dark:text-cream-200/60">
              {t('profile.manualSectionDesc')}
            </p>
          </div>
          {savedSuccess && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={15} /> {t('profile.saveSuccess')}
            </span>
          )}
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* 1. Full Name */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('profile.fieldFullName')} <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <User size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('profile.fieldFullNamePlaceholder')}
                required
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* 2. Date of Birth (DOB) with Dynamic Age Badge */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {t('profile.fieldDob')} <span className="text-red-500">*</span>
              </label>
              {calculatedAge !== null && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {t('profile.dynamicAgeBadge', { age: calculatedAge })}
                </span>
              )}
            </div>
            <div className="relative mt-1.5">
              <Calendar size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {t('profile.fieldDobHint')}
            </p>
          </div>

          {/* 3. Gender */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('profile.fieldGender')}
            </label>
            <div className="mt-1.5">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">{t('profile.fieldGenderPlaceholder')}</option>
                <option value="Male">{t('profile.genderMale')}</option>
                <option value="Female">{t('profile.genderFemale')}</option>
                <option value="Other">{t('profile.genderOther')}</option>
              </select>
            </div>
          </div>

          {/* 4. State */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('profile.fieldState')}
            </label>
            <div className="relative mt-1.5">
              <MapPin size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">{t('profile.fieldStatePlaceholder')}</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. District */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('profile.fieldDistrict')}
            </label>
            <div className="relative mt-1.5">
              <MapPin size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder={t('profile.fieldDistrictPlaceholder')}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* 6. Occupation */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('profile.fieldOccupation')}
            </label>
            <div className="relative mt-1.5">
              <Briefcase size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder={t('profile.fieldOccupationPlaceholder')}
                list="occupations-list"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <datalist id="occupations-list">
                {COMMON_OCCUPATIONS.map((occ) => (
                  <option key={occ} value={occ} />
                ))}
              </datalist>
            </div>
          </div>

          {/* 7. Annual Income & Dependent Guardian Income Handling */}
          <div className={isChildOrStudent ? 'sm:col-span-2 rounded-2xl border border-primary-200 bg-primary-50/40 p-4 dark:border-primary-900/40 dark:bg-primary-950/20' : ''}>
            {isChildOrStudent ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t('profile.hasPersonalIncomeQuestion')}
                  </label>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {language === 'mr'
                      ? 'विद्यार्थी किंवा १८ वर्षांखालील नागरिकांसाठी उत्पन्नाची स्पष्टता'
                      : language === 'hi'
                      ? 'विद्यार्थी या 18 वर्ष से कम आयु के नागरिकों के लिए आय स्पष्टीकरण'
                      : 'Income clarification for students and applicants under 18'}
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <label
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-xs sm:text-sm font-medium transition-all ${
                        hasPersonalIncome === false
                          ? 'border-primary-500 bg-white text-primary-800 shadow-sm dark:border-primary-400 dark:bg-slate-800 dark:text-primary-200'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="has_personal_income"
                        checked={hasPersonalIncome === false}
                        onChange={() => setHasPersonalIncome(false)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                      />
                      <span>
                        {language === 'mr'
                          ? 'नाही (मी अवलंबून विद्यार्थी/अज्ञान आहे)'
                          : language === 'hi'
                          ? 'नहीं (मैं आश्रित छात्र/अवयस्क हूँ)'
                          : 'No (I am a dependent student/minor)'}
                      </span>
                    </label>

                    <label
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-xs sm:text-sm font-medium transition-all ${
                        hasPersonalIncome === true
                          ? 'border-primary-500 bg-white text-primary-800 shadow-sm dark:border-primary-400 dark:bg-slate-800 dark:text-primary-200'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="has_personal_income"
                        checked={hasPersonalIncome === true}
                        onChange={() => setHasPersonalIncome(true)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                      />
                      <span>
                        {language === 'mr'
                          ? 'होय (माझे स्वतःचे उत्पन्न आहे)'
                          : language === 'hi'
                          ? 'हाँ (मेरी व्यक्तिगत आय है)'
                          : 'Yes (I earn personal income)'}
                      </span>
                    </label>
                  </div>
                </div>

                {hasPersonalIncome === false && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                    <p className="font-medium leading-relaxed">
                      {t('profile.studentChildIncomeNotice')}
                    </p>
                  </div>
                )}

                {hasPersonalIncome === false ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {t('profile.incomeSourceLabel')}
                      </label>
                      <div className="relative mt-1.5">
                        <Tag size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                          value={incomeSource}
                          onChange={(e) => setIncomeSource(e.target.value as any)}
                          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          <option value="father">{t('profile.incomeSourceFather')}</option>
                          <option value="mother">{t('profile.incomeSourceMother')}</option>
                          <option value="legal_guardian">{t('profile.incomeSourceGuardian')}</option>
                          <option value="family">{t('profile.incomeSourceFamily')}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {t('profile.fieldGuardianAnnualIncome')}
                      </label>
                      <div className="relative mt-1.5">
                        <IndianRupee size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          value={guardianIncome}
                          onChange={(e) => setGuardianIncome(e.target.value)}
                          placeholder="e.g. 150000"
                          min="0"
                          step="1000"
                          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {t('profile.fieldAnnualIncome')}
                    </label>
                    <div className="relative mt-1.5">
                      <IndianRupee size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        value={annualIncome}
                        onChange={(e) => setAnnualIncome(e.target.value)}
                        placeholder={t('profile.fieldAnnualIncomePlaceholder')}
                        min="0"
                        step="1000"
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {t('profile.fieldAnnualIncome')}
                </label>
                <div className="relative mt-1.5">
                  <IndianRupee size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(e.target.value)}
                    placeholder={t('profile.fieldAnnualIncomePlaceholder')}
                    min="0"
                    step="1000"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 8. Caste / Category */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('profile.fieldCategory')}
            </label>
            <div className="relative mt-1.5">
              <Tag size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">{t('profile.fieldCategoryPlaceholder')}</option>
                <option value="General">{t('profile.categoryGeneral')}</option>
                <option value="OBC">{t('profile.categoryObc')}</option>
                <option value="SC">{t('profile.categorySc')}</option>
                <option value="ST">{t('profile.categorySt')}</option>
                <option value="EWS">{t('profile.categoryEws')}</option>
              </select>
            </div>
          </div>

          {/* 9. Disability Status */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {language === 'mr' ? 'दिव्यांगत्व स्थिती (Disability Status)' : language === 'hi' ? 'दिव्यांगता स्थिति (Disability Status)' : 'Disability Status'}
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {language === 'mr' ? 'दिव्यांगजन योजनांसाठी' : language === 'hi' ? 'दिव्यांगजन योजनाओं हेतु' : 'For Divyangjan Schemes'}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {(['No', 'Yes', 'Prefer not to say'] as const).map((opt) => (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-xs sm:text-sm font-medium transition-all ${
                    disabilityStatus === opt
                      ? 'border-accent-500 bg-accent-50 text-accent-800 shadow-sm dark:border-accent-400 dark:bg-accent-900/30 dark:text-accent-200'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="disability_status"
                    value={opt}
                    checked={disabilityStatus === opt}
                    onChange={() => setDisabilityStatus(opt)}
                    className="h-4 w-4 text-accent-600 focus:ring-accent-500"
                  />
                  <span>
                    {opt === 'No'
                      ? (language === 'mr' ? 'नाही (No)' : language === 'hi' ? 'नहीं (No)' : 'No')
                      : opt === 'Yes'
                      ? (language === 'mr' ? 'होय (Yes)' : language === 'hi' ? 'हाँ (Yes)' : 'Yes')
                      : (language === 'mr' ? 'सांगू इच्छित नाही (Prefer not to say)' : language === 'hi' ? 'बताना नहीं चाहते (Prefer not to say)' : 'Prefer not to say')}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-slate-800 sm:flex-row sm:justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center justify-center gap-2 !py-3 !px-6 text-sm font-bold shadow-soft"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{t('common.saving')}</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>{t('profile.saveProfileBtn')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
