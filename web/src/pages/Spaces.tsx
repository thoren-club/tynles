import { useEffect, useState } from 'react';
import { api } from '../api';
import './Spaces.css';

export default function Spaces() {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    try {
      const data = await api.getSpaces();
      setSpaces(data.spaces);
    } catch (error) {
      console.error('Failed to load spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) return;

    try {
      await api.createSpace(newSpaceName);
      setNewSpaceName('');
      setShowCreate(false);
      loadSpaces();
    } catch (error) {
      console.error('Failed to create space:', error);
      alert('Failed to create space');
    }
  };

  const handleSwitchSpace = async (spaceId: string) => {
    try {
      await api.switchSpace(spaceId);
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch space:', error);
    }
  };

  if (loading) {
    return <div className="spaces">Loading...</div>;
  }

  return (
    <div className="spaces">
      <div className="spaces-header">
        <h1>Spaces</h1>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ Create'}
        </button>
      </div>

      {showCreate && (
        <div className="create-space-form">
          <input
            type="text"
            placeholder="Space name"
            value={newSpaceName}
            onChange={(e) => setNewSpaceName(e.target.value)}
            className="input"
          />
          <button className="btn-primary" onClick={handleCreateSpace}>
            Create
          </button>
        </div>
      )}

      <div className="spaces-list">
        {spaces.map((space) => (
          <div
            key={space.id}
            className={`space-card ${space.isCurrent ? 'active' : ''}`}
            onClick={() => !space.isCurrent && handleSwitchSpace(space.id)}
          >
            <div className="space-name">{space.name}</div>
            <div className="space-info">
              <span className="space-role">{space.role}</span>
              {space.isCurrent && <span className="current-badge">Current</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
