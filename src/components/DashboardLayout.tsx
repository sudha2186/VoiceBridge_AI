import { useState, ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Landmark,
  LayoutDashboard,
  Bot,
  FileText,
  FolderOpen,
  User,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const NAV_ITEMS = [
    { to: '/dashboard', label: t('nav.overview'), icon: LayoutDashboard, end: true },
    { to: '/dashboard/profile', label: t('nav.profile'), icon: User, end: false },
    { to: '/dashboard/assistant', label: t('nav.assistant'), icon: Bot, end: false },
    { to: '/dashboard/documents', label: t('nav.documents'), icon: FolderOpen, end: false },
    { to: '/dashboard/applications', label: t('nav.applications'), icon: FileText, end: false },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const SidebarContent = (
    <div className="flex h-full flex-col bg-white dark:bg-primary-800">
      <div className="flex items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-700">
            <Landmark className="h-5 w-5 text-cream-50" />
          </div>
          <span className="text-lg font-extrabold text-primary-700 dark:text-cream-50">
            VoiceBridge<span className="text-accent-500">AI</span>
          </span>
        </Link>
      </div>

      <div className="px-5 pb-2">
        <div className="flex items-center justify-between rounded-xl bg-cream-50 p-2 dark:bg-primary-900/60">
          <span className="text-xs font-semibold text-primary-500 dark:text-cream-200/70">{t('common.language')}</span>
          <LanguageSelector />
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-700 text-cream-50 shadow-soft dark:bg-primary-600'
                  : 'text-primary-500 hover:bg-cream-100 hover:text-primary-700 dark:text-cream-200/60 dark:hover:bg-primary-700 dark:hover:text-cream-50'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-cream-200 p-3 dark:border-primary-700">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
            {(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-primary-700 dark:text-cream-100">
              {profile?.full_name || 'Citizen'}
            </p>
            <p className="truncate text-xs text-primary-400 dark:text-cream-200/50">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-primary-500 transition-colors hover:bg-cream-100 hover:text-primary-700 dark:text-cream-200/60 dark:hover:bg-primary-700 dark:hover:text-cream-50"
        >
          <LogOut size={18} />
          {t('nav.signOut')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-primary-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 rounded-r-2xl border-r border-cream-200 bg-white shadow-soft dark:border-primary-700 lg:block">
        {SidebarContent}
      </aside>

      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-primary-900/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 rounded-r-2xl border-r border-cream-200 bg-white shadow-soft-lg dark:border-primary-700 lg:hidden">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-4 rounded-xl p-1.5 text-primary-400 hover:bg-cream-100"
            >
              <X size={20} />
            </button>
            {SidebarContent}
          </aside>
        </>
      )}

      <div className="lg:pl-64">
        {/* Top desktop header with persistent language switcher & theme toggle */}
        <header className="sticky top-0 z-30 hidden items-center justify-between border-b border-cream-200 bg-cream-50/85 px-6 py-3 backdrop-blur-md dark:border-primary-700 dark:bg-primary-800/85 lg:flex">
          <div className="text-sm font-semibold text-primary-700 dark:text-cream-100">
            {t('common.tagline')}
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <button
              onClick={toggleTheme}
              className="rounded-xl p-2 text-primary-500 hover:bg-cream-100 dark:text-cream-200/70 dark:hover:bg-primary-700"
              title="Toggle theme"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-cream-200 bg-cream-50/85 px-4 py-3 backdrop-blur-md dark:border-primary-700 dark:bg-primary-800/85 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl p-2 text-primary-500 hover:bg-cream-100 dark:text-cream-200/70 dark:hover:bg-primary-700"
          >
            <Menu size={20} />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-700">
              <Landmark className="h-4 w-4 text-cream-50" />
            </div>
            <span className="font-extrabold text-primary-700 dark:text-cream-50">VoiceBridgeAI</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <button
              onClick={toggleTheme}
              className="rounded-xl p-2 text-primary-500 hover:bg-cream-100 dark:text-cream-200/70 dark:hover:bg-primary-700"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
