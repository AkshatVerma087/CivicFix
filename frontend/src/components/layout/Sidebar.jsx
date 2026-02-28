import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  PlusCircle,
  Bell,
  LogOut,
  Shield,
  Menu,
  X,
  FileText,
  ChevronLeft,
  Users,
  Settings,
  User,
  Map,
  BarChart3,
  Trophy,
  Sun,
  Moon,
  Activity,
} from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ isOpen, onToggle }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const citizenLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/report', icon: PlusCircle, label: 'Report Issue' },
    { to: '/my-posts', icon: FileText, label: 'My Posts' },
    { to: '/map', icon: Map, label: 'Issue Map' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const authorityLinks = [
    { to: '/authority', icon: Shield, label: 'Dashboard' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/analytics', icon: Activity, label: 'Analytics' },
    { to: '/map', icon: Map, label: 'Issue Map' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const links = user?.role === 'admin' ? adminLinks : user?.role === 'authority' ? authorityLinks : citizenLinks;

  return (
    <>
      <button className="sidebar-mobile-toggle" onClick={onToggle}>
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__header">
          <div className="sidebar__logo">
            <div className="sidebar__logo-icon">CS</div>
            <span className="sidebar__logo-text">CivicFix</span>
          </div>
          <button className="sidebar__close-btn" onClick={onToggle}>
            <ChevronLeft size={18} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
              onClick={() => window.innerWidth < 768 && onToggle()}
            >
              <link.icon size={20} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <button className="sidebar__theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <div className="sidebar__user">
            <div className="sidebar__avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.name || 'User'}</span>
              <span className="sidebar__user-role">{user?.role || 'citizen'}</span>
            </div>
          </div>
          <button className="sidebar__logout" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}
    </>
  );
}
