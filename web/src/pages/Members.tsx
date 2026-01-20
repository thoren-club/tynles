import { useEffect, useState } from 'react';
import { api } from '../api';
import { Skeleton } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import './Members.css';

export default function Members() {
  const { tr } = useLanguage();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'Admin' | 'Editor' | 'Viewer'>('Editor');
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    if (!showInvite) return;
    handleCreateInvite(false);
  }, [showInvite, selectedRole]);

  const loadMembers = async () => {
    try {
      const data = await api.getMembers();
      setMembers(data.members);
    } catch (error) {
      console.error('Failed to load members:', error);
      alert(tr('Не удалось загрузить участников', 'Failed to load members'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (refresh: boolean = false) => {
    try {
      const data = await api.createInvite(selectedRole, undefined, refresh);
      setInviteCode(data.code);
    } catch (error: any) {
      console.error('Failed to create invite:', error);
      alert(error.message || tr('Не удалось создать приглашение. Убедитесь, что вы Admin.', 'Failed to create invite. Make sure you are an Admin.'));
    }
  };

  const copyToClipboard = async (text: string) => {
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        alert(tr('Скопировано в буфер обмена!', 'Copied to clipboard!'));
        return;
      }
    } catch {
      // fallback below
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) {
        alert(tr('Скопировано в буфер обмена!', 'Copied to clipboard!'));
      } else {
        alert(tr('Не удалось скопировать', 'Failed to copy to clipboard'));
      }
    } catch (error) {
      alert(tr('Не удалось скопировать', 'Failed to copy to clipboard'));
    }
  };

  if (loading) {
    return (
      <div className="members">
        <div className="members-header">
          <Skeleton width={140} height={34} />
          <Skeleton width={110} height={34} radius={10} />
        </div>
        <div className="members-list">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="member-card">
              <div className="member-info">
                <Skeleton width="55%" height={16} radius={8} />
                <Skeleton width={70} height={14} radius={8} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="members">
      <div className="members-header">
        <h1>{tr('Участники', 'Members')}</h1>
        <button className="btn-primary" onClick={() => {
          setShowInvite(!showInvite);
          if (showInvite) {
            setInviteCode(null);
          }
        }}>
          {showInvite ? tr('Отмена', 'Cancel') : tr('+ Пригласить', '+ Invite')}
        </button>
      </div>

      {showInvite && (
        <div className="invite-form">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as any)}
            className="input"
          >
            <option value="Admin">{tr('Админ', 'Admin')}</option>
            <option value="Editor">{tr('Редактор', 'Editor')}</option>
            <option value="Viewer">{tr('Наблюдатель', 'Viewer')}</option>
          </select>
          <button className="btn-primary" onClick={() => handleCreateInvite(false)}>
            {tr('Создать приглашение', 'Create Invite')}
          </button>
          {inviteCode && (
            <div className="invite-code">
              <div className="invite-code-label">{tr('Код приглашения:', 'Invite Code:')}</div>
              <div className="invite-code-value" onClick={() => copyToClipboard(inviteCode)}>
                {inviteCode}
              </div>
              <div className="invite-code-actions">
                <button
                  className="btn-secondary"
                  onClick={() => handleCreateInvite(true)}
                >
                  {tr('Обновить', 'Refresh')}
                </button>
                <button
                  className="btn-copy"
                  onClick={() => copyToClipboard(inviteCode)}
                >
                  {tr('Копировать', 'Copy')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="members-list">
        {members.map((member) => (
          <div key={member.id} className="member-card">
            <div className="member-info">
              <div className="member-name">
                {member.firstName || member.username || tr('Неизвестно', 'Unknown')}
              </div>
              <div className="member-role">{member.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
