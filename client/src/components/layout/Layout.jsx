import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Users, Map, Navigation, Wrench, LogOut, Bus,
} from 'lucide-react';
import useAuthStore from '../../context/authStore.js';

const navItems = [
  { to: '/',            label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/vehicles',    label: 'Vehicles',    icon: Truck },
  { to: '/drivers',     label: 'Drivers',     icon: Users },
  { to: '/routes',      label: 'Routes',      icon: Map },
  { to: '/trips',       label: 'Trips',       icon: Navigation },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Bus size={28} />
          <span>TransitOps</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <p className="user-name">{user?.name}</p>
              <p className="user-role">{user?.role}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
