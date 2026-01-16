import { useEffect, useState } from 'react';
import { api } from '../api';
import './Stats.css';

export default function Stats() {
  const [myStats, setMyStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [myStatsData, leaderboardData] = await Promise.all([
        api.getMyStats(),
        api.getLeaderboard(),
      ]);
      setMyStats(myStatsData);
      setLeaderboard(leaderboardData.leaderboard);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="stats">Loading...</div>;
  }

  return (
    <div className="stats">
      <h1>Statistics</h1>

      <div className="my-stats-section">
        <h2>Your Stats</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{myStats?.level || 1}</div>
            <div className="stat-label">Level</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{myStats?.totalXp || 0}</div>
            <div className="stat-label">Total XP</div>
          </div>
        </div>
      </div>

      <div className="leaderboard-section">
        <h2>Leaderboard</h2>
        <div className="leaderboard">
          {leaderboard.length === 0 ? (
            <div className="empty-state">No leaderboard data yet</div>
          ) : (
            leaderboard.map((entry, index) => (
              <div key={entry.userId} className="leaderboard-item">
                <div className="rank">#{index + 1}</div>
                <div className="user-info">
                  <div className="user-name">
                    {entry.firstName || entry.username || 'Unknown'}
                  </div>
                  <div className="user-stats">
                    Level {entry.level} • {entry.totalXp} XP
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
