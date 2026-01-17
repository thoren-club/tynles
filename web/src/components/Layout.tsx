import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
            <span className="nav-icon">📊</span>
            <span className="nav-label">Dashboard</span>
          </Link>
          <Link to="/deals" className={location.pathname === '/deals' ? 'active' : ''}>
            <span className="nav-icon">📋</span>
            <span className="nav-label">Дела</span>
          </Link>
          <Link to="/leaderboard" className={location.pathname === '/leaderboard' ? 'active' : ''}>
            <span className="nav-icon">🏆</span>
            <span className="nav-label">Лидерборд</span>
          </Link>
          <Link to="/spaces" className={location.pathname === '/spaces' ? 'active' : ''}>
            <span className="nav-icon">📁</span>
            <span className="nav-label">Spaces</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
