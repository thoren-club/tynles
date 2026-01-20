import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronLeft, IconCheck } from '@tabler/icons-react';
import { api } from '../api';
import { Skeleton } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import './LevelProgression.css';

function getDefaultXpForNextLevel(currentLevel: number): number {
  if (currentLevel >= 80) return 0;
  return Math.floor(100 * (1 + currentLevel * 0.02));
}

export default function LevelProgression() {
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const [levelRewards, setLevelRewards] = useState<Array<{ level: number; text: string; xpRequired?: number }>>([]);
  const [userStats, setUserStats] = useState<{ level: number; totalXp: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg?.BackButton) return;
    const handleBack = () => navigate(-1);
    try {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
    } catch {
      // no-op
    }
    return () => {
      try {
        tg.BackButton.offClick(handleBack);
        tg.BackButton.hide();
      } catch {
        // no-op
      }
    };
  }, [navigate]);

  const loadData = async () => {
    try {
      const [rewardsData, statsData] = await Promise.all([
        api.getLevelRewards().catch(() => ({ rewards: [] })),
        api.getMyStats().catch(() => ({ level: 1, totalXp: 0 })),
      ]);
      setLevelRewards(rewardsData.rewards || []);
      setUserStats(statsData as { level: number; totalXp: number });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Генерируем список уровней от 1 до 80
  const levels = Array.from({ length: 80 }, (_, i) => i + 1);
  
  const currentLevel = userStats ? userStats.level : 1;
  const currentTotalXp = userStats ? userStats.totalXp : 0;
  const xpByLevel = new Map(levelRewards.map((r) => [r.level, r.xpRequired]));
  const getXpForLevel = (level: number) => xpByLevel.get(level) ?? getDefaultXpForNextLevel(level);
  const getTotalXpForLevel = (targetLevel: number) => {
    if (targetLevel <= 1) return 0;
    let totalXp = 0;
    for (let level = 1; level < targetLevel; level++) {
      totalXp += getXpForLevel(level);
    }
    return totalXp;
  };

  return (
    <div className="level-progression">
      {/* Хедер */}
      <div className="progression-header">
        <IconChevronLeft 
          size={24} 
          className="back-icon"
          onClick={() => navigate('/')}
        />
        <h1 className="progression-title">{tr('Прогрессия уровней', 'Level progression')}</h1>
        <div style={{ width: 24 }} />
      </div>

      {/* Список уровней */}
      {loading ? (
        <div className="levels-list" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="level-item">
              <div className="level-header">
                <div className="level-number">
                  <Skeleton width={120} height={16} radius={8} />
                </div>
                <div className="level-progress-info">
                  <div className="progress-text">
                    <Skeleton width={180} height={14} radius={8} />
                  </div>
                  <div className="progress-text-small">
                    <Skeleton width={140} height={12} radius={8} />
                  </div>
                </div>
              </div>
              <div className="level-progress-bar-container">
                <Skeleton width="100%" height={10} radius={999} />
              </div>
              <div className="level-reward">
                <Skeleton width="60%" height={14} radius={8} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="levels-list">
          {levels.map((level) => {
            const reward = levelRewards.find(r => r.level === level);
            const isCompleted = level < currentLevel;
            const isCurrent = level === currentLevel;
            const levelTotalXp = getTotalXpForLevel(level);
            const nextLevelTotalXp = getTotalXpForLevel(level + 1);
            const xpForThisLevel = nextLevelTotalXp - levelTotalXp;
            const xpIntoLevel = isCurrent ? currentTotalXp - levelTotalXp : (isCompleted ? xpForThisLevel : 0);
            const xpRemaining = isCurrent ? xpForThisLevel - xpIntoLevel : (isCompleted ? 0 : xpForThisLevel);
            const progressPercent = isCurrent ? (xpIntoLevel / xpForThisLevel) * 100 : (isCompleted ? 100 : 0);
            const hasReward = reward?.text && reward.text.trim() !== '';
            
            return (
              <div 
                key={level} 
                className={`level-item ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                <div className="level-header">
                  <div className="level-number">
                    {tr('Уровень', 'Level')} {level}
                    {isCompleted && <IconCheck size={16} className="completed-icon" />}
                    {isCurrent && <span className="current-badge">{tr('Текущий', 'Current')}</span>}
                  </div>
                  {isCurrent && (
                    <div className="level-progress-info">
                      <div className="progress-text">
                        {xpIntoLevel} / {xpForThisLevel} XP ({Math.round(progressPercent)}%)
                      </div>
                      <div className="progress-text-small">
                        {tr('Осталось', 'Remaining')}: {xpRemaining} XP
                      </div>
                    </div>
                  )}
                  {!isCurrent && !isCompleted && (
                    <div className="level-progress-info">
                      <div className="progress-text">
                        {tr('Требуется', 'Required')}: {xpForThisLevel} XP
                      </div>
                    </div>
                  )}
                  {isCompleted && (
                    <div className="level-progress-info">
                      <div className="progress-text completed-text">
                        {tr('Завершено', 'Completed')}
                      </div>
                    </div>
                  )}
                </div>
                <div className="level-progress-bar-container">
                  <div 
                    className="level-progress-bar" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className={`level-reward ${hasReward && isCompleted ? 'reward-earned' : ''}`}>
                  {hasReward ? (
                    <>
                      <span className="reward-text">{reward.text}</span>
                      {isCompleted && <IconCheck size={14} className="reward-check" />}
                    </>
                  ) : (
                    <span className="reward-empty">{tr('нет', 'none')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
