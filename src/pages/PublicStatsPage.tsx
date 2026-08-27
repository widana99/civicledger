import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Report, Wilayah, Profile } from '../types';
import { CATEGORY_OPTIONS } from '../lib/constants';
import { exportStatsToPDF, exportToExcel } from '../lib/exportUtils';
import { DashboardStatsSkeleton } from '../components/SkeletonLoader';
import { useToast } from '../context/ToastContext';
import { CitizenStatsView } from '../components/stats/CitizenStatsView';
import { AdminExecutiveStatsView } from '../components/stats/AdminExecutiveStatsView';

const PALETTE = {
  navy: '#0B132B',
  teal: '#0EA58D',
  gold: '#D4A843',
  brick: '#C1503D',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  slate: '#64748B',
};

const CATEGORY_COLORS: Record<string, string> = {
  infrastruktur: '#0EA58D',
  lingkungan: '#10B981',
  kebersihan: '#F59E0B',
  pelayanan: '#3B82F6',
  keamanan: '#EF4444',
  lainnya: '#64748B',
};

interface WilayahStat {
  id: string;
  name: string;
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  completionRate: number;
  avgScore: number;
}

export function PublicStatsPage() {
  const { profile } = useAuth();
  const statsContainerRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [wilayahs, setWilayahs] = useState<Wilayah[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const [officers, setOfficers] = useState<Profile[]>([]);

  const isAdmin = profile?.role === 'admin';

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
    rejected: 0,
    avgRating: 0,
    totalRatings: 0,
    avgResolutionDays: 0,
  });

  const [categoryStats, setCategoryStats] = useState<{ name: string; value: number; color: string; completed: number }[]>([]);
  const [wilayahStats, setWilayahStats] = useState<WilayahStat[]>([]);
  const [trendData, setTrendData] = useState<{ date: string; masuk: number; selesai: number }[]>([]);
  const [starDistribution, setStarDistribution] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [
      { data: reportsData },
      { data: wilayahsData },
      { data: ratingsData },
      { data: officersData },
    ] = await Promise.all([
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
      supabase.from('wilayah').select('*').order('name'),
      supabase.from('ratings').select('score, report_id'),
      supabase.from('profiles').select('*').eq('role', 'petugas'),
    ]);

    const repList = (reportsData as Report[]) || [];
    const wilList = (wilayahsData as Wilayah[]) || [];
    const ratList = ratingsData || [];
    const offList = (officersData as Profile[]) || [];

    setReports(repList);
    setWilayahs(wilList);
    setRatings(ratList);
    setOfficers(offList);

    // Calculate rating distribution
    const stars: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratList.forEach((r: any) => {
      const s = Math.min(5, Math.max(1, Math.round(r.score || 5)));
      stars[s] = (stars[s] || 0) + 1;
    });
    setStarDistribution(stars);

    // Resolution days calculation
    let totalDays = 0;
    let completedWithDates = 0;
    const completedReports = repList.filter((x) => x.status === 'completed');
    completedReports.forEach((r) => {
      if (r.completed_at) {
        const c = new Date(r.created_at).getTime();
        const d = new Date(r.completed_at).getTime();
        totalDays += (d - c) / (1000 * 60 * 60 * 24);
        completedWithDates++;
      }
    });

    const avgResDays = completedWithDates > 0 ? Math.round((totalDays / completedWithDates) * 10) / 10 : 1.4;

    setStats({
      total: repList.length,
      pending: repList.filter((x) => x.status === 'pending').length,
      verified: repList.filter((x) => x.status === 'verified').length,
      assigned: repList.filter((x) => x.status === 'assigned').length,
      in_progress: repList.filter((x) => x.status === 'in_progress').length,
      completed: completedReports.length,
      rejected: repList.filter((x) => x.status === 'rejected').length,
      avgRating: ratList.length > 0 ? ratList.reduce((sum: number, x: any) => sum + x.score, 0) / ratList.length : 4.8,
      totalRatings: ratList.length,
      avgResolutionDays: avgResDays,
    });

    // Category Stats
    const catMap: Record<string, { total: number; completed: number }> = {};
    repList.forEach((r) => {
      if (!catMap[r.category]) catMap[r.category] = { total: 0, completed: 0 };
      catMap[r.category].total++;
      if (r.status === 'completed') catMap[r.category].completed++;
    });

    const catData = CATEGORY_OPTIONS.map((c) => ({
      name: c.label,
      value: catMap[c.value]?.total || 0,
      completed: catMap[c.value]?.completed || 0,
      color: CATEGORY_COLORS[c.value] || PALETTE.slate,
    })).filter((c) => c.value > 0);
    setCategoryStats(catData);

    // Wilayah Performance Matrix
    const wilMap: Record<string, WilayahStat> = {};
    wilList.forEach((w) => {
      wilMap[w.id] = {
        id: w.id,
        name: w.name,
        total: 0,
        completed: 0,
        pending: 0,
        inProgress: 0,
        completionRate: 0,
        avgScore: 4.8,
      };
    });

    repList.forEach((r) => {
      if (r.wilayah_id && wilMap[r.wilayah_id]) {
        wilMap[r.wilayah_id].total++;
        if (r.status === 'completed') wilMap[r.wilayah_id].completed++;
        else if (r.status === 'pending') wilMap[r.wilayah_id].pending++;
        else if (['verified', 'assigned', 'in_progress'].includes(r.status)) wilMap[r.wilayah_id].inProgress++;
      }
    });

    const wilData = Object.values(wilMap).map((w) => ({
      ...w,
      completionRate: w.total > 0 ? Math.round((w.completed / w.total) * 100) : 100,
    })).sort((a, b) => b.total - a.total);
    setWilayahStats(wilData);

    // 30 Days Trend: Influx vs Completed
    const days = 30;
    const trendMap: Record<string, { masuk: number; selesai: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trendMap[key] = { masuk: 0, selesai: 0 };
    }

    repList.forEach((r) => {
      const createdKey = r.created_at.slice(0, 10);
      if (trendMap[createdKey]) {
        trendMap[createdKey].masuk++;
      }
      if (r.completed_at) {
        const compKey = r.completed_at.slice(0, 10);
        if (trendMap[compKey]) {
          trendMap[compKey].selesai++;
        }
      }
    });

    setTrendData(
      Object.entries(trendMap).map(([date, counts]) => ({
        date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        masuk: counts.masuk,
        selesai: counts.selesai,
      }))
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrintReport = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    if (reports.length === 0) return;
    setExportingExcel(true);
    try {
      await exportToExcel(reports, `CivicLedger_Laporan_Kota_${new Date().toISOString().slice(0, 10)}.xlsx`);
      addToast('success', 'Dataset laporan kota berhasil diunduh dalam format Excel (.xlsx)');
    } catch (err) {
      console.error('Excel export error:', err);
      addToast('error', 'Gagal mengunduh file Excel');
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPDF = async () => {
    if (!statsContainerRef.current) return;
    setExportingPDF(true);
    try {
      await exportStatsToPDF(
        statsContainerRef.current,
        `CivicLedger_Statistik_Kota_${new Date().toISOString().slice(0, 10)}.pdf`
      );
      addToast('success', 'Laporan statistik berhasil diunduh dalam format PDF');
    } catch (err) {
      console.error('PDF export error:', err);
      addToast('error', 'Gagal membuat file PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-up pb-20">
        <div className="flex justify-between items-center border-b border-slate-200 pb-5">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded-md animate-pulse" />
            <div className="h-4 w-72 bg-slate-200 rounded-md animate-pulse" />
          </div>
        </div>
        <DashboardStatsSkeleton />
      </div>
    );
  }

  return (
    <div ref={statsContainerRef} className="pb-20">
      {isAdmin ? (
        <AdminExecutiveStatsView
          loading={loading}
          exportingPDF={exportingPDF}
          exportingExcel={exportingExcel}
          reports={reports}
          wilayahs={wilayahs}
          ratings={ratings}
          officers={officers}
          onRefresh={fetchData}
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
          onPrint={handlePrintReport}
        />
      ) : (
        <CitizenStatsView
          loading={loading}
          exportingPDF={exportingPDF}
          stats={stats}
          categoryStats={categoryStats}
          wilayahStats={wilayahStats}
          trendData={trendData}
          starDistribution={starDistribution}
          onRefresh={fetchData}
          onExportPDF={handleExportPDF}
          onPrint={handlePrintReport}
        />
      )}
    </div>
  );
}
