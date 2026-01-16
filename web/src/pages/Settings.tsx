import { useEffect, useState } from 'react';
import { api } from '../api';
import './Settings.css';

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await api.getUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
      alert('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSpace = async () => {
    if (!inviteCode.trim()) {
      alert('Please enter an invite code');
      return;
    }

    setJoining(true);
    try {
      const result = await api.useInviteCode(inviteCode.trim().toUpperCase()) as { space: { name: string; role: string } };
      setInviteCode('');
      alert(`Success! You've joined "${result.space.name}" as ${result.space.role}`);
      setTimeout(() => window.location.href = '/spaces', 1000);
    } catch (error: any) {
      console.error('Failed to join space:', error);
      alert(error.message || 'Failed to join space. Please check the invite code.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return <div className="settings">Loading...</div>;
  }

  return (
    <div className="settings">
      <h1>Settings</h1>

      <div className="settings-section">
        <h2>Profile</h2>
        <div className="setting-item">
          <div className="setting-label">Name</div>
          <div className="setting-value">{user?.firstName || 'Not set'}</div>
        </div>
        <div className="setting-item">
          <div className="setting-label">Username</div>
          <div className="setting-value">@{user?.username || 'Not set'}</div>
        </div>
        <div className="setting-item">
          <div className="setting-label">Telegram ID</div>
          <div className="setting-value" style={{ fontFamily: 'monospace' }}>
            {user?.tgId || 'N/A'}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Join Space</h2>
        <div className="invite-form">
          <input
            type="text"
            placeholder="Enter invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            className="input"
          />
          <button 
            className="btn-primary" 
            onClick={handleJoinSpace}
            disabled={joining}
          >
            {joining ? 'Joining...' : 'Join'}
          </button>
        </div>
        <div className="setting-hint">
          You can also use the /invite_use command in the Telegram bot
        </div>
      </div>

      <div className="settings-section">
        <h2>Language</h2>
        <div className="setting-hint">
          Language settings are managed through Telegram bot commands
        </div>
      </div>

      <div className="settings-section">
        <h2>Privacy & Security</h2>
        <div className="setting-hint">
          All data is stored securely and only accessible through authenticated sessions.
        </div>
      </div>
    </div>
  );
}
