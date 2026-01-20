import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconDashboard, IconListCheck, IconTrophy, IconFolder } from '@tabler/icons-react';
import { useLanguage } from '../contexts/LanguageContext';
import { triggerLightHaptic } from '../utils/haptics';
import CreateTaskGoalSheet from './CreateTaskGoalSheet';
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
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [createType, setCreateType] = useState<'task' | 'goal' | null>(null);
  const shouldHideNavbar = HIDE_NAVBAR_PATHS.some(path => location.pathname.startsWith(path));
  const { t, tr } = useLanguage();
  const navItems = ['/', '/deals', '/leaderboard', '/spaces'];
  const activeIndex = Math.max(
    navItems.findIndex((path) => location.pathname === path),
    0,
  );
  const shouldShowCreate = !shouldHideNavbar && createType === null;

  useEffect(() => {
    setShowCreateMenu(false);
  }, [location.pathname]);

  return (
    <div className="layout">
      <main className={`main-content ${shouldHideNavbar ? 'no-navbar' : ''}`}>{children}</main>
      {shouldShowCreate && (
        <button
          className="global-create-fab"
          type="button"
          onClick={() => setShowCreateMenu((prev) => !prev)}
        >
          +
        </button>
      )}
      {showCreateMenu && (
        <div className="global-create-menu-overlay" onClick={() => setShowCreateMenu(false)}>
          <div className="global-create-menu" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="global-create-menu-item"
              onClick={() => {
                setCreateType('goal');
                setShowCreateMenu(false);
              }}
            >
              {tr('Цель', 'Goal')}
            </button>
            <button
              type="button"
              className="global-create-menu-item"
              onClick={() => {
                setCreateType('task');
                setShowCreateMenu(false);
              }}
            >
              {tr('Задача', 'Task')}
            </button>
          </div>
        </div>
      )}
      <CreateTaskGoalSheet
        isOpen={createType !== null}
        createType={createType}
        onClose={() => setCreateType(null)}
        onCreated={() => window.dispatchEvent(new Event('app-data-changed'))}
      />
      {!shouldHideNavbar && (
        <nav
          className="bottom-nav"
          style={{
            ['--active-index' as any]: activeIndex,
            ['--nav-items' as any]: navItems.length,
          }}
        >
          <span className="nav-indicator" aria-hidden="true" />
          <Link
            to="/"
            className={location.pathname === '/' ? 'active' : ''}
            onClick={() => triggerLightHaptic()}
          >
            <IconDashboard size={24} className="nav-icon" />
            <span className="nav-label">{t('nav.dashboard')}</span>
          </Link>
          <Link
            to="/deals"
            className={location.pathname === '/deals' ? 'active' : ''}
            onClick={() => triggerLightHaptic()}
          >
            <IconListCheck size={24} className="nav-icon" />
            <span className="nav-label">{t('nav.deals')}</span>
          </Link>
          <Link
            to="/leaderboard"
            className={location.pathname === '/leaderboard' ? 'active' : ''}
            onClick={() => triggerLightHaptic()}
          >
            <IconTrophy size={24} className="nav-icon" />
            <span className="nav-label">{t('nav.leaderboard')}</span>
          </Link>
          <Link
            to="/spaces"
            className={location.pathname === '/spaces' ? 'active' : ''}
            onClick={() => triggerLightHaptic()}
          >
            <IconFolder size={24} className="nav-icon" />
            <span className="nav-label">{t('nav.spaces')}</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
