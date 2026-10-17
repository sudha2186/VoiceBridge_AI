import { Landmark, Heart, Twitter, Linkedin, Github, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-cream-200 bg-cream-50 dark:border-primary-700 dark:bg-primary-800/50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-5 lg:gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-700 shadow-soft">
                <Landmark className="h-5 w-5 text-cream-50" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-primary-700 dark:text-cream-50">
                Kathya<span className="text-accent-500">AI</span>
              </span>
            </div>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-primary-500 dark:text-cream-200/70">
              An AI-powered assistant that helps Indian citizens discover and apply for
              government schemes — with auto-filled forms and downloadable PDF applications.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a href="#" className="text-primary-400 transition-colors hover:text-accent-600 dark:text-cream-200/60 dark:hover:text-accent-400">
                <span className="sr-only">Twitter</span>
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-primary-400 transition-colors hover:text-accent-600 dark:text-cream-200/60 dark:hover:text-accent-400">
                <span className="sr-only">LinkedIn</span>
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-primary-400 transition-colors hover:text-accent-600 dark:text-cream-200/60 dark:hover:text-accent-400">
                <span className="sr-only">GitHub</span>
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-primary-400 transition-colors hover:text-accent-600 dark:text-cream-200/60 dark:hover:text-accent-400">
                <span className="sr-only">Email</span>
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-wider text-primary-800 dark:text-cream-50">
              Product
            </h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li><a href="#features" className="text-primary-500 transition-colors hover:text-accent-600 dark:text-cream-200/70 dark:hover:text-accent-400">Features</a></li>
              <li><a href="#how-it-works" className="text-primary-500 transition-colors hover:text-accent-600 dark:text-cream-200/70 dark:hover:text-accent-400">How it Works</a></li>
              <li><Link to="/signup" className="text-primary-500 transition-colors hover:text-accent-600 dark:text-cream-200/70 dark:hover:text-accent-400">Create Account</Link></li>
              <li><Link to="/login" className="text-primary-500 transition-colors hover:text-accent-600 dark:text-cream-200/70 dark:hover:text-accent-400">Sign In</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-wider text-primary-800 dark:text-cream-50">
              Resources
            </h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li><a href="https://www.india.gov.in" target="_blank" rel="noopener noreferrer" className="text-primary-500 transition-colors hover:text-accent-600 dark:text-cream-200/70 dark:hover:text-accent-400">National Portal of India</a></li>
              <li><a href="https://www.myscheme.gov.in" target="_blank" rel="noopener noreferrer" className="text-primary-500 transition-colors hover:text-accent-600 dark:text-cream-200/70 dark:hover:text-accent-400">MyScheme</a></li>
              <li><a href="#" className="text-primary-500 transition-colors hover:text-accent-600 dark:text-cream-200/70 dark:hover:text-accent-400">Help Center</a></li>
              <li><a href="#" className="text-primary-500 transition-colors hover:text-accent-600 dark:text-cream-200/70 dark:hover:text-accent-400">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-wider text-primary-800 dark:text-cream-50">
              Legal
            </h3>
            <ul className="mt-5 space-y-3 text-sm">
              <li><a href="#" className="text-primary-500 transition-colors hover:text-accent-600 dark:text-cream-200/70 dark:hover:text-accent-400">Privacy Policy</a></li>
              <li><a href="#" className="text-primary-500 transition-colors hover:text-accent-600 dark:text-cream-200/70 dark:hover:text-accent-400">Terms of Service</a></li>
              <li><a href="#" className="text-primary-500 transition-colors hover:text-accent-600 dark:text-cream-200/70 dark:hover:text-accent-400">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between border-t border-cream-200 pt-8 dark:border-primary-700 sm:flex-row gap-4">
          <p className="flex items-center gap-1.5 text-sm text-primary-500 dark:text-cream-200/70">
            Made with <Heart size={14} className="text-accent-500" /> for the citizens of India
          </p>
          <div className="text-center sm:text-right">
            <p className="text-xs text-primary-400 dark:text-cream-200/50 max-w-lg">
              KathyaAI does not submit applications to government websites. Generated PDFs must be
              submitted by the citizen through official channels.
            </p>
            <p className="mt-2 text-sm text-primary-500 dark:text-cream-200/70">
              &copy; {new Date().getFullYear()} KathyaAI. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
