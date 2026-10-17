import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Mic,
  Square,
  Loader2,
  FileText,
  Download,
  Calendar,
  User,
  MapPin,
  Briefcase,
  IndianRupee,
  Tag,
  ArrowRight,
  ExternalLink,
  Volume2,
  Languages,
  Check,
  Edit2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useLanguage } from '@/context/LanguageContext';
import { updateProfile, Profile } from '@/services/profileService';
import { getSchemes, Scheme } from '@/services/schemeService';
import { checkAllEligibility, EligibilityResult } from '@/services/eligibilityService';
import { createApplication } from '@/services/applicationService';
import { calculateAge, formatDateForInput } from '@/utils/ageUtils';
import { Language as LanguageCode } from '@/types/language';

interface ExtractedProfile {
  full_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  state: string | null;
  district: string | null;
  occupation: string | null;
  annual_income: number | null;
  category: string | null;
}

interface Message {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  timestamp: string;
  extracted?: ExtractedProfile | null;
  missingFields?: string[];
  isWhisperTranscript?: boolean;
  intent?: { intent: string; confidence: number } | null;
  modelEntities?: Array<{ text: string; label: string }> | null;
  fieldSources?: Record<string, string> | null;
}

const SYSTEM_INSTRUCTIONS: Record<LanguageCode, { prompt: string; placeholder: string; title: string }> = {
  en: {
    title: 'Natural-Language Voice & Text Scheme Assistant',
    prompt:
      'Please tell me about yourself in your own words. You can mention your date of birth, gender, state, district, occupation, annual income, and caste/category. You do not need to follow any specific sentence format.',
    placeholder:
      'e.g. My name is Rahul. I was born on 15 August 2002. I am male, I live in Maharashtra in Thane district, I am a student, my annual income is around two lakh rupees, and I belong to the OBC category.'
  },
  hi: {
    title: 'प्राकृतिक भाषा आवाज़ और पाठ योजना सहायक',
    prompt:
      'कृपया अपने शब्दों में अपने बारे में बताएं। आप अपनी जन्म तिथि, लिंग, राज्य, जिला, व्यवसाय, वार्षिक आय और जाति/वर्ग बता सकते हैं। आपको किसी विशेष वाक्य प्रारूप का पालन करने की आवश्यकता नहीं है।',
    placeholder:
      'उदा. मेरा नाम राहुल है। मेरा जन्म 15 अगस्त 2002 को हुआ था। मैं पुरुष हूँ, महाराष्ट्र के ठाणे जिले में रहता हूँ, मैं एक छात्र हूँ, मेरी वार्षिक आय दो लाख रुपये है और मैं ओबीसी वर्ग से हूँ।'
  },
  mr: {
    title: 'नैसर्गिक भाषा आवाज आणि मजकूर योजना सहाय्यक',
    prompt:
      'कृपया तुमच्या स्वतःच्या शब्दांत तुमच्याबद्दल सांगा. तुम्ही तुमची जन्मतारीख, लिंग, राज्य, जिल्हा, व्यवसाय, वार्षिक उत्पन्न आणि जात/प्रवर्ग सांगू शकता. तुम्हाला कोणत्याही विशिष्ट वाक्य रचनेचे पालन करण्याची गरज नाही.',
    placeholder:
      'उदा. माझे नाव राहुल आहे. माझा जन्म 15 ऑगस्ट 2002 रोजी झाला. मी पुरुष आहे, महाराष्ट्रात ठाणे जिल्ह्यात राहतो, मी विद्यार्थी आहे, माझे वार्षिक उत्पन्न दोन लाख रुपये आहे आणि मी ओबीसी प्रवर्गातील आहे.'
  }
};

export default function AssistantPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const { language, setLanguage, t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState<string | null>(null);

  // Accumulated profile state from extractions
  const [extractedData, setExtractedData] = useState<ExtractedProfile>({
    full_name: null,
    date_of_birth: null,
    gender: null,
    state: null,
    district: null,
    occupation: null,
    annual_income: null,
    category: null
  });

  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [fieldSources, setFieldSources] = useState<Record<string, string>>({});
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Schemes & Eligibility state
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [eligibilityResults, setEligibilityResults] = useState<EligibilityResult[]>([]);
  const [evaluatingSchemes, setEvaluatingSchemes] = useState(false);
  const [applyingSchemeId, setApplyingSchemeId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with existing profile or welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const initialPrompt = SYSTEM_INSTRUCTIONS[language].prompt;
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: initialPrompt,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-load schemes from Supabase
  useEffect(() => {
    getSchemes()
      .then((data) => setSchemes(data))
      .catch((err) => console.error('Error loading schemes catalog:', err));
  }, []);

  // If user already has confirmed profile details in Supabase, pre-populate
  useEffect(() => {
    if (profile) {
      setExtractedData({
        full_name: profile.full_name,
        date_of_birth: profile.date_of_birth,
        gender: profile.gender,
        state: profile.state,
        district: profile.district,
        occupation: profile.occupation,
        annual_income: profile.annual_income,
        category: profile.category
      });
    }
  }, [profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Derived age dynamically computed from Date of Birth
  const calculatedAge = useMemo(() => {
    return calculateAge(extractedData.date_of_birth);
  }, [extractedData.date_of_birth]);

  // Handle Speech Recognition via Whisper Small
  const startRecording = async () => {
    setErrorState(null);
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
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const actualType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualType });
        stream.getTracks().forEach((track) => track.stop());
        await processAudioWithWhisper(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast('info', 'Microphone active', 'Speak naturally. Mention your details in your own words.');
    } catch (err: unknown) {
      console.error('Audio capture error:', err);
      toast('error', 'Microphone error', 'Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudioWithWhisper = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      const ext = audioBlob.type.includes('ogg')
        ? 'recording.ogg'
        : audioBlob.type.includes('wav')
        ? 'recording.wav'
        : 'recording.webm';
      formData.append('audio', audioBlob, ext);
      formData.append('language', language);

      // Attempt backend proxy first, then fallback to local Python microservice port 8000
      let res: Response;
      try {
        res = await fetch('/api/asr/transcribe', {
          method: 'POST',
          body: formData
        });
      } catch {
        res = await fetch('http://127.0.0.1:8000/api/asr/transcribe', {
          method: 'POST',
          body: formData
        });
      }

      const data = await res.json();
      if (data.success && data.text) {
        setAudioTranscript(data.text);
        setInputText(data.text);
        toast('success', 'Whisper Small transcription ready', 'You can review or edit the text before processing.');
      } else {
        toast('error', 'Transcription issue', data.error || 'Whisper Small could not transcribe speech.');
      }
    } catch (err) {
      console.error('Whisper transcription request failed:', err);
      toast('error', 'ASR Service Error', 'Whisper Small service is unavailable.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit Text (either typed or transcribed) for NLP Entity Extraction
  const handleExtractSubmit = async (textToExtract?: string) => {
    const text = (textToExtract || inputText).trim();
    if (!text) return;

    // Add user message to conversation
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isWhisperTranscript: !!audioTranscript
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setAudioTranscript(null);
    setIsProcessing(true);

    try {
      // Call NLP extraction endpoint
      let res: Response;
      try {
        res = await fetch('/api/nlp/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            language,
            previous_profile: extractedData
          })
        });
      } catch {
        res = await fetch('http://127.0.0.1:8000/api/nlp/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            language,
            previous_profile: extractedData
          })
        });
      }

      const data = await res.json();
      if (data.success) {
        const mergedFields = data.extracted_fields as ExtractedProfile;
        setExtractedData(mergedFields);
        setMissingFields(data.missing_fields || []);
        if (data.field_sources) {
          setFieldSources((prev) => ({ ...prev, ...data.field_sources }));
        }

        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: data.clarification_prompt,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          extracted: mergedFields,
          missingFields: data.missing_fields,
          intent: data.intent || null,
          modelEntities: data.model_entities || null,
          fieldSources: data.field_sources || null
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Speak clarification prompt using Web Speech API fallback
        speakResponse(data.clarification_prompt, language);
      } else {
        toast('error', 'Extraction Error', data.error || 'Failed to extract entities.');
      }
    } catch (err) {
      console.error('NLP extraction failed:', err);
      toast('error', 'NLP Service Error', 'Could not connect to entity extraction service.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Speech synthesis fallback using browser Web Speech API
  const speakResponse = (text: string, lang: LanguageCode) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS speech synthesis warning:', e);
    }
  };

  // Confirm and Save Profile to Supabase
  const handleConfirmProfile = async () => {
    if (!user) {
      toast('error', 'Auth required', 'Please sign in to save profile.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile(user.id, {
        full_name: extractedData.full_name || null,
        date_of_birth: extractedData.date_of_birth || null,
        gender: extractedData.gender || null,
        state: extractedData.state || null,
        district: extractedData.district || null,
        occupation: extractedData.occupation || null,
        annual_income: extractedData.annual_income,
        category: extractedData.category || null,
        age: calculatedAge
      });

      await refreshProfile();
      setIsConfirmed(true);
      toast('success', 'Profile Confirmed', 'Your 8 verified details have been saved to Supabase.');

      // Automatically evaluate schemes with confirmed profile
      await runEligibilityEvaluation(extractedData);
    } catch (err: unknown) {
      console.error('Error saving confirmed profile:', err);
      toast('error', 'Database Error', err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Run Eligibility Evaluation against live Supabase Schemes & Rules
  const runEligibilityEvaluation = async (profData: ExtractedProfile) => {
    setEvaluatingSchemes(true);
    try {
      const activeProfile: Profile = {
        id: user?.id || 'demo-user',
        full_name: profData.full_name,
        date_of_birth: profData.date_of_birth,
        age: calculatedAge,
        gender: profData.gender,
        state: profData.state,
        district: profData.district,
        occupation: profData.occupation,
        annual_income: profData.annual_income,
        category: profData.category,
        disability_status: profile?.disability_status || null,
        phone: profile?.phone || null
      };

      const results = checkAllEligibility(activeProfile, schemes, language);
      setEligibilityResults(results);

      const eligibleCount = results.filter((r) => r.status === 'eligible').length;
      toast('success', 'Schemes Evaluated', `Found ${eligibleCount} eligible schemes based on verified criteria.`);
    } catch (err) {
      console.error('Error evaluating schemes:', err);
    } finally {
      setEvaluatingSchemes(false);
    }
  };

  // Navigate to Official Scheme Application Workflow
  const handleApplyScheme = (scheme: Scheme) => {
    navigate(`/dashboard/applications?scheme_id=${scheme.id}`);
  };

  const [, setErrorState] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-2">
      {/* Top Banner & Language Selector */}
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-primary-800 to-primary-900 p-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-primary-100 backdrop-blur-sm">
              <Sparkles size={13} /> Voice-First AI
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-200">
              Whisper Small + Multilingual NER
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{SYSTEM_INSTRUCTIONS[language].title}</h1>
          <p className="mt-1 text-sm text-primary-200">
            Speak or type one complete sentence in your own words. The AI extracts all 8 profile fields automatically.
          </p>
        </div>

        {/* Language Selection Bar */}
        <div className="flex items-center gap-2 self-start rounded-xl bg-white/10 p-1.5 backdrop-blur-sm sm:self-auto">
          <Languages size={16} className="ml-2 text-primary-200" />
          <button
            onClick={() => setLanguage('en')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              language === 'en' ? 'bg-white text-primary-800 shadow' : 'text-primary-100 hover:text-white'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('hi')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              language === 'hi' ? 'bg-white text-primary-800 shadow' : 'text-primary-100 hover:text-white'
            }`}
          >
            हिंदी
          </button>
          <button
            onClick={() => setLanguage('mr')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              language === 'mr' ? 'bg-white text-primary-800 shadow' : 'text-primary-100 hover:text-white'
            }`}
          >
            मराठी
          </button>
        </div>
      </div>

      {/* Main Grid: Conversation on Left, Live Profile Card on Right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Conversational AI & Voice Input (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          <div className="flex h-[480px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Chat Messages Log */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      m.sender === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {m.sender === 'user' ? 'You' : 'AI'}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      m.sender === 'user'
                        ? 'bg-primary-50 text-slate-900 dark:bg-primary-950/40 dark:text-cream-100'
                        : 'border border-slate-100 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-100'
                    }`}
                  >
                    {m.isWhisperTranscript && (
                      <span className="mb-1 inline-block rounded bg-primary-200 px-1.5 py-0.5 text-[10px] font-semibold text-primary-900 dark:bg-primary-900/60 dark:text-primary-200">
                        Transcribed with Whisper Small
                      </span>
                    )}
                    {m.intent && (
                      <span className="mb-1 mr-1 inline-block rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200">
                        Intent: {m.intent.intent.replace(/_/g, ' ')} ({Math.round(m.intent.confidence * 100)}%)
                      </span>
                    )}
                    <p>{m.text}</p>
                    {m.modelEntities && m.modelEntities.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.modelEntities.map((ent, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] text-slate-700 dark:bg-slate-700/80 dark:text-slate-200"
                          >
                            <span className="font-semibold text-primary-700 dark:text-primary-300">{ent.label}:</span>
                            {ent.text}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{m.timestamp}</span>
                      {m.sender === 'assistant' && (
                        <button
                          onClick={() => speakResponse(m.text, language)}
                          className="flex items-center gap-1 hover:text-primary-600"
                        >
                          <Volume2 size={12} /> Listen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isProcessing && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 size={16} className="animate-spin text-primary-600" />
                  <span>AI is processing speech & extracting entities...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Editable Transcript Banner if recorded */}
            {audioTranscript && (
              <div className="border-t border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="flex items-center justify-between font-semibold text-amber-900 dark:text-amber-200">
                  <span>Review Speech Transcript (Whisper Small):</span>
                  <button
                    onClick={() => handleExtractSubmit(audioTranscript)}
                    className="rounded bg-amber-600 px-2.5 py-1 text-white hover:bg-amber-700"
                  >
                    Confirm & Extract
                  </button>
                </div>
                <p className="mt-1 italic text-slate-700 dark:text-slate-300">"{audioTranscript}"</p>
              </div>
            )}

            {/* Voice and Text Input Area */}
            <div className="border-t border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                {/* Voice Record Toggle */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-medium shadow-sm transition-all ${
                    isRecording
                      ? 'animate-pulse bg-red-600 text-white hover:bg-red-700'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                  title={isRecording ? 'Stop Recording' : 'Start Voice Input'}
                >
                  {isRecording ? <Square size={18} /> : <Mic size={20} />}
                </button>

                {/* Text input for voice and text parity */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExtractSubmit()}
                  placeholder={
                    isRecording
                      ? 'Listening... Speak your sentence naturally...'
                      : SYSTEM_INSTRUCTIONS[language].placeholder
                  }
                  disabled={isProcessing || isRecording}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />

                <button
                  type="button"
                  onClick={() => handleExtractSubmit()}
                  disabled={isProcessing || !inputText.trim() || isRecording}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white transition-all hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-700 dark:hover:bg-slate-600"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Extracted 8-Field Review Card (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Extracted Profile Review
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Exact 8 mandatory profile completion fields
                </p>
              </div>
              {calculatedAge !== null && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  Age: {calculatedAge} yrs
                </span>
              )}
            </div>

            {/* List of 8 Fields */}
            <div className="mt-4 space-y-2.5 text-xs">
              {/* 1. Full Name */}
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                  <User size={14} /> Full Name:
                </span>
                <input
                  type="text"
                  value={extractedData.full_name || ''}
                  onChange={(e) => setExtractedData({ ...extractedData, full_name: e.target.value })}
                  placeholder="Not provided"
                  className="w-48 text-right font-medium text-slate-900 bg-transparent focus:outline-none dark:text-white"
                />
              </div>

              {/* 2. Date of Birth (DOB) */}
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                  <Calendar size={14} /> DOB:
                </span>
                <input
                  type="date"
                  value={extractedData.date_of_birth || ''}
                  onChange={(e) => setExtractedData({ ...extractedData, date_of_birth: e.target.value })}
                  className="w-48 text-right font-medium text-slate-900 bg-transparent focus:outline-none dark:text-white"
                />
              </div>

              {/* 3. Gender */}
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                  <User size={14} /> Gender:
                </span>
                <select
                  value={extractedData.gender || ''}
                  onChange={(e) => setExtractedData({ ...extractedData, gender: e.target.value })}
                  className="w-48 text-right font-medium text-slate-900 bg-transparent focus:outline-none dark:text-white"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* 4. State */}
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                  <MapPin size={14} /> State:
                </span>
                <input
                  type="text"
                  value={extractedData.state || ''}
                  onChange={(e) => setExtractedData({ ...extractedData, state: e.target.value })}
                  placeholder="Not provided"
                  className="w-48 text-right font-medium text-slate-900 bg-transparent focus:outline-none dark:text-white"
                />
              </div>

              {/* 5. District */}
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                  <MapPin size={14} /> District:
                </span>
                <input
                  type="text"
                  value={extractedData.district || ''}
                  onChange={(e) => setExtractedData({ ...extractedData, district: e.target.value })}
                  placeholder="Not provided"
                  className="w-48 text-right font-medium text-slate-900 bg-transparent focus:outline-none dark:text-white"
                />
              </div>

              {/* 6. Occupation */}
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                  <Briefcase size={14} /> Occupation:
                </span>
                <input
                  type="text"
                  value={extractedData.occupation || ''}
                  onChange={(e) => setExtractedData({ ...extractedData, occupation: e.target.value })}
                  placeholder="Not provided"
                  className="w-48 text-right font-medium text-slate-900 bg-transparent focus:outline-none dark:text-white"
                />
              </div>

              {/* 7. Annual Income */}
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                  <IndianRupee size={14} /> Annual Income:
                </span>
                <input
                  type="number"
                  value={extractedData.annual_income != null ? extractedData.annual_income : ''}
                  onChange={(e) =>
                    setExtractedData({
                      ...extractedData,
                      annual_income: e.target.value ? parseFloat(e.target.value) : null
                    })
                  }
                  placeholder="Not provided"
                  className="w-48 text-right font-medium text-slate-900 bg-transparent focus:outline-none dark:text-white"
                />
              </div>

              {/* 8. Category */}
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                  <Tag size={14} /> Category:
                </span>
                <select
                  value={extractedData.category || ''}
                  onChange={(e) => setExtractedData({ ...extractedData, category: e.target.value })}
                  className="w-48 text-right font-medium text-slate-900 bg-transparent focus:outline-none dark:text-white"
                >
                  <option value="">Select Category</option>
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                </select>
              </div>
            </div>

            {/* Confirm & Save Button */}
            <div className="mt-5">
              <button
                type="button"
                onClick={handleConfirmProfile}
                disabled={isSavingProfile || isConfirmed}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-sm transition-all ${
                  isConfirmed
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isSavingProfile ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving to Supabase...</span>
                  </>
                ) : isConfirmed ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Profile Confirmed & Saved</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Confirm & Save Profile Details</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Verified Scheme Recommendations Section (Activated upon confirmation) */}
      {isConfirmed && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Verified Government Welfare Schemes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Evaluated against real criteria from Supabase (`Schemes` & `Eligibility_rules` tables)
              </p>
            </div>
            <button
              onClick={() => runEligibilityEvaluation(extractedData)}
              disabled={evaluatingSchemes}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <RotateCcw size={13} className={evaluatingSchemes ? 'animate-spin' : ''} />
              Re-evaluate Eligibility
            </button>
          </div>

          {/* Scheme Cards Grid */}
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {eligibilityResults.map(({ scheme, status, reasons }) => {
              const isEligible = status === 'eligible';
              const isNeedsInfo = status === 'needs_more_information';
              const isPartial = status === 'partially_eligible';

              return (
                <div
                  key={scheme.id}
                  className={`flex flex-col justify-between rounded-xl border p-5 transition-all ${
                    isEligible
                      ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20'
                      : isNeedsInfo || isPartial
                      ? 'border-amber-200 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20'
                      : 'border-slate-200 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/40'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
                        {scheme.ministry || scheme.scheme_type || 'General Scheme'}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          isEligible
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : isNeedsInfo
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                            : isPartial
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {isEligible
                          ? 'Eligible'
                          : isNeedsInfo
                          ? 'Needs More Info'
                          : isPartial
                          ? 'Partially Eligible'
                          : 'Not Eligible'}
                      </span>
                    </div>

                    <h4 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                      {scheme.name || scheme.title}
                    </h4>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2 dark:text-slate-300">
                      {scheme.description}
                    </p>

                    {scheme.benefits && (
                      <div className="mt-3 rounded-lg bg-white/80 p-2 text-xs dark:bg-slate-800/80">
                        <span className="font-semibold text-primary-700 dark:text-primary-300">Benefit: </span>
                        <span className="text-slate-700 dark:text-slate-300">{scheme.benefits}</span>
                      </div>
                    )}

                    {/* Reasons Breakdown */}
                    <div className="mt-3 space-y-1">
                      <span className="text-[11px] font-bold text-slate-500">Eligibility Reasons:</span>
                      {reasons.slice(0, 3).map((r, i) => (
                        <p
                          key={i}
                          className={`text-xs ${
                            r.startsWith('Not eligible')
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : 'text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          • {r}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                    {scheme.official_url && (
                      <a
                        href={scheme.official_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
                      >
                        Official Portal <ExternalLink size={12} />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleApplyScheme(scheme)}
                      className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
                    >
                      <FileText size={13} />
                      <span>Fill Official Form</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
