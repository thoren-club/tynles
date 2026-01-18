import { useEffect, useState } from 'react';
import { api } from '../api';
import { Skeleton } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import './Leaderboard.css';

// Названия лиг
const LEAGUE_NAMES = {
  ru: [
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
  ],
  en: [
    'Bronze',
    'Silver',
    'Gold',
    'Sapphire',
    'Ruby',
    'Emerald',
    'Amethyst',
    'Pearl',
    'Obsidian',
    'Diamond',
    'Master',
    'Legendary',
  ],
} as const;

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
  const { tr, locale, language } = useLanguage();
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
    } else {
      // При переключении на space tab обновляем данные для получения статуса пинков
      loadData();
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
    if (days <= 0) return tr('Раунд завершен', 'Round ended');
    
    // Форматируем дни, часы, минуты для более точного отображения
    const now = new Date();
    const endDate = periodInfo.endDate ? new Date(periodInfo.endDate) : null;

    const pluralRu = (n: number, one: string, few: string, many: string) => {
      const mod10 = n % 10;
      const mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) return one;
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
      return many;
    };
    
    if (endDate) {
      const diffMs = endDate.getTime() - now.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (diffDays <= 0 && diffHours <= 0) {
        return tr('Раунд завершен', 'Round ended');
      }
      
      if (diffDays === 0) {
        const ruHours = pluralRu(diffHours, 'час', 'часа', 'часов');
        const enHours = diffHours === 1 ? 'hour' : 'hours';
        return tr(`Осталось ${diffHours} ${ruHours}`, `Remaining ${diffHours} ${enHours}`);
      }
      
      if (diffDays === 1) {
        return tr('Остался 1 день', '1 day remaining');
      }
      
      const ruDays = pluralRu(diffDays, 'день', 'дня', 'дней');
      const enDays = diffDays === 1 ? 'day' : 'days';
      return tr(`Осталось ${diffDays} ${ruDays}`, `Remaining ${diffDays} ${enDays}`);
    }
    
    // Fallback на старую логику
    if (days === 1) return tr('Остался 1 день', '1 day remaining');
    const ruDays = pluralRu(days, 'день', 'дня', 'дней');
    const enDays = days === 1 ? 'day' : 'days';
    return tr(`Осталось ${days} ${ruDays}`, `Remaining ${days} ${enDays}`);
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
    return (
      <div className="leaderboard">
        <Skeleton width={160} height={30} />
        <div className="leaderboard-tabs">
          <Skeleton width={120} height={34} radius={999} />
          <Skeleton width={140} height={34} radius={999} />
        </div>
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

  const leaderboard = activeTab === 'global' ? globalLeaderboard : spaceLeaderboard;
  const spaceName = currentSpace?.name || tr('Пространство', 'Space');
  const leagueNames = language === 'ru' ? LEAGUE_NAMES.ru : LEAGUE_NAMES.en;

  return (
    <div className="leaderboard">
      <h1 className="leaderboard-title">{tr('Лидерборд', 'Leaderboard')}</h1>

      {/* Табы */}
      <div className="leaderboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'global' ? 'active' : ''}`}
          onClick={() => setActiveTab('global')}
        >
          {tr('Глобальный', 'Global')}
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
              {leagueNames.map((leagueName, index) => {
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
                  {tr('Раунд закончится:', 'Round ends:')}{' '}
                  {new Date(periodInfo.endDate).toLocaleDateString(locale, { 
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
          <div className="empty-state">{tr('Нет данных для отображения', 'No data to display')}</div>
        ) : (
          <>
            {leaderboard.map((entry, index) => {
              // Рассчитываем позицию: для глобального используем leaguePosition из ответа или рассчитываем
              let position: number;
              if (activeTab === 'global' && globalPagination) {
                // Используем leaguePosition из ответа, если есть, иначе рассчитываем
                position = entry.leaguePosition || entry.position || 
                  ((globalPagination.page - 1) * (globalPagination.limit || globalPagination.chunkSize || 50) + index + 1);
              } else {
                // Для локального лидерборда используем position из ответа или индекс
                position = entry.position || entry.leaguePosition || (index + 1);
              }
              
              return (
                <LeaderboardItem 
                  key={entry.userId || index} 
                  entry={entry} 
                  position={position}
                  onPoke={async (userId: string) => {
                    await api.pokeUser(userId);
                    // Обновляем лидерборд после пинка
                    if (activeTab === 'space') {
                      await loadData();
                    }
                  }}
                  isSpaceLeaderboard={activeTab === 'space'}
                />
              );
            })}

            {/* Пагинация для глобального лидерборда - показываем только если больше 1 страницы */}
            {activeTab === 'global' && globalPagination && (globalPagination.totalPages || globalPagination.totalChunks) > 1 && (
              <div className="leaderboard-pagination">
                <button
                  className="pagination-button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={!globalPagination.hasPrevPage || currentPage === 1}
                >
                  {tr('Назад', 'Back')}
                </button>
                <span className="pagination-info">
                  {tr(
                    `Страница ${globalPagination.page} из ${globalPagination.totalPages || globalPagination.totalChunks || 1}`,
                    `Page ${globalPagination.page} of ${globalPagination.totalPages || globalPagination.totalChunks || 1}`,
                  )}
                </span>
                <button
                  className="pagination-button"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!globalPagination.hasNextPage}
                >
                  {tr('Вперёд', 'Next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
