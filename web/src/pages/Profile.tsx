import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronLeft } from '@tabler/icons-react';
import { api } from '../api';
import { Skeleton, SkeletonValue } from '../components/ui';
import './Profile.css';

export default function Profile() {
  const navigate = useNavigate();
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
      alert(error.message || 'Не удалось обновить имя');
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

  const tgId = user?.tgId || window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'N/A';
  const userRole = user?.role || 'обычный';
  
  // Маппинг ролей для отображения
  const roleDisplayNames: Record<string, string> = {
    'разработчик': 'Разработчик',
    'премиум': 'Премиум',
    'обычный': 'Обычный',
  };
  
  const roleDisplayName = roleDisplayNames[userRole] || userRole;

  return (
    <div className="profile">
      {/* Хедер */}
      <div className="profile-header">
        <IconChevronLeft 
          size={24} 
          className="back-icon"
          onClick={() => navigate('/')}
        />
        <h1 className="profile-title">Профиль</h1>
        <div style={{ width: 24 }} />
      </div>

      {/* Аватарка и имя */}
      <div className="profile-avatar-section">
        <div className="profile-avatar">
          <SkeletonValue loading={!user} width={42} height={42} radius={999}>
            {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
          </SkeletonValue>
        </div>
        <div className="profile-name">
          <SkeletonValue loading={!user} width={160} height={18} radius={10}>
            {user?.firstName || 'Пользователь'}
          </SkeletonValue>
        </div>
      </div>

      {/* Список информации */}
      <div className="profile-info-list">
        <div className="profile-info-item">
          <div className="info-label">Имя</div>
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
                  Сохранить
                </button>
                <button 
                  className="cancel-btn"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedName(user?.firstName || '');
                  }}
                >
                  Отмена
                </button>
              </div>
            ) : (
              <div className="name-display">
                <span>{user?.firstName || 'Не указано'}</span>
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
          <div className="info-label">ID Telegram</div>
          <div className="info-value readonly">{tgId}</div>
        </div>

        <div className="profile-info-item">
          <div className="info-label">Роль</div>
          <div className="info-value readonly">{roleDisplayName}</div>
        </div>
      </div>
    </div>
  );
}
