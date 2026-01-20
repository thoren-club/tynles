import { useEffect, useState } from 'react';
import { api } from '../api';
import { Skeleton } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import './Leaderboard.css';

// Компонент для элемента лидерборда с поддержкой аватарок и пинков
function LeaderboardItem({ entry, position, onPoke, isSpaceLeaderboard }: { 
  entry: any; 
  position: number;
  onPoke: (userId: string) => Promise<void>;
  isSpaceLeaderboard: boolean;
}) {
  const { tr } = useLanguage();
  const [avatarError, setAvatarError] = useState(false);
  const [isPoking, setIsPoking] = useState(false);
  const [poked, setPoked] = useState(entry.isPokedToday || false);
  
  // Обновляем состояние poked при изменении entry.isPokedToday
  useEffect(() => {
    setPoked(entry.isPokedToday || false);
  }, [entry.isPokedToday]);
  
  const displayAvatar = entry.photoUrl && !avatarError;
  const displayPlaceholder = !entry.photoUrl || avatarError;
  const avatarInitial = (entry.firstName || entry.username || 'U').charAt(0).toUpperCase();
  const canPoke = isSpaceLeaderboard && entry.canPoke && !poked;
  
  const handlePoke = async () => {
    if (!canPoke || isPoking) return;
    
    setIsPoking(true);
    try {
      await onPoke(entry.userId);
      setPoked(true);
    } catch (error) {
      console.error('Failed to poke user:', error);
      alert(tr('Не удалось пнуть пользователя', 'Failed to poke user'));
    } finally {
      setIsPoking(false);
    }
  };
  
  return (
    <div className="leaderboard-item">
      <div className="rank">#{position}</div>
      {displayAvatar && (
        <img 
          src={entry.photoUrl} 
          alt={entry.firstName || entry.username || tr('Пользователь', 'User')} 
          className="user-avatar"
          onError={() => setAvatarError(true)}
        />
      )}
      {displayPlaceholder && (
        <div className="user-avatar user-avatar-placeholder">
          {avatarInitial}
        </div>
      )}
      <div className="user-info">
        <div className="user-name">
          {entry.firstName || entry.username || tr('Неизвестно', 'Unknown')}
        </div>
        <div className="user-stats">
          {`${entry.totalXp ?? 0} XP`}
        </div>
      </div>
      {isSpaceLeaderboard && (
        <button
          className={`poke-button ${canPoke ? '' : 'disabled'} ${poked ? 'poked' : ''}`}
          onClick={handlePoke}
          disabled={!canPoke || isPoking}
          title={
            poked
              ? tr('Уже пнули сегодня', 'Already poked today')
              : canPoke
                ? tr('Пнуть игрока', 'Poke player')
                : tr('Нельзя пнуть', 'Cannot poke')
          }
        >
          {isPoking ? '...' : poked ? '✓' : '👆'}
        </button>
      )}
    </div>
  );
}

export default function Leaderboard() {
  const { tr } = useLanguage();
  const [spaceLeaderboard, setSpaceLeaderboard] = useState<any[]>([]);
  const [currentSpace, setCurrentSpace] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const [spaceLeaderboardData, spaceData] = await Promise.all([
        api.getSpaceLeaderboard().catch(() => ({ leaderboard: [], periodDays: 30 })),
        api.getCurrentSpace().catch(() => null),
      ]);
      
      setSpaceLeaderboard(spaceLeaderboardData.leaderboard || []);
      setCurrentSpace(spaceData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="leaderboard">
        <Skeleton width={160} height={30} />
        <div className="leaderboard-list">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="leaderboard-item">
              <Skeleton width={54} height={14} radius={8} />
              <Skeleton width={44} height={44} radius={999} />
              <div className="user-info">
                <Skeleton width={160} height={16} radius={8} />
                <Skeleton width={110} height={14} radius={8} />
              </div>
              <Skeleton width={34} height={34} radius={999} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const spaceName = currentSpace?.name || tr('Пространство', 'Space');

  return (
    <div className="leaderboard">
      <h1 className="leaderboard-title">
        {tr('Лидерборд пространства', 'Space leaderboard')}
      </h1>
      <div className="leaderboard-subtitle">{spaceName}</div>

      {/* Список лидерборда */}
      <div className="leaderboard-list">
        {spaceLeaderboard.length === 0 ? (
          <div className="empty-state">{tr('Нет данных для отображения', 'No data to display')}</div>
        ) : (
          spaceLeaderboard.map((entry, index) => {
            const position = entry.position || entry.leaguePosition || (index + 1);
            return (
              <LeaderboardItem 
                key={entry.userId || index} 
                entry={entry} 
                position={position}
                onPoke={async (userId: string) => {
                  await api.pokeUser(userId);
                  await loadData();
                }}
                isSpaceLeaderboard={true}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
