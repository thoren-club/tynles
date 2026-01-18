import { useEffect, useState } from 'react';
import { api } from '../api';
import { Skeleton, SkeletonValue } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import './Stats.css';

export default function Stats() {
  const { tr } = useLanguage();
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
    return (
      <div className="stats">
        <Skeleton width={160} height={34} />

        <div className="my-stats-section">
          <Skeleton width={140} height={22} />
          <div className="stats-grid">
            <div className="stat-card">
              <Skeleton width={54} height={28} radius={10} />
              <Skeleton width={70} height={14} radius={8} />
            </div>
            <div className="stat-card">
              <Skeleton width={70} height={28} radius={10} />
              <Skeleton width={80} height={14} radius={8} />
            </div>
          </div>
        </div>

        <div className="leaderboard-section">
          <Skeleton width={140} height={22} />
          <div className="leaderboard">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="leaderboard-item">
                <Skeleton width={40} height={14} radius={8} />
                <div className="user-info">
                  <Skeleton width="55%" height={16} radius={8} />
                  <Skeleton width="70%" height={14} radius={8} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stats">
      <h1>{tr('Статистика', 'Statistics')}</h1>

      <div className="my-stats-section">
        <h2>{tr('Ваша статистика', 'Your Stats')}</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">
              <SkeletonValue loading={!myStats} width={42} height={28} radius={10}>
                {myStats?.level || 1}
              </SkeletonValue>
            </div>
            <div className="stat-label">{tr('Уровень', 'Level')}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              <SkeletonValue loading={!myStats} width={70} height={28} radius={10}>
                {myStats?.totalXp || 0}
              </SkeletonValue>
            </div>
            <div className="stat-label">{tr('Всего XP', 'Total XP')}</div>
          </div>
        </div>
      </div>

      <div className="leaderboard-section">
        <h2>{tr('Лидерборд', 'Leaderboard')}</h2>
        <div className="leaderboard">
          {leaderboard.length === 0 ? (
            <div className="empty-state">{tr('Пока нет данных', 'No leaderboard data yet')}</div>
          ) : (
            leaderboard.map((entry, index) => (
              <div key={entry.userId} className="leaderboard-item">
                <div className="rank">#{index + 1}</div>
                <div className="user-info">
                  <div className="user-name">
                    {entry.firstName || entry.username || tr('Неизвестно', 'Unknown')}
                  </div>
                  <div className="user-stats">
                    {tr('Уровень', 'Level')} {entry.level} • {entry.totalXp} XP
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
