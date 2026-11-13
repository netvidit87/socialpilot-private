import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Calendar,
  Inbox,
  FolderOpen,
  Link2,
  Hash,
  Sparkles,
  Plug,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api } from '../services/api';
import { clsx } from 'clsx';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/reporting', label: 'Reporting', icon: FileText },
  {
    to: '/planner',
    label: 'Planner',
    icon: Calendar,
    children: [
      { to: '/planner', label: 'Create Post' },
      { to: '/planner/calendar', label: 'Calendar' },
      { to: '/planner/scheduled', label: 'Scheduled' },
      { to: '/planner/history', label: 'History' },
    ],
  },
  { to: '/content-library', label: 'Content Library', icon: FolderOpen },
  { to: '/inbox', label: 'Inbox', icon: Inbox },
  { to: '/smart-links', label: 'Smart Links', icon: Link2 },
  { to: '/hashtags', label: 'Hashtag Tracker', icon: Hash },
  { to: '/ai', label: 'AI Assistant', icon: Sparkles },
  { to: '/settings/connections', label: 'Connections', icon: Plug },
  { to: '/brands', label: 'Brands', icon: Building2 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout() {
  const {
    brands,
    currentBrandId,
    setCurrentBrandId,
    sidebarOpen,
    setSidebarOpen,
    setAuth,
  } = useAppStore();
  const navigate = useNavigate();

  const currentBrand = brands.find((b) => b.id === currentBrandId);

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      setAuth(false, false);
      navigate('/login');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-muted">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-surface-border bg-white transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-surface-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            SP
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">SocialPilot</div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-primary">
              Private
            </div>
          </div>
          <button
            className="ml-auto rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )
                  }
                  onClick={() => {
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-surface-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b border-surface-border bg-white px-4 lg:px-6">
          <button
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          {/* Brand selector */}
          <div className="relative">
            <select
              value={currentBrandId || ''}
              onChange={(e) => setCurrentBrandId(e.target.value || null)}
              className="appearance-none rounded-lg border border-surface-border bg-white py-1.5 pl-3 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {brands.length === 0 && <option value="">No brands</option>}
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>

          <div className="relative ml-auto hidden max-w-xs flex-1 sm:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search posts, media, hashtags..."
              className="input pl-9"
            />
          </div>

          <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <Bell size={20} />
          </button>

          <NavLink
            to="/ai"
            className="btn-primary !py-1.5 !px-3 text-xs"
          >
            <Sparkles size={14} />
            AI
          </NavLink>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
