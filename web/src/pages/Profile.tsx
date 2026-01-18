import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronLeft } from '@tabler/icons-react';
import { api } from '../api';
import { Skeleton, SkeletonValue } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import './Profile.css';

export default function Profile() {
  const navigate = useNavigate();
  const { tr, language } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await api.getUser() as any;
      setUser(userData);
      setEditedName((userData?.firstName as string) || '');
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) return;
    
    setSaving(true);
    try {
      const updatedUser = await api.updateUserName(editedName.trim());
      setUser(updatedUser);
      setIsEditing(false);
    } catch (error: any) {
      console.error('Failed to update name:', error);
      alert(error.message || tr('Не удалось обновить имя', 'Failed to update name'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="profile">
        <div className="profile-header">
          <IconChevronLeft size={24} className="back-icon" onClick={() => navigate('/')} />
          <Skeleton width={120} height={26} />
          <div style={{ width: 24 }} />
        </div>

        <div className="profile-avatar-section">
          <Skeleton width={92} height={92} radius={999} />
          <Skeleton width={160} height={18} radius={10} />
        </div>

        <div className="profile-info-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="profile-info-item">
              <Skeleton width={90} height={14} radius={8} />
              <div className="info-value">
                <Skeleton width="70%" height={16} radius={8} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const tgId = user?.tgId || window.Telegram?.WebApp?.initDataUnsafe?.user?.id || tr('нет', 'N/A');
  const userRole = user?.role || 'обычный';
  
  // Маппинг ролей для отображения
  const roleDisplayNames: Record<string, { ru: string; en: string }> = {
    developer: { ru: 'Разработчик', en: 'Developer' },
    'разработчик': { ru: 'Разработчик', en: 'Developer' },
    premium: { ru: 'Премиум', en: 'Premium' },
    'премиум': { ru: 'Премиум', en: 'Premium' },
    regular: { ru: 'Обычный', en: 'Regular' },
    'обычный': { ru: 'Обычный', en: 'Regular' },
  };
  
  const roleDisplayName = (roleDisplayNames[userRole]?.[language] ?? userRole) as string;

  return (
    <div className="profile">
      {/* Хедер */}
      <div className="profile-header">
        <IconChevronLeft 
          size={24} 
          className="back-icon"
          onClick={() => navigate('/')}
        />
        <h1 className="profile-title">{tr('Профиль', 'Profile')}</h1>
        <div style={{ width: 24 }} />
      </div>

      {/* Аватарка и имя */}
      <div className="profile-avatar-section">
        <div className="profile-avatar">
          {user?.photoUrl ? (
            <img 
              src={user.photoUrl} 
              alt={user.firstName || user.username || tr('Пользователь', 'User')}
              className="profile-avatar-image"
              onError={(e) => {
                // Fallback на placeholder если фото не загрузилось
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const placeholder = target.nextElementSibling as HTMLElement;
                if (placeholder) placeholder.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className="profile-avatar-placeholder" 
            style={{ display: user?.photoUrl ? 'none' : 'flex' }}
          >
            {user?.firstName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>
        <div className="profile-name">
          <SkeletonValue loading={!user} width={160} height={18} radius={10}>
            {user?.firstName || user?.username || tr('Пользователь', 'User')}
          </SkeletonValue>
        </div>
      </div>

      {/* Список информации */}
      <div className="profile-info-list">
        <div className="profile-info-item">
          <div className="info-label">{tr('Имя', 'Name')}</div>
          <div className="info-value">
            {isEditing ? (
              <div className="edit-name-container">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="name-input"
                  autoFocus
                />
                <button 
                  className="save-btn"
                  onClick={handleSaveName}
                  disabled={saving}
                >
                  {tr('Сохранить', 'Save')}
                </button>
                <button 
                  className="cancel-btn"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedName(user?.firstName || '');
                  }}
                >
                  {tr('Отмена', 'Cancel')}
                </button>
              </div>
            ) : (
              <div className="name-display">
                <span>{user?.firstName || tr('Не указано', 'Not set')}</span>
                <button 
                  className="edit-btn"
                  onClick={() => setIsEditing(true)}
                >
                  ✏️
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="profile-info-item">
          <div className="info-label">{tr('ID Telegram', 'Telegram ID')}</div>
          <div className="info-value readonly">{tgId}</div>
        </div>

        <div className="profile-info-item">
          <div className="info-label">{tr('Роль', 'Role')}</div>
          <div className="info-value readonly">{roleDisplayName}</div>
        </div>
      </div>
    </div>
  );
}
