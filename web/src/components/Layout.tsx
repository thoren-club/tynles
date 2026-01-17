import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconDashboard, IconListCheck, IconTrophy, IconFolder } from '@tabler/icons-react';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

// Страницы, где нижний навбар скрыт
const HIDE_NAVBAR_PATHS = [
  '/profile',
  '/settings',
  '/level-progression',
  '/goal',
  '/task',
  '/all-goals',
  '/space-settings',
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const shouldHideNavbar = HIDE_NAVBAR_PATHS.some(path => location.pathname.startsWith(path));

  return (
    <div className="layout">
      <main className={`main-content ${shouldHideNavbar ? 'no-navbar' : ''}`}>{children}</main>
      {!shouldHideNavbar && (
        <nav className="bottom-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            <IconDashboard size={24} className="nav-icon" />
            <span className="nav-label">Dashboard</span>
          </Link>
          <Link to="/deals" className={location.pathname === '/deals' ? 'active' : ''}>
            <IconListCheck size={24} className="nav-icon" />
            <span className="nav-label">Дела</span>
          </Link>
          <Link to="/leaderboard" className={location.pathname === '/leaderboard' ? 'active' : ''}>
            <IconTrophy size={24} className="nav-icon" />
            <span className="nav-label">Лидерборд</span>
          </Link>
          <Link to="/spaces" className={location.pathname === '/spaces' ? 'active' : ''}>
            <IconFolder size={24} className="nav-icon" />
            <span className="nav-label">Spaces</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
