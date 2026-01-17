import { useEffect, useState } from 'react';
import { api } from '../api';
import './Leaderboard.css';

// Названия лиг
const LEAGUE_NAMES = [
  'Бронзовая',
  'Серебряная',
  'Золотая',
  'Сапфировая',
  'Рубиновая',
  'Изумрудная',
  'Аметистовая',
  'Жемчужная',
  'Обсидиановая',
  'Алмазная',
  'Мастер',
  'Легендарная',
];

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState<'global' | 'space'>('global');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<any[]>([]);
  const [spaceLeaderboard, setSpaceLeaderboard] = useState<any[]>([]);
  const [currentSpace, setCurrentSpace] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const loadData = async () => {
    try {
      const [leaderboardData, spaceLeaderboardData, spaceData, userData] = await Promise.all([
        api.getLeaderboard(),
        api.getSpaceLeaderboard().catch(() => ({ leaderboard: [], periodDays: 30 })),
        api.getCurrentSpace().catch(() => null),
        api.getUser().catch(() => null),
      ]);
      
      setGlobalLeaderboard(leaderboardData.leaderboard || []);
      setSpaceLeaderboard(spaceLeaderboardData.leaderboard || []);
      setCurrentSpace(spaceData);
      setCurrentUser(userData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Находим текущего пользователя в лидерборде для определения его лиги
  const getCurrentUserLeague = (): number => {
    if (!globalLeaderboard.length || !currentUser) return 1;
    const currentUserEntry = globalLeaderboard.find((entry: any) => {
      return entry.userId === currentUser.id?.toString();
    });
    return currentUserEntry?.league || 1;
  };
  
  const currentUserLeague = getCurrentUserLeague();

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

      {/* Визуализация лиг (для глобального) */}
      {activeTab === 'global' && (
        <div className="leagues-container">
          <div className="leagues-list">
            {LEAGUE_NAMES.map((leagueName, index) => {
              const leagueNumber = index + 1;
              const isUnlocked = leagueNumber <= currentUserLeague;
              
              return (
                <div 
                  key={leagueNumber}
                  className={`league-badge ${isUnlocked ? 'unlocked' : 'locked'} ${leagueNumber === currentUserLeague ? 'current' : ''}`}
                >
                  <div className="league-number">{leagueNumber}</div>
                  <div className="league-name">{leagueName}</div>
                </div>
              );
            })}
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
              ? `${entry.tasksCompleted30Days} задач`
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
