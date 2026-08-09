import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { AppShell } from './components/AppShell';
import { CreateReportPage } from './pages/masyarakat/CreateReportPage';
import { MyReportsPage } from './pages/masyarakat/MyReportsPage';
import { ReportDetailPage } from './pages/ReportDetailPage';
import { PublicMapPage } from './pages/PublicMapPage';
import { PublicStatsPage } from './pages/PublicStatsPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminWilayahPage } from './pages/admin/AdminWilayahPage';
import { AdminPetugasPage } from './pages/admin/AdminPetugasPage';
import { PetugasTasksPage } from './pages/petugas/PetugasTasksPage';
import { PetugasTaskDetailPage } from './pages/petugas/PetugasTaskDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { Role } from './types';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
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

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/app" replace /> : <LandingPage />} />
      <Route path="/auth" element={session ? <Navigate to="/app" replace /> : <AuthPage />} />
      <Route path="/map" element={<PublicMapPage />} />
      <Route path="/stats" element={<PublicStatsPage />} />
      <Route path="/reports/:id" element={<ReportDetailPage />} />

      <Route path="/app" element={
        <ProtectedRoute><AppShell /></ProtectedRoute>
      }>
        <Route index element={<Navigate to="/app/my-reports" replace />} />

        {/* Masyarakat routes */}
        <Route path="my-reports" element={<MyReportsPage />} />
        <Route path="create-report" element={
          <ProtectedRoute roles={['masyarakat', 'admin']}><CreateReportPage /></ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="admin" element={
          <ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="admin/reports" element={
          <ProtectedRoute roles={['admin']}><AdminReportsPage /></ProtectedRoute>
        } />
        <Route path="admin/wilayah" element={
          <ProtectedRoute roles={['admin']}><AdminWilayahPage /></ProtectedRoute>
        } />
        <Route path="admin/petugas" element={
          <ProtectedRoute roles={['admin']}><AdminPetugasPage /></ProtectedRoute>
        } />

        {/* Petugas routes */}
        <Route path="tasks" element={
          <ProtectedRoute roles={['petugas']}><PetugasTasksPage /></ProtectedRoute>
        } />
        <Route path="tasks/:id" element={
          <ProtectedRoute roles={['petugas']}><PetugasTaskDetailPage /></ProtectedRoute>
        } />

        {/* Common */}
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
