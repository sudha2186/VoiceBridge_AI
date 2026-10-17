import { Link } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import { ReactNode } from 'react';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';

// Shared layout for login + signup pages.
// Uses the hero image as a background with a warm overlay; form floats in a white card.
export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen bg-cream-100 dark:bg-primary-900">
      {/* Background hero image with warm overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero.jpeg"
          alt=""
          className="h-full w-full object-cover animate-ken-burns"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/80 via-primary-800/60 to-accent-900/40" />
      </div>

      {/* Top bar with LanguageSelector & ThemeToggle */}
      <div className="absolute top-0 right-0 z-20 flex items-center justify-between p-4">
        <div className="ml-auto flex items-center gap-2">
          <LanguageSelector />
          <ThemeToggle />
        </div>
      </div>

      {/* Form area — centered on mobile, right-aligned card on desktop */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-md">
          {/* Brand (desktop) */}
          <Link to="/" className="mb-8 hidden items-center gap-2 lg:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream-50/90">
              <Landmark className="h-6 w-6 text-primary-700" />
            </div>
            <span className="text-xl font-extrabold text-cream-50">VoiceBridgeAI</span>
          </Link>

          {/* Floating white card */}
          <div className="rounded-2xl bg-white p-7 shadow-soft-xl dark:bg-primary-800 sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-primary-700 dark:text-cream-50">{title}</h1>
            <p className="mt-2 text-sm text-primary-400 dark:text-cream-200/60">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
