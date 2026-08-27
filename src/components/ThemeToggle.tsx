import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = true }: ThemeToggleProps) {
  const { theme, setTheme, isDark } = useTheme();

  return (
    <div
      className={`inline-flex items-center p-1 rounded-full bg-slate-200/90 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 shadow-inner backdrop-blur-md transition-colors duration-300 ${className}`}
      role="group"
      aria-label="Pilih Mode Tampilan"
    >
      {/* Light Option Button */}
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`relative px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
          !isDark
            ? 'bg-white text-amber-600 shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Beralih ke Mode Terang (Light)"
      >
        <Sun className={`w-3.5 h-3.5 ${!isDark ? 'text-amber-500 fill-amber-500/30' : ''}`} />
        {showLabel && <span>Light</span>}
      </button>

      {/* Dark Option Button */}
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`relative px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
          isDark
            ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Beralih ke Mode Gelap (Dark)"
      >
        <Moon className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400 fill-amber-400/30' : ''}`} />
        {showLabel && <span>Dark</span>}
      </button>
    </div>
  );
}
