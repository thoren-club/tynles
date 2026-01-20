import { useEffect, useState, useRef } from 'react';
import { IconSettings, IconPlus, IconLink } from '@tabler/icons-react';
import { api } from '../api';
import { BottomSheet, Skeleton, Button } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { triggerLightHaptic } from '../utils/haptics';
import './Spaces.css';

export default function Spaces() {
  const { tr } = useLanguage();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [showSpacesDropdown, setShowSpacesDropdown] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const spacesDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSpaces();
    
    // Закрытие dropdown при клике вне его
    const handleClickOutside = (e: MouseEvent) => {
      if (spacesDropdownRef.current && !spacesDropdownRef.current.contains(e.target as Node)) {
        setShowSpacesDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadSpaces = async () => {
    try {
      const data = await api.getSpaces();
      setSpaces(data.spaces || []);
    } catch (error) {
      console.error('Failed to load spaces:', error);
      alert(tr('Не удалось загрузить дома', 'Failed to load homes'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) return;

    // Проверка ограничения 3 дома
    if (spaces.length >= 3) {
      alert(tr('Максимум можно создать 3 дома', 'You can create up to 3 homes'));
      return;
    }

    try {
      await api.createSpace(newSpaceName);
      setNewSpaceName('');
      setShowCreate(false);
      loadSpaces();
    } catch (error: any) {
      console.error('Failed to create space:', error);
      alert(error.message || tr('Не удалось создать дом', 'Failed to create home'));
    }
  };

  const handleSwitchSpace = async (spaceId: string) => {
    try {
      await api.switchSpace(spaceId);
      // Автоматически перезагружаем список пространств
      await loadSpaces();
      // Перезагружаем страницу для применения изменений
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch space:', error);
      alert(tr('Не удалось переключить дом', 'Failed to switch home'));
    }
  };
  
  const handleJoinSpace = async () => {
    if (!inviteCodeInput.trim()) {
      alert(tr('Введите код приглашения', 'Enter invite code'));
      return;
    }
    
    try {
      await api.useInviteCode(inviteCodeInput.trim());
      setInviteCodeInput('');
      setShowJoinForm(false);
      setShowSpacesDropdown(false);
      await loadSpaces();
      alert(tr('Вы успешно подключились к дому!', 'You joined the home successfully!'));
      window.location.reload();
    } catch (error: any) {
      console.error('Failed to join space:', error);
      alert(error.message || tr('Не удалось подключиться к дому', 'Failed to join the home'));
    }
  };

  const closeJoinSheet = () => {
    setShowJoinForm(false);
    setInviteCodeInput('');
  };

  const closeCreateSheet = () => {
    setShowCreate(false);
    setNewSpaceName('');
  };

  const handleSettingsClick = (space: any, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/space-settings/${space.id}`);
  };

  const roleLabel = (role: string) => {
    if (role === 'Admin') return tr('Админ', 'Admin');
    if (role === 'Editor') return tr('Редактор', 'Editor');
    if (role === 'Viewer') return tr('Наблюдатель', 'Viewer');
    return role;
  };

  if (loading) {
    return (
      <div className="spaces">
        <div className="spaces-header">
          <Skeleton width={120} height={34} />
          <Skeleton width={120} height={36} radius={12} />
        </div>
        <div className="spaces-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-card">
              <div className="space-content">
                <div className="space-main">
                  <Skeleton width="55%" height={18} radius={8} />
                  <div className="space-info">
                    <Skeleton width={70} height={14} radius={999} />
                    <Skeleton width={60} height={14} radius={999} />
                  </div>
                </div>
                <div className="space-settings-icon">
                  <Skeleton width={24} height={24} radius={8} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const canCreateSpace = spaces.length < 3;

  return (
    <>
      <div className="spaces">
        <div className="spaces-header">
          <h1>{tr('Дома', 'Homes')}</h1>
          <div className="spaces-actions" ref={spacesDropdownRef}>
            {(canCreateSpace || true) && (
              <button 
                className="btn-primary spaces-dropdown-button"
                onClick={() => {
                  triggerLightHaptic();
                  setShowSpacesDropdown(!showSpacesDropdown);
                }}
              >
                <IconPlus size={18} />
                <span>{tr('Действия', 'Actions')}</span>
              </button>
            )}
          </div>
        </div>
        {showSpacesDropdown && (
          <div
            className="spaces-dropdown-overlay"
            onClick={() => {
              triggerLightHaptic();
              setShowSpacesDropdown(false);
            }}
          >
            <div className="spaces-dropdown" onClick={(e) => e.stopPropagation()}>
              {canCreateSpace && (
                <button 
                  className="dropdown-item"
                  onClick={() => {
                    triggerLightHaptic();
                    setShowCreate(!showCreate);
                    setShowSpacesDropdown(false);
                  }}
                >
                  <IconPlus size={18} />
                  <span>{tr('Создать дом', 'Create home')}</span>
                </button>
              )}
              <button 
                className="dropdown-item"
                onClick={() => {
                  triggerLightHaptic();
                  setShowJoinForm(!showJoinForm);
                  setShowSpacesDropdown(false);
                }}
              >
                <IconLink size={18} />
                <span>{tr('Подключиться', 'Join')}</span>
              </button>
            </div>
          </div>
        )}
        
        <BottomSheet
          isOpen={showJoinForm}
          onClose={closeJoinSheet}
          title={tr('Подключиться к дому', 'Join a home')}
          showHeader={true}
          showCloseButton={true}
          size="medium"
        >
          <div className="space-action-sheet">
            <input
              type="text"
              placeholder={tr('Код приглашения', 'Invite code')}
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value)}
              className="input"
            />
            <div className="space-action-actions">
              <Button variant="secondary" onClick={closeJoinSheet} fullWidth>
                {tr('Отмена', 'Cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleJoinSpace}
                disabled={!inviteCodeInput.trim()}
                fullWidth
              >
                {tr('Подключиться', 'Join')}
              </Button>
            </div>
          </div>
        </BottomSheet>

        <BottomSheet
          isOpen={showCreate}
          onClose={closeCreateSheet}
          title={tr('Создать дом', 'Create home')}
          showHeader={true}
          showCloseButton={true}
          size="medium"
        >
          <div className="space-action-sheet">
            <input
              type="text"
              placeholder={tr('Название дома', 'Home name')}
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              className="input"
            />
            <div className="space-action-actions">
              <Button variant="secondary" onClick={closeCreateSheet} fullWidth>
                {tr('Отмена', 'Cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateSpace}
                disabled={!newSpaceName.trim()}
                fullWidth
              >
                {tr('Создать', 'Create')}
              </Button>
            </div>
          </div>
        </BottomSheet>

        <div className="spaces-list">
          {spaces.length === 0 ? (
            <div className="empty-state">{tr('Создайте первый дом', 'Create your first home')}</div>
          ) : (
            spaces.map((space) => (
              <div
                key={space.id}
                className={`space-card ${space.isCurrent ? 'active' : ''}`}
                onClick={() => !space.isCurrent && handleSwitchSpace(space.id)}
              >
                <div className="space-content">
                  <div className="space-avatar">
                    {space.avatarUrl ? (
                      <img src={space.avatarUrl} alt={space.name} className="space-avatar-image" />
                    ) : (
                      <div className="space-avatar-placeholder">
                        {space.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="space-main">
                    <div className="space-name">{space.name}</div>
                    <div className="space-info">
                      <span className="space-role">{roleLabel(space.role)}</span>
                      {space.isCurrent && <span className="current-badge">{tr('Текущее', 'Current')}</span>}
                    </div>
                  </div>
                  <div 
                    className="space-settings-icon"
                    onClick={(e) => handleSettingsClick(space, e)}
                  >
                    <IconSettings size={20} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </>
  );
}
