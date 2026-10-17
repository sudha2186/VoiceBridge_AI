import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const replacements = [
  // Slate → warm palette
  [/\bslate-200\b/g, 'cream-200'],
  [/\bslate-100\b/g, 'cream-100'],
  [/\bslate-50\b/g, 'cream-50'],
  [/\bslate-300\b/g, 'primary-200'],
  [/\bslate-400\b/g, 'primary-400'],
  [/\bslate-500\b/g, 'primary-400'],
  [/\bslate-600\b/g, 'primary-500'],
  [/\bslate-700(?!\/)\b/g, 'primary-700'],
  [/\bslate-800(?!\/)\b/g, 'primary-800'],
  [/\bslate-900(?!\/)\b/g, 'primary-900'],
  [/\bslate-700\/50\b/g, 'primary-700/50'],
  [/\bslate-700\/30\b/g, 'primary-700/30'],
  [/\bslate-900\/50\b/g, 'primary-900/50'],
  [/\bslate-900\/40\b/g, 'primary-900/40'],
  [/\bslate-900\/30\b/g, 'primary-900/30'],
  // White → cream (in dark-mode contexts, white backgrounds become cream)
  [/\btext-white\b/g, 'text-cream-50'],
  [/\bbg-white\/80\b/g, 'bg-cream-50/80'],
  [/\bbg-white\/85\b/g, 'bg-cream-50/85'],
  [/\bbg-white\/90\b/g, 'bg-cream-50/90'],
  [/\bbg-white\/95\b/g, 'bg-cream-50/95'],
  [/\bbg-white\/10\b/g, 'bg-cream-50/10'],
  [/\bbg-white\/15\b/g, 'bg-cream-50/15'],
  [/\bfrom-white\b/g, 'from-cream-50'],
  [/\btext-white\/90\b/g, 'text-cream-50/90'],
  // Don't replace plain bg-white → keep as white for cards
  // Shadows
  [/\bshadow-md\b/g, 'shadow-soft'],
  [/\bshadow-lg\b/g, 'shadow-soft-lg'],
  [/\bshadow-xl\b/g, 'shadow-soft-lg'],
  [/\bshadow-2xl\b/g, 'shadow-soft-xl'],
  // Black overlays → primary-900
  [/\bbg-black\/50\b/g, 'bg-primary-900/40'],
  [/\bbg-black\/60\b/g, 'bg-primary-900/50'],
  // Dark mode slate hovers
  [/\bdark:hover:bg-slate-700\b/g, 'dark:hover:bg-primary-700'],
  [/\bdark:hover:bg-slate-800\b/g, 'dark:hover:bg-primary-800'],
  [/\bdark:hover:bg-slate-800\/50\b/g, 'dark:hover:bg-primary-800/50'],
  [/\bdark:bg-slate-800\b/g, 'dark:bg-primary-800'],
  [/\bdark:bg-slate-800\/50\b/g, 'dark:bg-primary-800/50'],
  [/\bdark:bg-slate-800\/80\b/g, 'dark:bg-primary-800/80'],
  [/\bdark:bg-slate-800\/90\b/g, 'dark:bg-primary-800/90'],
  [/\bdark:bg-slate-800\/95\b/g, 'dark:bg-primary-800/95'],
  [/\bdark:bg-slate-900\/40\b/g, 'dark:bg-primary-900/40'],
  [/\bdark:bg-slate-900\/50\b/g, 'dark:bg-primary-900/50'],
  [/\bdark:bg-slate-900\/30\b/g, 'dark:bg-primary-900/30'],
  [/\bdark:bg-slate-700\b/g, 'dark:bg-primary-700'],
  [/\bdark:bg-slate-700\/50\b/g, 'dark:bg-primary-700/50'],
  [/\bdark:border-slate-700\b/g, 'dark:border-primary-700'],
  [/\bdark:border-slate-700\/50\b/g, 'dark:border-primary-700/50'],
  [/\bdark:border-slate-600\b/g, 'dark:border-primary-600'],
  [/\bdark:border-slate-600\/50\b/g, 'dark:border-primary-600/50'],
  [/\bdark:text-slate-100\b/g, 'dark:text-cream-100'],
  [/\bdark:text-slate-200\b/g, 'dark:text-cream-200'],
  [/\bdark:text-slate-200\/70\b/g, 'dark:text-cream-200/70'],
  [/\bdark:text-slate-200\/60\b/g, 'dark:text-cream-200/60'],
  [/\bdark:text-slate-200\/50\b/g, 'dark:text-cream-200/50'],
  [/\bdark:text-slate-300\b/g, 'dark:text-cream-200/80'],
  [/\bdark:text-slate-400\b/g, 'dark:text-cream-200/60'],
  [/\bdark:text-slate-500\b/g, 'dark:text-cream-200/50'],
  [/\bdark:hover:text-white\b/g, 'dark:hover:text-cream-50'],
  [/\bdark:hover:text-slate-300\b/g, 'dark:hover:text-cream-200/80'],
  // Hover states for light mode
  [/\bhover:bg-slate-50\b/g, 'hover:bg-cream-100'],
  [/\bhover:bg-slate-100\b/g, 'hover:bg-cream-100'],
  [/\bdark:hover:bg-cream-100\b/g, 'dark:hover:bg-primary-700'],
];

function processDir(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
      let content = readFileSync(fullPath, 'utf-8');
      const original = content;
      for (const [pattern, replacement] of replacements) {
        content = content.replace(pattern, replacement);
      }
      if (content !== original) {
        writeFileSync(fullPath, content);
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDir('src');
console.log('Done');
