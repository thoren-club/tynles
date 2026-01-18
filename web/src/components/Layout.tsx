import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconDashboard, IconListCheck, IconTrophy, IconFolder } from '@tabler/icons-react';
import { useLanguage } from '../contexts/LanguageContext';
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
  const { t } = useLanguage();

  return (
    <div className="layout">
      <main className={`main-content ${shouldHideNavbar ? 'no-navbar' : ''}`}>{children}</main>
      {!shouldHideNavbar && (
        <nav className="bottom-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            <IconDashboard size={24} className="nav-icon" />
            <span className="nav-label">{t('nav.dashboard')}</span>
          </Link>
          <Link to="/deals" className={location.pathname === '/deals' ? 'active' : ''}>
            <IconListCheck size={24} className="nav-icon" />
            <span className="nav-label">{t('nav.deals')}</span>
          </Link>
          <Link to="/leaderboard" className={location.pathname === '/leaderboard' ? 'active' : ''}>
            <IconTrophy size={24} className="nav-icon" />
            <span className="nav-label">{t('nav.leaderboard')}</span>
          </Link>
          <Link to="/spaces" className={location.pathname === '/spaces' ? 'active' : ''}>
            <IconFolder size={24} className="nav-icon" />
            <span className="nav-label">{t('nav.spaces')}</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
