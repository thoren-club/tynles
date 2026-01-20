import { useEffect, useState, useRef } from 'react';
import { IconSettings, IconPlus, IconLink } from '@tabler/icons-react';
import { api } from '../api';
import { Skeleton } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import './Spaces.css';

export default function Spaces() {
  const { tr } = useLanguage();
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [selectedSpace, setSelectedSpace] = useState<any>(null);
  const [currentSpaceRole, setCurrentSpaceRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isSpaceOwner, setIsSpaceOwner] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [spaceMembers, setSpaceMembers] = useState<any[]>([]);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [levelRewards, setLevelRewards] = useState<Array<{ level: number; text: string }>>([]);
  const [editingRewardLevel, setEditingRewardLevel] = useState<number | null>(null);
  const [editingRewardText, setEditingRewardText] = useState<string>('');
  const [editingMemberRole, setEditingMemberRole] = useState<{ userId: string; role: string } | null>(null);
  const [showSpacesDropdown, setShowSpacesDropdown] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
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
      alert(tr('Не удалось загрузить пространства', 'Failed to load spaces'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) return;

    // Проверка ограничения 3 пространства
    if (spaces.length >= 3) {
      alert(tr('Максимум можно создать 3 пространства', 'You can create up to 3 spaces'));
      return;
    }

    try {
      await api.createSpace(newSpaceName);
      setNewSpaceName('');
      setShowCreate(false);
      loadSpaces();
    } catch (error: any) {
      console.error('Failed to create space:', error);
      alert(error.message || tr('Не удалось создать пространство', 'Failed to create space'));
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
      alert(tr('Не удалось переключить пространство', 'Failed to switch space'));
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
      alert(tr('Вы успешно подключились к пространству!', 'You joined the space successfully!'));
      window.location.reload();
    } catch (error: any) {
      console.error('Failed to join space:', error);
      alert(error.message || tr('Не удалось подключиться к пространству', 'Failed to join the space'));
    }
  };

  const handleSettingsClick = async (space: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const spaceId = space.id;
      
      // Загружаем все данные для выбранного пространства параллельно
      const [membersData, userData, spaceInfo, inviteData, rewardsData] = await Promise.all([
        api.getMembers(spaceId).catch(() => ({ members: [] })),
        api.getUser().catch(() => null),
        api.getSpaceInfo(spaceId).catch(() => null),
        api.createInvite('Viewer', spaceId).catch(() => null),
        api.getLevelRewards(spaceId).catch(() => ({ rewards: [] })),
      ]);
      
      // Получаем роль пользователя из информации о пространстве
      const userRole = spaceInfo?.role || (space as any)?.role || '';
      const isOwner = spaceInfo?.isOwner || false;
      
      setCurrentSpaceRole(userRole);
      setCurrentUserId((userData as any)?.id?.toString() || '');
      setIsSpaceOwner(isOwner);
      setSpaceMembers(membersData.members || []);
      setInviteCode(inviteData?.code || '');
      setLevelRewards(rewardsData.rewards || []);
      setSelectedSpace(space);
      setAvatarPreview(space.avatarUrl || null);
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
    setIsSpaceOwner(false);
    setAvatarPreview(null);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSpace) return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(tr('Максимум 5 МБ', 'Max 5 MB'));
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;
      setAvatarPreview(dataUrl);
      setIsUploadingAvatar(true);
      try {
        const result = await api.updateSpaceAvatar(selectedSpace.id, dataUrl);
        setSelectedSpace((prev: any) => ({ ...prev, avatarUrl: result.avatarUrl || dataUrl }));
        await loadSpaces();
      } catch (error) {
        console.error('Failed to upload avatar:', error);
        alert(tr('Не удалось загрузить аватарку', 'Failed to upload avatar'));
        setAvatarPreview(selectedSpace.avatarUrl || null);
      } finally {
        setIsUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteSpace = async () => {
    if (!selectedSpace) return;

    if (!confirm(tr('Вы уверены, что хотите удалить это пространство? Это действие нельзя отменить.', 'Are you sure you want to delete this space? This cannot be undone.'))) {
      return;
    }

    if (!confirm(tr('Все данные пространства (задачи, цели, участники) будут безвозвратно удалены. Продолжить?', 'All space data (tasks, goals, members) will be deleted permanently. Continue?'))) {
      return;
    }

    setIsDeleting(true);
    try {
      // Передаем ID выбранного пространства, а не текущего
      await api.deleteSpace(selectedSpace.id);
      closeSpaceSettings();
      await loadSpaces();
      // Если удалено текущее пространство, переключимся на первое доступное
      const updatedSpaces = await api.getSpaces();
      if (updatedSpaces.spaces.length > 0) {
        await api.switchSpace(updatedSpaces.spaces[0].id);
        window.location.reload();
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Failed to delete space:', error);
      alert(error.message || tr('Не удалось удалить пространство', 'Failed to delete space'));
    } finally {
      setIsDeleting(false);
    }
  };

  const isAdmin = currentSpaceRole === 'Admin';
  const roleLabel = (role: string) => {
    if (role === 'Admin') return tr('Админ', 'Admin');
    if (role === 'Editor') return tr('Редактор', 'Editor');
    if (role === 'Viewer') return tr('Наблюдатель', 'Viewer');
    return role;
  };

  const handleRewardEdit = (level: number, currentText: string) => {
    setEditingRewardLevel(level);
    setEditingRewardText(currentText || '');
  };

  const handleRewardSave = async () => {
    if (editingRewardLevel === null || !selectedSpace) return;
    
    try {
      // Передаем ID выбранного пространства для обновления награды
      await api.updateLevelReward(editingRewardLevel, editingRewardText, selectedSpace.id);
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
      alert(error.message || tr('Не удалось обновить награду', 'Failed to update reward'));
    }
  };

  const handleMemberRoleEdit = (userId: string, currentRole: string) => {
    setEditingMemberRole({ userId, role: currentRole });
  };

  const handleMemberRoleSave = async () => {
    if (!editingMemberRole || !selectedSpace) return;
    
    try {
      // Передаем ID выбранного пространства для изменения роли
      await api.updateMemberRole(
        editingMemberRole.userId, 
        editingMemberRole.role as 'Admin' | 'Editor' | 'Viewer',
        selectedSpace.id
      );
      // Обновляем локальное состояние
      setSpaceMembers(prev => prev.map(m => 
        m.id === editingMemberRole.userId 
          ? { ...m, role: editingMemberRole.role }
          : m
      ));
      setEditingMemberRole(null);
    } catch (error: any) {
      console.error('Failed to update member role:', error);
      alert(error.message || tr('Не удалось изменить роль', 'Failed to update role'));
    }
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
          <h1>{tr('Пространства', 'Spaces')}</h1>
          <div className="spaces-actions" ref={spacesDropdownRef}>
            {(canCreateSpace || true) && (
              <button 
                className="btn-primary spaces-dropdown-button"
                onClick={() => setShowSpacesDropdown(!showSpacesDropdown)}
              >
                <IconPlus size={18} />
                <span>{tr('Действия', 'Actions')}</span>
              </button>
            )}
            {showSpacesDropdown && (
              <div className="spaces-dropdown">
                {canCreateSpace && (
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      setShowCreate(!showCreate);
                      setShowSpacesDropdown(false);
                    }}
                  >
                    <IconPlus size={18} />
                    <span>{tr('Создать пространство', 'Create space')}</span>
                  </button>
                )}
                <button 
                  className="dropdown-item"
                  onClick={() => {
                    setShowJoinForm(!showJoinForm);
                    setShowSpacesDropdown(false);
                  }}
                >
                  <IconLink size={18} />
                  <span>{tr('Подключиться', 'Join')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Форма подключения */}
        {showJoinForm && (
          <div className="join-space-form">
            <input
              type="text"
              placeholder={tr('Код приглашения', 'Invite code')}
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value)}
              className="input"
            />
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => {
                setShowJoinForm(false);
                setInviteCodeInput('');
              }}>
                {tr('Отмена', 'Cancel')}
              </button>
              <button className="btn-primary" onClick={handleJoinSpace}>
                {tr('Подключиться', 'Join')}
              </button>
            </div>
          </div>
        )}

        {showCreate && (
          <div className="create-space-form">
            <input
              type="text"
              placeholder={tr('Название пространства', 'Space name')}
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              className="input"
            />
            <button className="btn-primary" onClick={handleCreateSpace}>
              {tr('Создать', 'Create')}
            </button>
          </div>
        )}

        <div className="spaces-list">
          {spaces.length === 0 ? (
            <div className="empty-state">{tr('Создайте первое пространство', 'Create your first space')}</div>
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

              <div className="settings-section">
                <h3 className="section-title">{tr('Аватар пространства', 'Space avatar')}</h3>
                <div className="space-avatar-editor">
                  <div className="space-avatar-preview">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt={selectedSpace.name} className="space-avatar-preview-image" />
                    ) : (
                      <div className="space-avatar-placeholder">
                        {selectedSpace.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <label className="space-avatar-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                    />
                    {isUploadingAvatar ? tr('Загрузка...', 'Uploading...') : tr('Загрузить', 'Upload')}
                  </label>
                </div>
                <div className="space-avatar-hint">
                  {tr('Максимум 5 МБ. Кадрирование пока фиксированное.', 'Max 5 MB. Cropping is fixed for now.')}
                </div>
              </div>

              {/* Участники */}
              <div className="settings-section">
                <h3 className="section-title">{tr('Участники', 'Members')}</h3>
                {spaceMembers.length === 0 ? (
                  <div className="empty-list">{tr('Нет участников', 'No members')}</div>
                ) : (
                  <div className="members-list">
                    {spaceMembers.map((member: any) => {
                      const isEditing = editingMemberRole?.userId === member.id;
                      const isCurrentUser = member.id === currentUserId;
                      
                      return (
                        <div key={member.id} className="member-item">
                          <div className="member-info">
                            <div className="member-name">
                              {member.firstName || member.username || tr('Неизвестно', 'Unknown')}
                              {isCurrentUser && <span className="current-user-badge">{tr('Вы', 'You')}</span>}
                            </div>
                            {isEditing && isAdmin && !isCurrentUser && editingMemberRole ? (
                              <select
                                className="role-select"
                                value={editingMemberRole.role}
                                onChange={(e) => setEditingMemberRole({ 
                                  userId: editingMemberRole.userId, 
                                  role: e.target.value 
                                })}
                                onBlur={handleMemberRoleSave}
                                autoFocus
                              >
                                <option value="Viewer">{tr('Наблюдатель', 'Viewer')}</option>
                                <option value="Editor">{tr('Редактор', 'Editor')}</option>
                                <option value="Admin">{tr('Админ', 'Admin')}</option>
                              </select>
                            ) : (
                              <div className="member-role">
                                {roleLabel(member.role)}
                                {isAdmin && !isCurrentUser && (
                                  <button
                                    className="edit-role-button"
                                    onClick={() => handleMemberRoleEdit(member.id, member.role)}
                                  >
                                    {tr('Изменить', 'Edit')}
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
                <h3 className="section-title">{tr('Код приглашения', 'Invite code')}</h3>
                <div className="invite-code-container">
                  {inviteCode ? (
                    <div className="invite-code">{inviteCode}</div>
                  ) : (
                    <div className="invite-code-placeholder">
                      {tr('Нажмите, чтобы создать код', 'Click to generate a code')}
                    </div>
                  )}
                </div>
              </div>

              {/* Награды уровней (только для админа) */}
              {isAdmin && (
                <div className="settings-section">
                  <h3 className="section-title">{tr('Награды уровней', 'Level rewards')}</h3>
                  <div className="rewards-list">
                    {Array.from({ length: 80 }, (_, i) => i + 1).map((level) => {
                      const reward = levelRewards.find(r => r.level === level);
                      const isEditing = editingRewardLevel === level;
                      
                      return (
                        <div key={level} className="reward-item">
                          <div className="reward-level">{tr('Уровень', 'Level')} {level}</div>
                          {isEditing ? (
                            <div className="reward-edit">
                              <input
                                type="text"
                                className="reward-input"
                                value={editingRewardText}
                                onChange={(e) => setEditingRewardText(e.target.value)}
                                placeholder={tr('Награда за уровень', 'Reward text')}
                                autoFocus
                              />
                              <button className="save-button" onClick={handleRewardSave}>
                                {tr('Сохранить', 'Save')}
                              </button>
                              <button 
                                className="cancel-button" 
                                onClick={() => {
                                  setEditingRewardLevel(null);
                                  setEditingRewardText('');
                                }}
                              >
                                {tr('Отмена', 'Cancel')}
                              </button>
                            </div>
                          ) : (
                            <div className="reward-content">
                              <div className="reward-text">
                                {reward?.text || tr('Нет награды', 'No reward')}
                              </div>
                              <button
                                className="edit-reward-button"
                                onClick={() => handleRewardEdit(level, reward?.text || '')}
                              >
                                {reward ? tr('Изменить', 'Edit') : tr('Добавить', 'Add')}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Удаление пространства (только для владельца и не персональное) */}
              {isSpaceOwner && selectedSpace.name !== 'Персональный' && selectedSpace.name !== 'Personal' && (
                <div className="settings-section">
                  <h3 className="section-title">{tr('Опасная зона', 'Danger zone')}</h3>
                  <button
                    className="btn-delete-space"
                    onClick={handleDeleteSpace}
                    disabled={isDeleting}
                  >
                    {isDeleting
                      ? tr('Удаление...', 'Deleting...')
                      : tr('Удалить пространство', 'Delete space')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
