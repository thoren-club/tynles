import { useEffect, useState } from 'react';
import { api } from '../api';
import './Leaderboard.css';

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'global' | 'space'>('global');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<any[]>([]);
  const [spaceLeaderboard, setSpaceLeaderboard] = useState<any[]>([]);
  const [currentSpace, setCurrentSpace] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [leaderboardData, spaceLeaderboardData, spaceData] = await Promise.all([
        api.getLeaderboard(),
        api.getSpaceLeaderboard().catch(() => ({ leaderboard: [], periodDays: 30 })),
        api.getCurrentSpace().catch(() => null),
      ]);
      
      setGlobalLeaderboard(leaderboardData.leaderboard || []);
      setSpaceLeaderboard(spaceLeaderboardData.leaderboard || []);
      setCurrentSpace(spaceData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="leaderboard">Loading...</div>;
  }

  const leaderboard = activeTab === 'global' ? globalLeaderboard : spaceLeaderboard;
  const spaceName = currentSpace?.name || 'Пространство';

  return (
    <div className="leaderboard">
      <h1 className="leaderboard-title">Лидерборд</h1>

      {/* Табы */}
      <div className="leaderboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'global' ? 'active' : ''}`}
          onClick={() => setActiveTab('global')}
        >
          Глобальный
        </button>
        <button 
          className={`tab-button ${activeTab === 'space' ? 'active' : ''}`}
          onClick={() => setActiveTab('space')}
        >
          {spaceName}
        </button>
      </div>

      {/* Информация о лигах (для глобального) */}
      {activeTab === 'global' && (
        <div className="league-info">
          <div className="info-text">
            12 лиг • Система работает как в Duolingo
          </div>
        </div>
      )}

      {/* Информация о пространстве (для таба пространства) */}
      {activeTab === 'space' && (
        <div className="space-info">
          <div className="info-text">
            Количество выполненных задач за 30 дней (скользящее окно)
          </div>
        </div>
      )}

      {/* Список лидерборда */}
      <div className="leaderboard-list">
        {leaderboard.length === 0 ? (
          <div className="empty-state">Нет данных для отображения</div>
        ) : (
          leaderboard.map((entry, index) => {
            const position = entry.position || index + 1;
            const displayStats = activeTab === 'space' && entry.tasksCompleted30Days !== undefined
              ? `${entry.tasksCompleted30Days} задач за 30 дней`
              : `Уровень ${entry.level} • ${entry.totalXp} XP`;
            
            return (
              <div key={entry.userId || index} className="leaderboard-item">
                <div className="rank">#{position}</div>
                <div className="user-info">
                  <div className="user-name">
                    {entry.firstName || entry.username || 'Unknown'}
                  </div>
                  <div className="user-stats">
                    {displayStats}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
