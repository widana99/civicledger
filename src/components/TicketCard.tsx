import React from 'react';
import { Link } from 'react-router-dom';
import { Report } from '../types';
import { StatusBadge, CategoryBadge, PriorityBadge } from './Badges';
import { timeAgo, SLA_CONFIG } from '../lib/constants';
import { MapPin, ThumbsUp, ChevronRight, Sparkles, Shield, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TicketCardProps {
  report: Report;
  upvoteCount?: number;
  to?: string;
}

export function TicketCard({ report, upvoteCount, to }: TicketCardProps) {
  const { profile } = useAuth();
  const targetUrl = to || `/reports/${report.id}`;
  const isMine = profile !== null && profile.id === report.reporter_id;
  const sla = SLA_CONFIG[report.category];

  return (
    <Link
      to={targetUrl}
      className={`group block relative rounded-2xl bg-white/85 backdrop-blur-xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_16px_40px_rgba(11,19,43,0.1)] transition-all duration-300 hover:-translate-y-1 overflow-hidden ${
        isMine ? 'border-[#D4A843]/60 ring-1 ring-[#D4A843]/30' : 'border-white/80 hover:border-white'
      }`}
    >
      {/* Specular sheen on top */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />

      <div className="flex flex-col sm:flex-row">
        {/* Ticket Left/Top Header (Stamp area) */}
        <div className={`backdrop-blur-md sm:w-48 p-4 flex flex-col justify-between border-b sm:border-b-0 sm:border-r border-dashed flex-shrink-0 ${
          isMine ? 'bg-amber-500/5 border-[#D4A843]/30' : 'bg-slate-50/80 border-slate-200/80'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-slate-500 font-bold">
                [ TIKET RESMI ]
              </span>
              {report.is_anonymous && (
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white text-[9px] font-bold font-mono flex items-center gap-0.5" title="Laporan Anonim">
                  <Shield className="w-2.5 h-2.5 text-emerald-400" />
                  ANONIM
                </span>
              )}
            </div>
            <div className="text-xs font-mono font-bold text-[#0B132B] bg-white/90 px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-xs inline-block mb-2.5">
              {report.ticket_id}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
              <span>{timeAgo(report.created_at)}</span>
            </div>
          </div>
          <div className="mt-3 sm:mt-0 flex flex-wrap gap-1.5 font-technical">
            <StatusBadge status={report.status} size="xs" />
            <PriorityBadge priority={report.priority} size="xs" />
          </div>
        </div>

        {/* Ticket Main Content */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-2">
                <CategoryBadge category={report.category} />
                {sla && (
                  <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/80 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    SLA: {sla.label}
                  </span>
                )}
              </div>
              {upvoteCount !== undefined && upvoteCount > 0 && (
                <div className="text-xs font-mono font-bold text-[#0B132B] flex items-center gap-1.5 bg-amber-500/10 text-amber-800 px-2.5 py-1 rounded-full border border-amber-500/20">
                  <ThumbsUp className="w-3 h-3 text-amber-600" />
                  <span>{upvoteCount}</span>
                </div>
              )}
            </div>

            <h3 className="font-display font-extrabold text-base text-[#0B132B] group-hover:text-[#0EA58D] transition-colors line-clamp-1 mb-1.5 uppercase tracking-tight">
              {report.title}
            </h3>

            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3 font-normal">
              {report.description}
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 truncate pr-2 font-mono">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-rose-500" />
              <span className="truncate text-slate-600 font-medium">{report.address}</span>
            </div>
            <div className="flex items-center gap-1 text-[#0B132B] font-bold font-technical uppercase tracking-wider flex-shrink-0 group-hover:translate-x-1 transition-transform group-hover:text-[#0EA58D]">
              <span>{isMine ? 'Kelola Tiket' : 'Rincian'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
