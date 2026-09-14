import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './components/AppShell';
import { Role } from './types';
import { Loader2, LogOut, RefreshCw, AlertCircle } from 'lucide-react';

/* ───── Lazy-loaded Pages (Code Splitting) ───── */
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const PublicMapPage = lazy(() => import('./pages/PublicMapPage').then(m => ({ default: m.PublicMapPage })));
const PublicStatsPage = lazy(() => import('./pages/PublicStatsPage').then(m => ({ default: m.PublicStatsPage })));
const PublicReportsPage = lazy(() => import('./pages/PublicReportsPage').then(m => ({ default: m.PublicReportsPage })));
const ReportDetailPage = lazy(() => import('./pages/ReportDetailPage').then(m => ({ default: m.ReportDetailPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));

const CitizenDashboard = lazy(() => import('./pages/masyarakat/CitizenDashboard').then(m => ({ default: m.CitizenDashboard })));
const CreateReportPage = lazy(() => import('./pages/masyarakat/CreateReportPage').then(m => ({ default: m.CreateReportPage })));
const MyReportsPage = lazy(() => import('./pages/masyarakat/MyReportsPage').then(m => ({ default: m.MyReportsPage })));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage').then(m => ({ default: m.AdminReportsPage })));
const AdminReportDetailPage = lazy(() => import('./pages/admin/AdminReportDetailPage').then(m => ({ default: m.AdminReportDetailPage })));
const AdminWilayahPage = lazy(() => import('./pages/admin/AdminWilayahPage').then(m => ({ default: m.AdminWilayahPage })));
const AdminPetugasPage = lazy(() => import('./pages/admin/AdminPetugasPage').then(m => ({ default: m.AdminPetugasPage })));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));

/* ───── Page Loading Fallback ───── */
function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] space-y-3">
      <Loader2 className="w-7 h-7 text-[#D4A843] animate-spin" />
      <p className="text-xs text-slate-400 font-mono">Memuat halaman...</p>
    </div>
  );
}

/* ───── Protected Route with Recovery ───── */
function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { session, profile, loading, signOut } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (loading || (session && !profile && !timedOut)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FA] space-y-4">
        <Loader2 className="w-8 h-8 text-[#D4A843] animate-spin" />
        <p className="text-xs text-slate-500 font-mono">Memuat sesi pengguna...</p>
      </div>
    );
  }

  // If session exists but profile cannot be loaded even after timeout
  if (session && !profile && timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-lg text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-900 text-base">Profil Pengguna Sedang Disinkronkan</h3>
            <p className="text-xs text-slate-500 mt-1">
              Sesi login Anda aktif, namun data profil sedang mengalami sinkronisasi. Anda dapat memuat ulang atau keluar untuk mencoba akun lain.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang</span>
            </button>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 hover:bg-rose-100"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar (Logout)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

/* ───── Default App Redirect ───── */
function DefaultAppRedirect() {
  const { profile, loading } = useAuth();
  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="w-8 h-8 text-[#D4A843] animate-spin" />
      </div>
    );
  }
  if (profile?.role === 'admin') {
    return <Navigate to="/app/admin" replace />;
  }
  if (profile?.role === 'petugas') {
    return <Navigate to="/" replace />;
  }
  return <Navigate to="/app/dashboard" replace />;
}

/* ───── App Routes ───── */
function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="w-8 h-8 text-[#D4A843] animate-spin" />
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={session ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/map" element={<PublicMapPage />} />
        <Route path="/stats" element={<PublicStatsPage />} />
        <Route path="/reports" element={<PublicReportsPage />} />
        <Route path="/reports/:id" element={<ReportDetailPage />} />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DefaultAppRedirect />} />

          {/* Masyarakat routes */}
          <Route
            path="dashboard"
            element={
              <ProtectedRoute roles={['masyarakat']}>
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="my-reports"
            element={
              <ProtectedRoute roles={['masyarakat']}>
                <MyReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="create-report"
            element={
              <ProtectedRoute roles={['masyarakat', 'admin']}>
                <CreateReportPage />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/reports"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/reports/:id"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminReportDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/wilayah"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminWilayahPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/petugas"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminPetugasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/users"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />

          {/* Common authenticated routes */}
          <Route path="stats" element={<PublicStatsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* 404 Page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
