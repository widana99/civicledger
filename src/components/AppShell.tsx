import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './Badges';
import {
  Home, FilePlus2, MapPin, BarChart3, LayoutDashboard, Users, Map,
  ListTodo, User, LogOut, Menu, X, ShieldCheck, ClipboardList,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/app/my-reports', label: 'Laporan Saya', icon: ClipboardList, roles: ['masyarakat', 'admin'] },
  { to: '/app/create-report', label: 'Buat Laporan', icon: FilePlus2, roles: ['masyarakat', 'admin'] },
  { to: '/app/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { to: '/app/admin/reports', label: 'Kelola Laporan', icon: ListTodo, roles: ['admin'] },
  { to: '/app/admin/wilayah', label: 'Wilayah', icon: Map, roles: ['admin'] },
  { to: '/app/admin/petugas', label: 'Kelola Petugas', icon: Users, roles: ['admin'] },
  { to: '/app/tasks', label: 'Tugas Saya', icon: ListTodo, roles: ['petugas'] },
  { to: '/map', label: 'Peta Publik', icon: MapPin, roles: ['masyarakat', 'admin', 'petugas'] },
  { to: '/stats', label: 'Statistik', icon: BarChart3, roles: ['masyarakat', 'admin', 'petugas'] },
  { to: '/app/profile', label: 'Profil', icon: User, roles: ['masyarakat', 'admin', 'petugas'] },
];

export function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!profile) return null;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(profile.role));

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-neutral-200">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-neutral-900 text-lg leading-none">CivicLedger</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Pelaporan Masyarakat</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-neutral-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-neutral-900 truncate">{profile.full_name}</div>
            <RoleBadge role={profile.role} />
          </div>
        </div>
        <button onClick={handleSignOut} className="btn-secondary btn-sm w-full">
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-neutral-200 flex-col fixed inset-y-0 left-0 z-30">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-neutral-900/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-white z-50 lg:hidden animate-slide-down">
            {sidebar}
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-neutral-100">
            <Menu className="w-5 h-5 text-neutral-700" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-neutral-900">CivicLedger</span>
          </Link>
          <Link to="/app/profile" className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-xs">
            {profile.full_name.charAt(0).toUpperCase()}
          </Link>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
