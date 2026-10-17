export type Language = 'en' | 'hi' | 'mr';

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  subtext: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    subtext: 'Speak and read in English',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    subtext: 'अपनी भाषा हिन्दी में बोलें और पढ़ें',
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    subtext: 'आपल्या मराठी भाषेत बोला आणि वाचा',
  },
];
