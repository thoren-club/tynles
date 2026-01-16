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
      alert('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    try {
      const data = await api.createInvite(selectedRole);
      setInviteCode(data.code);
    } catch (error: any) {
      console.error('Failed to create invite:', error);
      alert(error.message || 'Failed to create invite. Make sure you are an Admin.');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (error) {
      alert('Failed to copy to clipboard');
    }
  };

  if (loading) {
    return <div className="members">Loading...</div>;
  }

  return (
    <div className="members">
      <div className="members-header">
        <h1>Members</h1>
        <button className="btn-primary" onClick={() => {
          setShowInvite(!showInvite);
          if (showInvite) {
            setInviteCode(null);
          }
        }}>
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
                onClick={() => copyToClipboard(inviteCode)}
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
