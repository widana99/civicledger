import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, X, Check, ChevronDown, Sparkles, RotateCcw } from 'lucide-react';

export type DatePreset =
  | 'all'
  | 'today'
  | '24h'
  | 'yesterday'
  | '7d'
  | '30d'
  | 'this_month'
  | 'custom';

export interface DateTimeFilterState {
  preset: DatePreset;
  startDate: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:mm'
  endDate: string;   // 'YYYY-MM-DD'
  endTime: string;   // 'HH:mm'
}

export const INITIAL_DATE_TIME_FILTER: DateTimeFilterState = {
  preset: 'all',
  startDate: '',
  startTime: '00:00',
  endDate: '',
  endTime: '23:59',
};

const PRESET_OPTIONS: { id: DatePreset; label: string; desc?: string }[] = [
  { id: 'all', label: 'Semua Waktu' },
  { id: 'today', label: 'Hari Ini' },
  { id: '24h', label: '24 Jam Terakhir' },
  { id: 'yesterday', label: 'Kemarin' },
  { id: '7d', label: '7 Hari Terakhir' },
  { id: '30d', label: '30 Hari Terakhir' },
  { id: 'this_month', label: 'Bulan Ini' },
  { id: 'custom', label: 'Kustom Tanggal & Jam' },
];

/**
 * Check if a given ISO timestamp matches the selected DateTimeFilterState
 */
export function matchesDateTimeFilter(
  timestamp: string | null | undefined,
  filter: DateTimeFilterState
): boolean {
  if (!timestamp) return false;
  if (filter.preset === 'all') return true;

  const itemDate = new Date(timestamp);
  const itemMs = itemDate.getTime();
  if (isNaN(itemMs)) return true;

  const now = new Date();

  switch (filter.preset) {
    case 'today': {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      return itemMs >= startOfDay && itemMs <= endOfDay;
    }
    case '24h': {
      const past24h = now.getTime() - 24 * 60 * 60 * 1000;
      return itemMs >= past24h && itemMs <= now.getTime();
    }
    case 'yesterday': {
      const yDate = new Date(now);
      yDate.setDate(yDate.getDate() - 1);
      const startOfYesterday = new Date(yDate.getFullYear(), yDate.getMonth(), yDate.getDate(), 0, 0, 0, 0).getTime();
      const endOfYesterday = new Date(yDate.getFullYear(), yDate.getMonth(), yDate.getDate(), 23, 59, 59, 999).getTime();
      return itemMs >= startOfYesterday && itemMs <= endOfYesterday;
    }
    case '7d': {
      const past7d = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      return itemMs >= past7d && itemMs <= now.getTime();
    }
    case '30d': {
      const past30d = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      return itemMs >= past30d && itemMs <= now.getTime();
    }
    case 'this_month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      return itemMs >= startOfMonth && itemMs <= endOfMonth;
    }
    case 'custom': {
      let minMs = -Infinity;
      let maxMs = Infinity;

      if (filter.startDate) {
        const timePart = filter.startTime || '00:00';
        const start = new Date(`${filter.startDate}T${timePart}:00`);
        if (!isNaN(start.getTime())) {
          minMs = start.getTime();
        }
      }

      if (filter.endDate) {
        const timePart = filter.endTime || '23:59';
        const end = new Date(`${filter.endDate}T${timePart}:59`);
        if (!isNaN(end.getTime())) {
          maxMs = end.getTime();
        }
      }

      return itemMs >= minMs && itemMs <= maxMs;
    }
    default:
      return true;
  }
}

/**
 * Get human-readable label for the current filter state
 */
export function getFilterDisplayLabel(filter: DateTimeFilterState): string {
  if (filter.preset === 'all') return 'Semua Waktu';
  if (filter.preset === 'today') return 'Hari Ini';
  if (filter.preset === '24h') return '24 Jam Terakhir';
  if (filter.preset === 'yesterday') return 'Kemarin';
  if (filter.preset === '7d') return '7 Hari Terakhir';
  if (filter.preset === '30d') return '30 Hari Terakhir';
  if (filter.preset === 'this_month') return 'Bulan Ini';

  if (filter.preset === 'custom') {
    if (filter.startDate && filter.endDate) {
      if (filter.startDate === filter.endDate) {
        return `${filter.startDate} (${filter.startTime || '00:00'} - ${filter.endTime || '23:59'})`;
      }
      return `${filter.startDate} s/d ${filter.endDate}`;
    }
    if (filter.startDate) {
      return `Dari ${filter.startDate} ${filter.startTime || '00:00'}`;
    }
    if (filter.endDate) {
      return `Hingga ${filter.endDate} ${filter.endTime || '23:59'}`;
    }
    return 'Kustom Waktu';
  }

  return 'Filter Tanggal & Jam';
}

interface DateTimeFilterProps {
  value: DateTimeFilterState;
  onChange: (filter: DateTimeFilterState) => void;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  className?: string;
  badgeLabel?: string;
}

export function DateTimeFilter({
  value,
  onChange,
  size = 'md',
  align = 'left',
  className = '',
  badgeLabel,
}: DateTimeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<DateTimeFilterState>(value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Keep draft in sync with external value
  useEffect(() => {
    setDraft(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectPreset = (preset: DatePreset) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (preset === 'custom') {
      const nextDraft: DateTimeFilterState = {
        ...draft,
        preset: 'custom',
        startDate: draft.startDate || todayStr,
        startTime: draft.startTime || '00:00',
        endDate: draft.endDate || todayStr,
        endTime: draft.endTime || '23:59',
      };
      setDraft(nextDraft);
      return;
    }

    const nextState: DateTimeFilterState = {
      ...INITIAL_DATE_TIME_FILTER,
      preset,
    };
    setDraft(nextState);
    onChange(nextState);
    setIsOpen(false);
  };

  const handleApplyCustom = () => {
    const nextState: DateTimeFilterState = {
      ...draft,
      preset: 'custom',
    };
    onChange(nextState);
    setIsOpen(false);
  };

  const handleReset = () => {
    setDraft(INITIAL_DATE_TIME_FILTER);
    onChange(INITIAL_DATE_TIME_FILTER);
    setIsOpen(false);
  };

  const isFiltered = value.preset !== 'all';
  const displayLabel = getFilterDisplayLabel(value);

  // Quick hour range presets helper
  const setHourRange = (startTime: string, endTime: string) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setDraft((prev) => ({
      ...prev,
      preset: 'custom',
      startDate: prev.startDate || todayStr,
      endDate: prev.endDate || todayStr,
      startTime,
      endTime,
    }));
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-xl font-semibold transition-all shadow-xs ${
          size === 'sm'
            ? 'px-3 py-1.5 text-xs'
            : 'px-3.5 py-2 text-xs'
        } ${
          isFiltered
            ? 'bg-slate-900 text-white hover:bg-slate-800 ring-2 ring-slate-900/20'
            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
        }`}
      >
        <Calendar className={`w-3.5 h-3.5 ${isFiltered ? 'text-[#D4A843]' : 'text-slate-400'}`} />
        <span className="truncate max-w-[180px] sm:max-w-[220px]">
          {badgeLabel ? `${badgeLabel}: ` : ''}{displayLabel}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Clear Button if active */}
      {isFiltered && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleReset();
          }}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] hover:bg-rose-700 shadow-sm"
          title="Hapus Filter Tanggal & Jam"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}

      {/* Dropdown Modal Popover */}
      {isOpen && (
        <div
          className={`absolute mt-2 z-50 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 space-y-4 animate-scale-in text-slate-900 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0EA58D]" />
              <span className="font-display font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                Filter Tanggal & Jam
              </span>
            </div>
            {isFiltered && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] font-mono text-rose-600 hover:underline flex items-center gap-1 font-bold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Quick Presets Grid */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
              Pilihan Cepat Rentang Waktu:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_OPTIONS.map((p) => {
                const active = draft.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-all flex items-center justify-between ${
                      active
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                    }`}
                  >
                    <span>{p.label}</span>
                    {active && <Check className="w-3 h-3 text-[#D4A843]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date & Time Inputs (Always available or when 'custom' selected) */}
          <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0EA58D]" />
                Kustom Rentang Tanggal & Jam
              </span>
              <span className="text-[10px] text-slate-400 font-mono">WIB (GMT+7)</span>
            </div>

            {/* Quick Hour Range Chips */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-500">Shortcut Jam:</span>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setHourRange('06:00', '12:00')}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-[10px] font-mono text-slate-700 border border-slate-200"
                >
                  Pagi (06:00-12:00)
                </button>
                <button
                  type="button"
                  onClick={() => setHourRange('12:00', '18:00')}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-[10px] font-mono text-slate-700 border border-slate-200"
                >
                  Siang (12:00-18:00)
                </button>
                <button
                  type="button"
                  onClick={() => setHourRange('18:00', '23:59')}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-[10px] font-mono text-slate-700 border border-slate-200"
                >
                  Malam (18:00-24:00)
                </button>
                <button
                  type="button"
                  onClick={() => setHourRange('00:00', '23:59')}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-[10px] font-mono text-slate-700 border border-slate-200"
                >
                  24 Jam Penuh
                </button>
              </div>
            </div>

            {/* Start Date & Time */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-600 block">
                Dari (Mulai):
              </label>
              <div className="grid grid-cols-12 gap-1.5">
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(e) =>
                    setDraft({ ...draft, preset: 'custom', startDate: e.target.value })
                  }
                  className="col-span-7 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0EA58D]"
                />
                <input
                  type="time"
                  value={draft.startTime}
                  onChange={(e) =>
                    setDraft({ ...draft, preset: 'custom', startTime: e.target.value })
                  }
                  className="col-span-5 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0EA58D]"
                />
              </div>
            </div>

            {/* End Date & Time */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-600 block">
                Sampai (Selesai):
              </label>
              <div className="grid grid-cols-12 gap-1.5">
                <input
                  type="date"
                  value={draft.endDate}
                  onChange={(e) =>
                    setDraft({ ...draft, preset: 'custom', endDate: e.target.value })
                  }
                  className="col-span-7 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0EA58D]"
                />
                <input
                  type="time"
                  value={draft.endTime}
                  onChange={(e) =>
                    setDraft({ ...draft, preset: 'custom', endTime: e.target.value })
                  }
                  className="col-span-5 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0EA58D]"
                />
              </div>
            </div>

            {/* Apply button */}
            <button
              type="button"
              onClick={handleApplyCustom}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5 text-[#D4A843]" />
              <span>Terapkan Filter Tanggal & Jam</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
