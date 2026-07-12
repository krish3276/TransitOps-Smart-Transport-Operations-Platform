import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  Users,
  Navigation,
  Wrench,
  Fuel,
  BarChart2,
  Settings,
  LogOut,
  Bus,
} from 'lucide-react';
import useAuthStore from '../../context/authStore.js';

// Matching mockup sidebar items exactly
const navItems = [
  { to: '/',            label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/vehicles',   label: 'Fleet',           icon: Truck },
  { to: '/drivers',    label: 'Drivers',         icon: Users },
  { to: '/trips',      label: 'Trips',           icon: Navigation },
  { to: '/maintenance',label: 'Maintenance',     icon: Wrench },
  { to: '/fuel',       label: 'Fuel & Expenses', icon: Fuel },
  { to: '/analytics',  label: 'Analytics',       icon: BarChart2 },
  { to: '/settings',   label: 'Settings',        icon: Settings },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get initials for avatar
  const initials = user?.name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <div className="layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Bus size={22} />
          <span>TransitOps</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <p className="user-name">{user?.name || 'User'}</p>
            <p className="user-role">{user?.role || ''}</p>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
