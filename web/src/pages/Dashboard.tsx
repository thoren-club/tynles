import { useEffect, useState } from 'react';
import { api } from '../api';
import './Dashboard.css';

export default function Dashboard() {
  const [space, setSpace] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [spaceData, statsData] = await Promise.all([
        api.getCurrentSpace(),
        api.getMyStats(),
      ]);
      setSpace(spaceData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard">Loading...</div>;
  }

  if (!space) {
    return (
      <div className="dashboard">
        <h1>Welcome!</h1>
        <p>Create your first space to get started.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="space-header">
        <h1>{space.name}</h1>
        <div className="space-role">Role: {space.role}</div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.level || 1}</div>
          <div className="stat-label">Level</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.totalXp || 0}</div>
          <div className="stat-label">XP</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.completedTasks || 0}</div>
          <div className="stat-label">Completed Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.completedGoals || 0}</div>
          <div className="stat-label">Completed Goals</div>
        </div>
      </div>
    </div>
  );
}
