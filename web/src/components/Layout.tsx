import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="layout">
      <main className="main-content">{children}</main>
      <nav className="bottom-nav">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </Link>
        <Link to="/spaces" className={location.pathname === '/spaces' ? 'active' : ''}>
          <span className="nav-icon">📁</span>
          <span className="nav-label">Spaces</span>
        </Link>
        <Link to="/tasks" className={location.pathname === '/tasks' ? 'active' : ''}>
          <span className="nav-icon">✅</span>
          <span className="nav-label">Tasks</span>
        </Link>
        <Link to="/goals" className={location.pathname === '/goals' ? 'active' : ''}>
          <span className="nav-icon">🎯</span>
          <span className="nav-label">Goals</span>
        </Link>
        <Link to="/stats" className={location.pathname === '/stats' ? 'active' : ''}>
          <span className="nav-icon">📊</span>
          <span className="nav-label">Stats</span>
        </Link>
      </nav>
    </div>
  );
}
