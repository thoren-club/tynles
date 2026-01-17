import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconSettings } from '@tabler/icons-react';
import { api } from '../api';
import './Spaces.css';

export default function Spaces() {
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [selectedSpace, setSelectedSpace] = useState<any>(null);
  const [currentSpaceRole, setCurrentSpaceRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [spaceMembers, setSpaceMembers] = useState<any[]>([]);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [levelRewards, setLevelRewards] = useState<Array<{ level: number; text: string }>>([]);
  const [editingRewardLevel, setEditingRewardLevel] = useState<number | null>(null);
  const [editingRewardText, setEditingRewardText] = useState<string>('');
  const [editingMemberRole, setEditingMemberRole] = useState<{ userId: string; role: string } | null>(null);

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    try {
      const data = await api.getSpaces();
      setSpaces(data.spaces || []);
    } catch (error) {
      console.error('Failed to load spaces:', error);
      alert('Failed to load spaces');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) return;

    // Проверка ограничения 3 пространства
    if (spaces.length >= 3) {
      alert('Максимум можно создать 3 пространства');
      return;
    }

    try {
      await api.createSpace(newSpaceName);
      setNewSpaceName('');
      setShowCreate(false);
      loadSpaces();
    } catch (error: any) {
      console.error('Failed to create space:', error);
      alert(error.message || 'Failed to create space');
    }
  };

  const handleSwitchSpace = async (spaceId: string) => {
    try {
      await api.switchSpace(spaceId);
      alert('Пространство переключено!');
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch space:', error);
      alert('Не удалось переключить пространство');
    }
  };

  const handleSettingsClick = async (space: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Загружаем текущее пространство для получения роли пользователя, участников, код приглашения и награды уровней
      const [currentSpaceData, membersData, inviteData, rewardsData, userData] = await Promise.all([
        api.getCurrentSpace().catch(() => null),
        api.getMembers().catch(() => ({ members: [] })),
        api.createInvite('Viewer').catch(() => null), // TODO: правильная роль
        api.getLevelRewards().catch(() => ({ rewards: [] })),
        api.getUser().catch(() => null),
      ]);
      
      setCurrentSpaceRole(currentSpaceData?.role || space.role || '');
      setCurrentUserId(userData?.id?.toString() || '');
      setSpaceMembers(membersData.members || []);
      setInviteCode(inviteData?.code || '');
      setLevelRewards(rewardsData.rewards || []);
      setSelectedSpace(space);
    } catch (error) {
      console.error('Failed to load space settings:', error);
    }
  };

  const closeSpaceSettings = () => {
    setSelectedSpace(null);
    setSpaceMembers([]);
    setInviteCode('');
    setLevelRewards([]);
    setEditingRewardLevel(null);
    setEditingRewardText('');
    setEditingMemberRole(null);
  };

  const isAdmin = currentSpaceRole === 'Admin';

  const handleRewardEdit = (level: number, currentText: string) => {
    setEditingRewardLevel(level);
    setEditingRewardText(currentText || '');
  };

  const handleRewardSave = async () => {
    if (editingRewardLevel === null) return;
    
    try {
      await api.updateLevelReward(editingRewardLevel, editingRewardText);
      // Обновляем локальное состояние
      setLevelRewards(prev => {
        const existing = prev.find(r => r.level === editingRewardLevel);
        if (existing) {
          return prev.map(r => r.level === editingRewardLevel ? { ...r, text: editingRewardText } : r);
        } else {
          return [...prev, { level: editingRewardLevel, text: editingRewardText }].sort((a, b) => a.level - b.level);
        }
      });
      setEditingRewardLevel(null);
      setEditingRewardText('');
    } catch (error: any) {
      console.error('Failed to update reward:', error);
      alert(error.message || 'Не удалось обновить награду');
    }
  };

  const handleMemberRoleEdit = (userId: string, currentRole: string) => {
    setEditingMemberRole({ userId, role: currentRole });
  };

  const handleMemberRoleSave = async () => {
    if (!editingMemberRole) return;
    
    try {
      await api.updateMemberRole(editingMemberRole.userId, editingMemberRole.role as 'Admin' | 'Editor' | 'Viewer');
      // Обновляем локальное состояние
      setSpaceMembers(prev => prev.map(m => 
        m.id === editingMemberRole.userId 
          ? { ...m, role: editingMemberRole.role }
          : m
      ));
      setEditingMemberRole(null);
    } catch (error: any) {
      console.error('Failed to update member role:', error);
      alert(error.message || 'Не удалось изменить роль');
    }
  };

  if (loading) {
    return <div className="spaces">Loading...</div>;
  }

  const canCreateSpace = spaces.length < 3;

  return (
    <>
      <div className="spaces">
        <div className="spaces-header">
          <h1>Spaces</h1>
          {canCreateSpace && (
            <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? 'Отмена' : '+ Создать'}
            </button>
          )}
          {!canCreateSpace && (
            <div className="limit-reached">
              Максимум 3 пространства
            </div>
          )}
        </div>

        {showCreate && (
          <div className="create-space-form">
            <input
              type="text"
              placeholder="Название пространства"
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              className="input"
            />
            <button className="btn-primary" onClick={handleCreateSpace}>
              Создать
            </button>
          </div>
        )}

        <div className="spaces-list">
          {spaces.length === 0 ? (
            <div className="empty-state">Создайте первое пространство</div>
          ) : (
            spaces.map((space) => (
              <div
                key={space.id}
                className={`space-card ${space.isCurrent ? 'active' : ''}`}
                onClick={() => !space.isCurrent && handleSwitchSpace(space.id)}
              >
                <div className="space-content">
                  <div className="space-main">
                    <div className="space-name">{space.name}</div>
                    <div className="space-info">
                      <span className="space-role">{space.role}</span>
                      {space.isCurrent && <span className="current-badge">Текущее</span>}
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

      {/* Шторка настроек пространства */}
      {selectedSpace && (
        <div className="space-settings-overlay" onClick={closeSpaceSettings}>
          <div className="space-settings-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="space-settings">
              {/* Хедер с возможностью свайпа */}
              <div className="space-settings-header">
                <div className="swipe-indicator" />
              </div>

              <h2 className="space-settings-title">{selectedSpace.name}</h2>

              {/* Участники */}
              <div className="settings-section">
                <h3 className="section-title">Участники</h3>
                {spaceMembers.length === 0 ? (
                  <div className="empty-list">Нет участников</div>
                ) : (
                  <div className="members-list">
                    {spaceMembers.map((member: any) => {
                      const isEditing = editingMemberRole?.userId === member.id;
                      const isCurrentUser = member.id === currentUserId;
                      
                      return (
                        <div key={member.id} className="member-item">
                          <div className="member-info">
                            <div className="member-name">
                              {member.firstName || member.username || 'Unknown'}
                              {isCurrentUser && <span className="current-user-badge">Вы</span>}
                            </div>
                            {isEditing && isAdmin && !isCurrentUser ? (
                              <select
                                className="role-select"
                                value={editingMemberRole.role}
                                onChange={(e) => setEditingMemberRole({ ...editingMemberRole, role: e.target.value })}
                                onBlur={handleMemberRoleSave}
                                autoFocus
                              >
                                <option value="Viewer">Viewer</option>
                                <option value="Editor">Editor</option>
                                <option value="Admin">Admin</option>
                              </select>
                            ) : (
                              <div className="member-role">
                                {member.role}
                                {isAdmin && !isCurrentUser && (
                                  <button
                                    className="edit-role-button"
                                    onClick={() => handleMemberRoleEdit(member.id, member.role)}
                                  >
                                    Изменить
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Код приглашения */}
              <div className="settings-section">
                <h3 className="section-title">Код приглашения</h3>
                <div className="invite-code-container">
                  {inviteCode ? (
                    <div className="invite-code">{inviteCode}</div>
                  ) : (
                    <div className="invite-code-placeholder">
                      Нажмите, чтобы создать код
                    </div>
                  )}
                </div>
              </div>

              {/* Награды уровней (только для админа) */}
              {isAdmin && (
                <div className="settings-section">
                  <h3 className="section-title">Награды уровней</h3>
                  <div className="rewards-list">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => {
                      const reward = levelRewards.find(r => r.level === level);
                      const isEditing = editingRewardLevel === level;
                      
                      return (
                        <div key={level} className="reward-item">
                          <div className="reward-level">Уровень {level}</div>
                          {isEditing ? (
                            <div className="reward-edit">
                              <input
                                type="text"
                                className="reward-input"
                                value={editingRewardText}
                                onChange={(e) => setEditingRewardText(e.target.value)}
                                placeholder="Награда за уровень"
                                autoFocus
                              />
                              <button className="save-button" onClick={handleRewardSave}>
                                Сохранить
                              </button>
                              <button 
                                className="cancel-button" 
                                onClick={() => {
                                  setEditingRewardLevel(null);
                                  setEditingRewardText('');
                                }}
                              >
                                Отмена
                              </button>
                            </div>
                          ) : (
                            <div className="reward-content">
                              <div className="reward-text">
                                {reward?.text || 'Нет награды'}
                              </div>
                              <button
                                className="edit-reward-button"
                                onClick={() => handleRewardEdit(level, reward?.text || '')}
                              >
                                {reward ? 'Изменить' : 'Добавить'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
