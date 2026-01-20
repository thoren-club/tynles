import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { BottomSheet } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import './Spaces.css';

export default function SpaceSettings() {
  const { tr } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [selectedSpace, setSelectedSpace] = useState<any>(null);
  const [currentSpaceRole, setCurrentSpaceRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isSpaceOwner, setIsSpaceOwner] = useState(false);
  const [spaceMembers, setSpaceMembers] = useState<any[]>([]);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [levelRewards, setLevelRewards] = useState<Array<{ level: number; text: string; xpRequired?: number }>>([]);
  const [editingRewardLevel, setEditingRewardLevel] = useState<number | null>(null);
  const [editingRewardText, setEditingRewardText] = useState<string>('');
  const [editingRewardXp, setEditingRewardXp] = useState<string>('');
  const [editingMemberRole, setEditingMemberRole] = useState<{ userId: string; role: string } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [spaceName, setSpaceName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const spacesDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    loadData(id);
  }, [id]);

  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg?.BackButton) return;
    const handleBack = () => navigate(-1);
    try {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
    } catch {
      // no-op
    }
    return () => {
      try {
        tg.BackButton.offClick(handleBack);
        tg.BackButton.hide();
      } catch {
        // no-op
      }
    };
  }, [navigate]);

  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg?.BackButton) return;

    let tracking = false;
    let startX = 0;
    let startY = 0;
    const edgeThreshold = 24;
    const swipeThreshold = 80;
    const maxVerticalDrift = 50;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch || touch.clientX > edgeThreshold) return;
      tracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      const touch = e.touches[0];
      if (!touch) return;
      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);
      if (deltaX > swipeThreshold && deltaY < maxVerticalDrift) {
        tracking = false;
        navigate(-1);
      }
    };

    const handleTouchEnd = () => {
      tracking = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigate]);

  const loadData = async (spaceId: string) => {
    try {
      const [membersData, userData, spaceInfo, inviteData, rewardsData] = await Promise.all([
        api.getMembers(spaceId).catch(() => ({ members: [] })),
        api.getUser().catch(() => null),
        api.getSpaceInfo(spaceId).catch(() => null),
        api.createInvite('Viewer', spaceId).catch(() => null),
        api.getLevelRewards(spaceId).catch(() => ({ rewards: [] })),
      ]);

      const userRole = spaceInfo?.role || '';
      const isOwner = spaceInfo?.isOwner || false;

      setCurrentSpaceRole(userRole);
      setCurrentUserId((userData as any)?.id?.toString() || '');
      setIsSpaceOwner(isOwner);
      setSpaceMembers(membersData.members || []);
      setInviteCode(inviteData?.code || '');
      setLevelRewards(rewardsData.rewards || []);
      setSelectedSpace(spaceInfo || { id: spaceId, name: '' });
      setSpaceName(spaceInfo?.name || '');
      setAvatarPreview(spaceInfo?.avatarUrl || null);
    } catch (error) {
      console.error('Failed to load space settings:', error);
    }
  };

  const handleMemberRoleEdit = (userId: string, role: string) => {
    setEditingMemberRole({ userId, role });
  };

  const handleMemberRoleSave = async () => {
    if (!editingMemberRole || !selectedSpace) return;
    try {
      await api.updateMemberRole(editingMemberRole.userId, editingMemberRole.role as any, selectedSpace.id);
      setEditingMemberRole(null);
      await loadData(selectedSpace.id);
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  };

  const handleRewardEdit = (level: number, currentText: string, xpRequired?: number) => {
    setEditingRewardLevel(level);
    setEditingRewardText(currentText || '');
    setEditingRewardXp(xpRequired ? String(xpRequired) : '');
  };

  const closeRewardSheet = () => {
    setEditingRewardLevel(null);
    setEditingRewardText('');
    setEditingRewardXp('');
  };

  const handleRewardSave = async () => {
    if (editingRewardLevel === null || !selectedSpace) return;
    try {
      const normalizedXp = editingRewardXp ? Number(editingRewardXp) : undefined;
      if (editingRewardXp && (!Number.isFinite(normalizedXp) || normalizedXp <= 0)) {
        alert(tr('Введите корректное значение XP', 'Enter a valid XP value'));
        return;
      }
      await api.updateLevelReward(editingRewardLevel, editingRewardText, normalizedXp, selectedSpace.id);
      closeRewardSheet();
      await loadData(selectedSpace.id);
    } catch (error) {
      console.error('Failed to update reward:', error);
    }
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

  const handleSpaceNameSave = async () => {
    if (!selectedSpace) return;
    const trimmedName = spaceName.trim();
    if (!trimmedName) {
      alert(tr('Название обязательно', 'Name is required'));
      return;
    }
    setIsSavingName(true);
    try {
      const result = await api.updateSpaceName(selectedSpace.id, trimmedName);
      setSelectedSpace((prev: any) => ({ ...prev, name: result.name || trimmedName }));
      setSpaceName(result.name || trimmedName);
    } catch (error: any) {
      console.error('Failed to update space name:', error);
      alert(error.message || tr('Не удалось обновить название', 'Failed to update name'));
    } finally {
      setIsSavingName(false);
    }
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
      await api.deleteSpace(selectedSpace.id);
      navigate('/spaces');
      window.location.reload();
    } catch (error: any) {
      console.error('Failed to delete space:', error);
      alert(error.message || tr('Не удалось удалить пространство', 'Failed to delete space'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLeaveSpace = async () => {
    if (!selectedSpace) return;
    if (!confirm(tr('Покинуть это пространство?', 'Leave this space?'))) {
      return;
    }
    setIsLeaving(true);
    try {
      await api.leaveSpace(selectedSpace.id);
      navigate('/spaces');
      window.location.reload();
    } catch (error: any) {
      console.error('Failed to leave space:', error);
      alert(error.message || tr('Не удалось покинуть пространство', 'Failed to leave space'));
    } finally {
      setIsLeaving(false);
    }
  };

  const isAdmin = currentSpaceRole === 'Admin';
  const roleLabel = (role: string) => {
    if (role === 'Admin') return tr('Админ', 'Admin');
    if (role === 'Editor') return tr('Редактор', 'Editor');
    if (role === 'Viewer') return tr('Наблюдатель', 'Viewer');
    return role;
  };

  if (!selectedSpace) {
    return <div className="space-settings-page">{tr('Загрузка...', 'Loading...')}</div>;
  }

  return (
    <div className="space-settings-page" ref={spacesDropdownRef}>
      <div className="space-settings">
        {isAdmin && (
          <div className="settings-section">
            <h3 className="section-title">{tr('Название пространства', 'Space name')}</h3>
            <div className="space-name-editor">
              <input
                type="text"
                className="space-name-input"
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                disabled={isSavingName}
                placeholder={tr('Название пространства', 'Space name')}
              />
              <button
                className="btn-primary space-name-save"
                onClick={handleSpaceNameSave}
                disabled={isSavingName || !spaceName.trim()}
              >
                {isSavingName ? tr('Сохранение...', 'Saving...') : tr('Сохранить', 'Save')}
              </button>
            </div>
          </div>
        )}
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
              <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={isUploadingAvatar} />
              {isUploadingAvatar ? tr('Загрузка...', 'Uploading...') : tr('Загрузить', 'Upload')}
            </label>
          </div>
          <div className="space-avatar-hint">
            {tr('Максимум 5 МБ. Кадрирование пока фиксированное.', 'Max 5 MB. Cropping is fixed for now.')}
          </div>
        </div>

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
                          onChange={(e) => setEditingMemberRole({ userId: editingMemberRole.userId, role: e.target.value })}
                          onBlur={handleMemberRoleSave}
                          autoFocus
                        >
                          <option value="Viewer">{tr('Наблюдатель', 'Viewer')}</option>
                          <option value="Editor">{tr('Редактор', 'Editor')}</option>
                        </select>
                      ) : (
                        <div className="member-role">
                          {roleLabel(member.role)}
                          {isAdmin && !isCurrentUser && (
                            <button className="edit-role-button" onClick={() => handleMemberRoleEdit(member.id, member.role)}>
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

        <div className="settings-section">
          <h3 className="section-title">{tr('Код приглашения', 'Invite code')}</h3>
          <div className="invite-code-container">
            {inviteCode ? <div className="invite-code">{inviteCode}</div> : (
              <div className="invite-code-placeholder">{tr('Нажмите, чтобы создать код', 'Click to generate a code')}</div>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="settings-section">
            <h3 className="section-title">{tr('Награды уровней', 'Level rewards')}</h3>
            <div className="rewards-list">
              {Array.from({ length: 80 }, (_, i) => i + 1).map((level) => {
                const reward = levelRewards.find((r) => r.level === level);
                const hasReward = Boolean(reward?.text && reward.text.trim());

                return (
                  <div key={level} className="reward-item">
                    <div className="reward-level">{tr('Уровень', 'Level')} {level}</div>
                    <div className="reward-content">
                        <div className="reward-info">
                          <div className="reward-text">{reward?.text || tr('Нет награды', 'No reward')}</div>
                          <div className="reward-xp">
                            {tr('XP', 'XP')}: {reward?.xpRequired ?? '-'}
                          </div>
                        </div>
                        <button
                          className="edit-reward-button"
                          onClick={() => handleRewardEdit(level, reward?.text || '', reward?.xpRequired)}
                        >
                          {hasReward ? tr('Изменить', 'Edit') : tr('Добавить', 'Add')}
                        </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isSpaceOwner && (
          <div className="settings-section">
            <h3 className="section-title">{tr('Покинуть пространство', 'Leave space')}</h3>
            <button className="btn-leave-space" onClick={handleLeaveSpace} disabled={isLeaving}>
              {isLeaving ? tr('Выходим...', 'Leaving...') : tr('Покинуть', 'Leave')}
            </button>
          </div>
        )}

        {isSpaceOwner && selectedSpace.name !== 'Персональный' && selectedSpace.name !== 'Personal' && (
          <div className="settings-section">
            <h3 className="section-title">{tr('Опасная зона', 'Danger zone')}</h3>
            <button className="btn-delete-space" onClick={handleDeleteSpace} disabled={isDeleting}>
              {isDeleting ? tr('Удаление...', 'Deleting...') : tr('Удалить пространство', 'Delete space')}
            </button>
          </div>
        )}
      </div>
      <BottomSheet
        isOpen={editingRewardLevel !== null}
        onClose={closeRewardSheet}
        title={editingRewardLevel !== null ? `${tr('Награда за уровень', 'Level reward')} ${editingRewardLevel}` : undefined}
        showHeader={true}
        showCloseButton={true}
        size="low"
      >
        <div className="reward-sheet-body">
          <input
            type="text"
            className="reward-sheet-input"
            value={editingRewardText}
            onChange={(e) => setEditingRewardText(e.target.value)}
            placeholder={tr('Введите награду', 'Enter reward text')}
            autoFocus
          />
          <input
            type="number"
            className="reward-sheet-input"
            value={editingRewardXp}
            onChange={(e) => setEditingRewardXp(e.target.value)}
            placeholder={tr('XP для уровня', 'XP required for level')}
            min={1}
          />
          <div className="reward-sheet-actions">
            <button className="btn-secondary" onClick={closeRewardSheet}>
              {tr('Отмена', 'Cancel')}
            </button>
            <button className="btn-primary" onClick={handleRewardSave}>
              {tr('Сохранить', 'Save')}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
