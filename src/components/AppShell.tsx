import { Outlet, useLocation, useNavigate } from 'react-router';
import { Home, CalendarDays, Sparkles, User } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatDateCN } from '@/types/models';
import { ThemeToggle } from './ThemeToggle';
import { DateNavigator } from './DateNavigator';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/calendar', label: '日历', icon: CalendarDays },
  { path: '/review', label: '回顾', icon: Sparkles },
  { path: '/settings', label: '我的', icon: User },
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useApp();

  const isHome = location.pathname === '/';
  const showNav = navItems.some((item) => item.path === location.pathname);

  return (
    <div className="mobile-shell">
      {/* Header - only on home */}
      {isHome && (
        <header className="app-header">
          <div className="header-left">
            <span className="header-date">{formatDateCN(state.currentDate)}</span>
          </div>
          <div className="header-right">
            <ThemeToggle />
          </div>
        </header>
      )}

      {/* Date Navigator - only on home */}
      {isHome && <DateNavigator />}

      {/* Main Content */}
      <main className={`app-main ${!showNav ? 'no-nav' : ''}`}>
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      {showNav && (
        <nav className="bottom-nav">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <item.icon className="nav-icon" size={22} />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
