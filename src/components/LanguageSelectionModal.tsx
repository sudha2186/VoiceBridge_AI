import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check, ArrowRight, Volume2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Language, SUPPORTED_LANGUAGES } from '@/types/language';

export default function LanguageSelectionModal() {
  const { language, isLanguageModalOpen, selectLanguageAndClose, closeLanguageModal } = useLanguage();
  const [selectedLang, setSelectedLang] = useState<Language>(language);

  if (!isLanguageModalOpen) {
    return null;
  }

  const handleConfirm = () => {
    selectLanguageAndClose(selectedLang);
  };

  const getLanguageGreeting = (code: Language) => {
    switch (code) {
      case 'hi':
        return 'नमस्ते! अपनी भाषा चुनें';
      case 'mr':
        return 'नमस्कार! आपली भाषा निवडा';
      default:
        return 'Welcome! Choose your language';
    }
  };

  const getConfirmButtonText = (code: Language) => {
    switch (code) {
      case 'hi':
        return 'हिन्दी में जारी रखें';
      case 'mr':
        return 'मराठीत पुढे जा';
      default:
        return 'Continue in English';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-primary-950/70 backdrop-blur-md"
          onClick={closeLanguageModal}
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-cream-200 bg-white p-6 shadow-soft-2xl dark:border-primary-700 dark:bg-primary-900 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-language-title"
        >
          {/* Header Icon + Titles */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-cream-100">
              <Globe className="h-7 w-7 text-accent-600 dark:text-accent-400" />
            </div>

            <h2
              id="modal-language-title"
              className="mt-4 text-xl font-extrabold tracking-tight text-primary-900 dark:text-cream-50 sm:text-2xl"
            >
              Choose Your Language
            </h2>
            <p className="mt-1 text-sm font-medium text-accent-700 dark:text-accent-300">
              अपनी भाषा चुनें / आपली भाषा निवडा
            </p>
            <p className="mt-2 text-xs text-primary-400 dark:text-cream-200/60 sm:text-sm">
              Select your preferred language for voice assistance and interface. You can change this at any time.
            </p>
          </div>

          {/* Exactly 3 Language Cards */}
          <div className="mt-6 space-y-3">
            {SUPPORTED_LANGUAGES.map((item) => {
              const isSelected = selectedLang === item.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setSelectedLang(item.code)}
                  className={`group relative flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-accent-500 bg-accent-50/50 shadow-soft dark:border-accent-400 dark:bg-primary-800/80 ring-2 ring-accent-400/40'
                      : 'border-cream-200 bg-cream-50/60 hover:border-primary-300 hover:bg-cream-100 dark:border-primary-700/80 dark:bg-primary-800/40 dark:hover:bg-primary-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold transition-colors ${
                        isSelected
                          ? 'bg-primary-700 text-cream-50 dark:bg-accent-500'
                          : 'bg-cream-200 text-primary-700 dark:bg-primary-700 dark:text-cream-200'
                      }`}
                    >
                      {item.code.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-primary-900 dark:text-cream-50">
                          {item.nativeName}
                        </span>
                        <span className="text-xs font-medium text-primary-400 dark:text-cream-200/60">
                          ({item.name})
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-primary-500 dark:text-cream-200/70">
                        {item.subtext}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-primary-200 dark:border-primary-600">
                      {isSelected ? (
                        <span className="h-3 w-3 rounded-full bg-accent-600 dark:bg-accent-400" />
                      ) : null}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Action Button */}
          <div className="mt-7">
            <button
              type="button"
              onClick={handleConfirm}
              className="btn-primary flex w-full items-center justify-center gap-2 !py-3.5 text-base font-bold shadow-soft-lg"
            >
              <span>{getConfirmButtonText(selectedLang)}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
