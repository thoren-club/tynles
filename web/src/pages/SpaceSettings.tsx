import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IconChevronLeft } from '@tabler/icons-react';
import { api } from '../api';
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
  const [levelRewards, setLevelRewards] = useState<Array<{ level: number; text: string }>>([]);
  const [editingRewardLevel, setEditingRewardLevel] = useState<number | null>(null);
  const [editingRewardText, setEditingRewardText] = useState<string>('');
  const [editingMemberRole, setEditingMemberRole] = useState<{ userId: string; role: string } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
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

  const handleRewardEdit = (level: number, currentText: string) => {
    setEditingRewardLevel(level);
    setEditingRewardText(currentText || '');
  };

  const handleRewardSave = async () => {
    if (editingRewardLevel === null || !selectedSpace) return;
    try {
      await api.updateLevelReward(editingRewardLevel, editingRewardText, selectedSpace.id);
      setEditingRewardLevel(null);
      setEditingRewardText('');
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
      <div className="space-settings-header-row">
        <button type="button" className="back-button" onClick={() => navigate('/spaces')}>
          <IconChevronLeft size={20} />
        </button>
        <h2 className="space-settings-title">{selectedSpace.name}</h2>
      </div>

      <div className="space-settings">
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
                        <button className="save-button" onClick={handleRewardSave}>{tr('Сохранить', 'Save')}</button>
                        <button className="cancel-button" onClick={() => {
                          setEditingRewardLevel(null);
                          setEditingRewardText('');
                        }}>{tr('Отмена', 'Cancel')}</button>
                      </div>
                    ) : (
                      <div className="reward-content">
                        <div className="reward-text">{reward?.text || tr('Нет награды', 'No reward')}</div>
                        <button className="edit-reward-button" onClick={() => handleRewardEdit(level, reward?.text || '')}>
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
    </div>
  );
}
