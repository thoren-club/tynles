import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconDashboard, IconListCheck, IconTrophy, IconFolder } from '@tabler/icons-react';
import { useLanguage } from '../contexts/LanguageContext';
import { triggerLightHaptic } from '../utils/haptics';
import { api } from '../api';
import TaskGoalEditorSheet from './TaskGoalEditorSheet';
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
  const [editorType, setEditorType] = useState<'task' | 'goal' | null>(null);
  const [editorId, setEditorId] = useState<string | null>(null);
  const shouldHideNavbar = HIDE_NAVBAR_PATHS.some(path => location.pathname.startsWith(path));
  const { t, tr } = useLanguage();
  const navItems = ['/', '/deals', '/leaderboard', '/spaces'];
  const activeIndex = Math.max(
    navItems.findIndex((path) => location.pathname === path),
    0,
  );
  const shouldShowCreate = !shouldHideNavbar && editorType === null;

  useEffect(() => {
    setShowCreateMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ type: 'task' | 'goal'; id: string }>).detail;
      if (!detail?.type || !detail?.id) return;
      setEditorType(detail.type);
      setEditorId(detail.id);
    };
    window.addEventListener('open-editor', handler as EventListener);
    return () => window.removeEventListener('open-editor', handler as EventListener);
  }, []);

  const handleOpenEditor = (type: 'task' | 'goal', id: string) => {
    setEditorType(type);
    setEditorId(id);
  };

  const handleCreate = async (type: 'task' | 'goal') => {
    try {
      if (type === 'task') {
        const created = await api.createTask({
          title: tr('Задача', 'Task'),
          assigneeScope: 'space',
        });
        handleOpenEditor('task', (created as any).id);
      } else {
        const created = await api.createGoal({
          title: tr('Цель', 'Goal'),
          assigneeScope: 'space',
          targetType: 'unlimited',
        });
        handleOpenEditor('goal', (created as any).id);
      }
    } catch (error) {
      console.error('Failed to create:', error);
    }
  };

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
                setShowCreateMenu(false);
                handleCreate('goal');
              }}
            >
              {tr('Цель', 'Goal')}
            </button>
            <button
              type="button"
              className="global-create-menu-item"
              onClick={() => {
                setShowCreateMenu(false);
                handleCreate('task');
              }}
            >
              {tr('Задача', 'Task')}
            </button>
          </div>
        </div>
      )}
      <TaskGoalEditorSheet
        isOpen={editorType !== null && !!editorId}
        type={editorType}
        entityId={editorId}
        onClose={() => {
          setEditorType(null);
          setEditorId(null);
        }}
        onChanged={() => window.dispatchEvent(new Event('app-data-changed'))}
      />
      {!shouldHideNavbar && (
        <nav className="bottom-nav">
          <div
            className="bottom-nav-inner"
            style={{
              ['--active-index' as any]: activeIndex,
              ['--nav-items' as any]: navItems.length,
            }}
          >
            <span className="nav-indicator" aria-hidden="true" />
            <Link
              to="/"
              className={location.pathname === '/' ? 'active' : ''}
              onClick={() => {
                if (location.pathname !== '/') {
                  triggerLightHaptic();
                }
              }}
            >
              <IconDashboard size={24} className="nav-icon" />
              <span className="nav-label">{t('nav.dashboard')}</span>
            </Link>
            <Link
              to="/deals"
              className={location.pathname === '/deals' ? 'active' : ''}
              onClick={() => {
                if (location.pathname !== '/deals') {
                  triggerLightHaptic();
                }
              }}
            >
              <IconListCheck size={24} className="nav-icon" />
              <span className="nav-label">{t('nav.deals')}</span>
            </Link>
            <Link
              to="/leaderboard"
              className={location.pathname === '/leaderboard' ? 'active' : ''}
              onClick={() => {
                if (location.pathname !== '/leaderboard') {
                  triggerLightHaptic();
                }
              }}
            >
              <IconTrophy size={24} className="nav-icon" />
              <span className="nav-label">{t('nav.leaderboard')}</span>
            </Link>
            <Link
              to="/spaces"
              className={location.pathname === '/spaces' ? 'active' : ''}
              onClick={() => {
                if (location.pathname !== '/spaces') {
                  triggerLightHaptic();
                }
              }}
            >
              <IconFolder size={24} className="nav-icon" />
              <span className="nav-label">{t('nav.spaces')}</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
