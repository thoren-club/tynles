import { useState } from 'react';
import { IconLink, IconPlus } from '@tabler/icons-react';
import { api } from '../api';
import { Button } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import './SpaceConnection.css';

export default function SpaceConnection() {
  const { tr } = useLanguage();
  const [inviteCode, setInviteCode] = useState('');
  const [newSpaceName, setNewSpaceName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'join' | 'create'>('join');

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError(tr('Введите код приглашения', 'Enter invite code'));
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      await api.useInviteCode(inviteCode.trim());
      window.dispatchEvent(new Event('space:changed'));
    } catch (error: any) {
      console.error('Failed to join space:', error);
      setError(error.message || tr('Не удалось подключиться к пространству', 'Failed to join the space'));
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreate = async () => {
    if (!newSpaceName.trim()) {
      setError(tr('Введите название пространства', 'Enter space name'));
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await api.createSpace(newSpaceName.trim());
      window.dispatchEvent(new Event('space:changed'));
    } catch (error: any) {
      console.error('Failed to create space:', error);
      setError(error.message || tr('Не удалось создать пространство', 'Failed to create space'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-connection">
      <div className="connection-container">
        <div className="connection-icon">🚀</div>
        <h1 className="connection-title">
          {mode === 'join'
            ? tr('Подключитесь к пространству', 'Join a space')
            : tr('Создайте пространство', 'Create a space')}
        </h1>
        <p className="connection-description">
          {mode === 'join'
            ? tr(
                'Чтобы начать работу, вам нужно подключиться к пространству или создать новое.',
                'To get started, join a space or create a new one.',
              )
            : tr(
                'Создайте новое пространство для управления задачами и целями вместе с командой.',
                'Create a new space to manage tasks and goals with your team.',
              )}
        </p>

        {/* Переключатель режима */}
        <div className="mode-switcher">
          <button
            className={`mode-button ${mode === 'join' ? 'active' : ''}`}
            onClick={() => {
              setMode('join');
              setError(null);
            }}
          >
            {tr('Подключиться', 'Join')}
          </button>
          <button
            className={`mode-button ${mode === 'create' ? 'active' : ''}`}
            onClick={() => {
              setMode('create');
              setError(null);
            }}
          >
            {tr('Создать', 'Create')}
          </button>
        </div>

        <div className="connection-form">
          {mode === 'join' ? (
            <>
              <div className="form-group">
                <label className="form-label">{tr('Код приглашения', 'Invite code')}</label>
                <div className="input-wrapper">
                  <IconLink size={20} className="input-icon" />
                  <input
                    type="text"
                    className="form-input"
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value);
                      setError(null);
                    }}
                    placeholder={tr('Введите код приглашения', 'Enter invite code')}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleJoin();
                      }
                    }}
                  />
                </div>
              </div>
              {error && <div className="error-message">{error}</div>}
              <Button
                variant="primary"
                onClick={handleJoin}
                loading={isJoining}
                disabled={!inviteCode.trim() || isJoining}
                fullWidth
              >
                {tr('Подключиться', 'Join')}
              </Button>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">{tr('Название пространства', 'Space name')}</label>
                <div className="input-wrapper">
                  <IconPlus size={20} className="input-icon" />
                  <input
                    type="text"
                    className="form-input"
                    value={newSpaceName}
                    onChange={(e) => {
                      setNewSpaceName(e.target.value);
                      setError(null);
                    }}
                    placeholder={tr('Введите название пространства', 'Enter space name')}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCreate();
                      }
                    }}
                  />
                </div>
              </div>
              {error && <div className="error-message">{error}</div>}
              <Button
                variant="primary"
                onClick={handleCreate}
                loading={isCreating}
                disabled={!newSpaceName.trim() || isCreating}
                fullWidth
              >
                {tr('Создать пространство', 'Create space')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
