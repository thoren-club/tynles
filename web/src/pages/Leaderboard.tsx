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
  const [currentPage, setCurrentPage] = useState(1);
  const [globalPagination, setGlobalPagination] = useState<any>(null);
  const [periodInfo, setPeriodInfo] = useState<{ daysRemaining: number; endDate: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'global') {
      loadGlobalLeaderboard(currentPage);
    }
  }, [activeTab, currentPage]);

  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const loadData = async () => {
    try {
      const [spaceLeaderboardData, spaceData, userData] = await Promise.all([
        api.getSpaceLeaderboard().catch(() => ({ leaderboard: [], periodDays: 30 })),
        api.getCurrentSpace().catch(() => null),
        api.getUser().catch(() => null),
      ]);
      
      setSpaceLeaderboard(spaceLeaderboardData.leaderboard || []);
      setCurrentSpace(spaceData);
      setCurrentUser(userData);
      
      // Загружаем глобальный лидерборд
      if (activeTab === 'global') {
        await loadGlobalLeaderboard(1);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalLeaderboard = async (page: number) => {
    try {
      const data = await api.getGlobalLeaderboard(page);
      setGlobalLeaderboard(data.leaderboard || []);
      setGlobalPagination(data.pagination || null);
      setPeriodInfo({
        daysRemaining: data.periodDaysRemaining || 0,
        endDate: data.periodEndDate || '',
      });
    } catch (error) {
      console.error('Failed to load global leaderboard:', error);
    }
  };

  // Форматируем время до конца раунда
  const formatTimeUntilPeriodEnd = (): string => {
    if (!periodInfo) return '';
    
    const days = periodInfo.daysRemaining;
    if (days <= 0) return 'Раунд завершен';
    if (days === 1) return 'Остался 1 день';
    if (days < 5) return `Осталось ${days} дня`;
    return `Осталось ${days} дней`;
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

      {/* Визуализация лиг и информация о раунде (для глобального) */}
      {activeTab === 'global' && (
        <>
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

          {/* Информация о текущем раунде */}
          {periodInfo && (
            <div className="period-info">
              <div className="period-text">
                {formatTimeUntilPeriodEnd()}
              </div>
              {periodInfo.endDate && (
                <div className="period-date">
                  Раунд закончится: {new Date(periodInfo.endDate).toLocaleDateString('ru-RU', { 
                    day: 'numeric', 
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Список лидерборда */}
      <div className="leaderboard-list">
        {leaderboard.length === 0 ? (
          <div className="empty-state">Нет данных для отображения</div>
        ) : (
          <>
            {leaderboard.map((entry, index) => {
              const position = entry.position || (activeTab === 'global' && globalPagination 
                ? (globalPagination.page - 1) * globalPagination.limit + index + 1
                : index + 1);
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
            })}

            {/* Пагинация для глобального лидерборда */}
            {activeTab === 'global' && globalPagination && (
              <div className="leaderboard-pagination">
                <button
                  className="pagination-button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={!globalPagination.hasPrevPage || currentPage === 1}
                >
                  Назад
                </button>
                <span className="pagination-info">
                  Страница {globalPagination.page} из {globalPagination.totalPages}
                </span>
                <button
                  className="pagination-button"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!globalPagination.hasNextPage}
                >
                  Вперёд
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
