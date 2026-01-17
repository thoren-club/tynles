import { useState } from 'react';
import { IconLink, IconPlus } from '@tabler/icons-react';
import { api } from '../api';
import { Button } from '../components/ui';
import './SpaceConnection.css';

export default function SpaceConnection() {
  const [inviteCode, setInviteCode] = useState('');
  const [newSpaceName, setNewSpaceName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'join' | 'create'>('join');

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError('Введите код приглашения');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      await api.useInviteCode(inviteCode.trim());
      // После успешного подключения перезагружаем страницу
      window.location.href = '/';
    } catch (error: any) {
      console.error('Failed to join space:', error);
      setError(error.message || 'Не удалось подключиться к пространству');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreate = async () => {
    if (!newSpaceName.trim()) {
      setError('Введите название пространства');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await api.createSpace(newSpaceName.trim());
      // После успешного создания перезагружаем страницу
      window.location.href = '/';
    } catch (error: any) {
      console.error('Failed to create space:', error);
      setError(error.message || 'Не удалось создать пространство');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-connection">
      <div className="connection-container">
        <div className="connection-icon">🚀</div>
        <h1 className="connection-title">
          {mode === 'join' ? 'Подключитесь к пространству' : 'Создайте пространство'}
        </h1>
        <p className="connection-description">
          {mode === 'join' 
            ? 'Чтобы начать работу, вам нужно подключиться к пространству или создать новое.'
            : 'Создайте новое пространство для управления задачами и целями вместе с командой.'
          }
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
            Подключиться
          </button>
          <button
            className={`mode-button ${mode === 'create' ? 'active' : ''}`}
            onClick={() => {
              setMode('create');
              setError(null);
            }}
          >
            Создать
          </button>
        </div>

        <div className="connection-form">
          {mode === 'join' ? (
            <>
              <div className="form-group">
                <label className="form-label">Код приглашения</label>
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
                    placeholder="Введите код приглашения"
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
                Подключиться
              </Button>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Название пространства</label>
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
                    placeholder="Введите название пространства"
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
                Создать пространство
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
