import { Link, useNavigate } from 'react-router-dom';
import { Landmark, LogOut, LayoutDashboard } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

// Floating navbar — rounded container with soft shadow, inset from page edges.
export default function Navbar() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-3 z-50 px-3 sm:top-4 sm:px-4">
      <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-cream-200 bg-cream-50/85 px-4 py-2.5 shadow-soft-lg backdrop-blur-md dark:border-primary-700 dark:bg-primary-800/85 sm:px-5">
        {/* Logo + wordmark */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-700">
            <Landmark className="h-5 w-5 text-cream-50" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-primary-700 dark:text-cream-50">
            VoiceBridge<span className="text-accent-500">AI</span>
          </span>
        </Link>

        {/* Centered nav links */}
        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm font-medium tracking-wide text-primary-500 transition-colors hover:text-primary-700 dark:text-cream-200/70 dark:hover:text-cream-50">
            {t('nav.features')}
          </a>
          <a href="#how-it-works" className="text-sm font-medium tracking-wide text-primary-500 transition-colors hover:text-primary-700 dark:text-cream-200/70 dark:hover:text-cream-50">
            {t('nav.howItWorks')}
          </a>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSelector />
          <ThemeToggle />

          {user ? (
            <>
              <Link to="/dashboard" className="btn-secondary !py-2 !px-4">
                <LayoutDashboard size={16} />
                <span className="hidden sm:inline">{t('nav.dashboard')}</span>
              </Link>
              <button onClick={handleSignOut} className="btn-primary !py-2 !px-4">
                <LogOut size={16} />
                <span className="hidden sm:inline">{t('nav.signOut')}</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary !py-2 !px-4">
                {t('nav.signIn')}
              </Link>
              <Link to="/signup" className="btn-primary !py-2 !px-4">
                {t('nav.signUp')}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
