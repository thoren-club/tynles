import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconLink, IconPlus } from '@tabler/icons-react';
import { api } from '../api';
import { Button } from '../components/ui';
import './SpaceConnection.css';

export default function SpaceConnection() {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-connection">
      <div className="connection-container">
        <div className="connection-icon">🚀</div>
        <h1 className="connection-title">Подключитесь к пространству</h1>
        <p className="connection-description">
          Чтобы начать работу, вам нужно подключиться к пространству или создать новое.
        </p>

        <div className="connection-form">
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
            {error && <div className="error-message">{error}</div>}
          </div>

          <Button
            variant="primary"
            onClick={handleJoin}
            loading={isJoining}
            disabled={!inviteCode.trim() || isJoining}
            fullWidth
          >
            Подключиться
          </Button>
        </div>

        <div className="connection-divider">
          <span>или</span>
        </div>

        <p className="connection-hint">
          Если у вас нет кода приглашения, попросите администратора пространства создать его для вас.
        </p>
      </div>
    </div>
  );
}
