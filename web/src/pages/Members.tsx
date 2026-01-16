import { useEffect, useState } from 'react';
import { api } from '../api';
import './Members.css';

export default function Members() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'Admin' | 'Editor' | 'Viewer'>('Editor');
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const data = await api.getMembers();
      setMembers(data.members);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    try {
      const data = await api.createInvite(selectedRole);
      setInviteCode(data.code);
    } catch (error) {
      console.error('Failed to create invite:', error);
      alert('Failed to create invite. Make sure you are an Admin.');
    }
  };

  if (loading) {
    return <div className="members">Loading...</div>;
  }

  return (
    <div className="members">
      <div className="members-header">
        <h1>Members</h1>
        <button className="btn-primary" onClick={() => setShowInvite(!showInvite)}>
          {showInvite ? 'Cancel' : '+ Invite'}
        </button>
      </div>

      {showInvite && (
        <div className="invite-form">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as any)}
            className="input"
          >
            <option value="Admin">Admin</option>
            <option value="Editor">Editor</option>
            <option value="Viewer">Viewer</option>
          </select>
          <button className="btn-primary" onClick={handleCreateInvite}>
            Create Invite
          </button>
          {inviteCode && (
            <div className="invite-code">
              <div className="invite-code-label">Invite Code:</div>
              <div className="invite-code-value">{inviteCode}</div>
              <button
                className="btn-copy"
                onClick={() => {
                  navigator.clipboard.writeText(inviteCode);
                  alert('Copied to clipboard!');
                }}
              >
                Copy
              </button>
            </div>
          )}
        </div>
      )}

      <div className="members-list">
        {members.map((member) => (
          <div key={member.id} className="member-card">
            <div className="member-info">
              <div className="member-name">
                {member.firstName || member.username || 'Unknown'}
              </div>
              <div className="member-role">{member.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
