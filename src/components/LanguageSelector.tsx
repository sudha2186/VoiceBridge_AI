import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Language, SUPPORTED_LANGUAGES } from '@/types/language';

export default function LanguageSelector({ variant = 'default' }: { variant?: 'default' | 'pill' | 'compact' }) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-xl border border-cream-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-primary-700 shadow-sm transition-all hover:bg-cream-100 hover:text-primary-900 dark:border-primary-700 dark:bg-primary-800/90 dark:text-cream-100 dark:hover:bg-primary-700 sm:text-sm"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Change application language"
      >
        <Globe size={15} className="text-accent-600 dark:text-accent-400" />
        <span className="font-medium">{currentLangObj.nativeName}</span>
        <ChevronDown size={14} className={`text-primary-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-2xl border border-cream-200 bg-white p-1.5 shadow-soft-xl ring-1 ring-black/5 dark:border-primary-700 dark:bg-primary-800">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary-400 dark:text-cream-200/50">
            Select Language / भाषा निवडा
          </div>
          <div className="space-y-1">
            {SUPPORTED_LANGUAGES.map((item) => {
              const isSelected = item.code === language;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSelect(item.code)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors sm:text-sm ${
                    isSelected
                      ? 'bg-primary-700 text-cream-50 font-medium dark:bg-primary-600'
                      : 'text-primary-700 hover:bg-cream-100 dark:text-cream-100 dark:hover:bg-primary-700'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{item.nativeName}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-cream-200' : 'text-primary-400 dark:text-cream-200/50'}`}>
                      {item.name}
                    </span>
                  </div>
                  {isSelected && <Check size={16} className="text-accent-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
