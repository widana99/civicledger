import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThemeToggleProps {
  className?: string;
  variant?: 'pill' | 'compact';
  showLabel?: boolean;
}

export function ThemeToggle({
  className = '',
  variant = 'pill',
  showLabel = true,
}: ThemeToggleProps) {
  const { theme, setTheme, toggleTheme, isDark } = useTheme();

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`relative p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-300 shadow-xs flex items-center justify-center cursor-pointer group ${className}`}
        title={isDark ? 'Beralih ke Mode Terang (Light)' : 'Beralih ke Mode Gelap (Dark)'}
        aria-label="Toggle Light / Dark Mode"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ rotate: -90, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Moon className="w-4 h-4 text-[#E5A93C] fill-[#E5A93C]/20" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ rotate: 90, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    );
  }

  return (
    <div
      className={`inline-flex items-center p-1 rounded-full bg-slate-200/90 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 shadow-inner backdrop-blur-md transition-colors duration-300 ${className}`}
      role="group"
      aria-label="Pilih Mode Tampilan"
    >
      {/* Light Option Button */}
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`relative px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
          !isDark
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Beralih ke Mode Terang (Light)"
      >
        <Sun className={`w-3.5 h-3.5 ${!isDark ? 'text-amber-500 fill-amber-500/40' : ''}`} />
        {showLabel && <span>Light</span>}
      </button>

      {/* Dark Option Button */}
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`relative px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
          isDark
            ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Beralih ke Mode Gelap (Dark)"
      >
        <Moon className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400 fill-amber-400/40' : ''}`} />
        {showLabel && <span>Dark</span>}
      </button>
    </div>
  );
}
