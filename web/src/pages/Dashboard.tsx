import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronRight, IconSettings, IconBell, IconClock } from '@tabler/icons-react';
import { api } from '../api';
import { Skeleton, SkeletonValue, BottomSheet } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import { isTaskAvailable } from '../utils/taskAvailability';
import WeeklyXpChart from '../components/WeeklyXpChart';
import './Dashboard.css';
import './SpaceLeaderboardMini.css';

interface Story {
  id: string;
  type: 'Weekly' | 'Admin';
  data: {
    tasksCompleted?: number;
    levelsGained?: number;
    leaderboardChange?: number;
  };
  weekStartDate: string;
  createdAt: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { tr, locale } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [dailyRecurringTasks, setDailyRecurringTasks] = useState<any[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedTaskId, setCompletedTaskId] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);
  const [spaceLeaderboard, setSpaceLeaderboard] = useState<any[]>([]);
  const [weeklyXpData, setWeeklyXpData] = useState<Array<{ day: number; xp: number; label: string }>>([]);
  const [members, setMembers] = useState<any[]>([]);

  // Загружаем просмотренные истории из localStorage
  const getViewedStories = (): Set<string> => {
    try {
      const viewed = localStorage.getItem('viewedStories');
      return viewed ? new Set(JSON.parse(viewed)) : new Set();
    } catch {
      return new Set();
    }
  };

  const [viewedStories, setViewedStories] = useState<Set<string>>(getViewedStories());

  const markStoryAsViewed = (storyId: string) => {
    const newViewed = new Set(viewedStories);
    newViewed.add(storyId);
    setViewedStories(newViewed);
    try {
      localStorage.setItem('viewedStories', JSON.stringify(Array.from(newViewed)));
    } catch (e) {
      console.error('Failed to save viewed stories:', e);
    }
  };

  useEffect(() => {
    loadData();
    
    // Очистка таймера при размонтировании
    return () => {
      if (undoTimer) {
        clearTimeout(undoTimer);
      }
    };
  }, []);

  const loadData = async () => {
    try {
      const [userData, statsData, tasksData, storiesData, leaderboardData, membersData] = await Promise.all([
        api.getUser(),
        api.getMyStats(),
        api.getTasks(),
        api.getStories().catch(() => ({ stories: [] })),
        api.getSpaceLeaderboard().catch(() => ({ leaderboard: [] })),
        api.getMembers().catch(() => ({ members: [] })),
      ]);
      
      setUser(userData);
      setStats(statsData);
      setStories(storiesData.stories || []);
      setSpaceLeaderboard((leaderboardData as any).leaderboard || []);
      setMembers((membersData as any).members || []);
      
      // Фильтруем задачи: показываем все задачи (одноразовые и ежедневные)
      // Для статистики "на сегодня" используем только ежедневные повторяющиеся
      const allTasks = tasksData.tasks;
      const dailyRecurring = allTasks.filter((task: any) => 
        task.recurrenceType === 'daily' || 
        (task.recurrenceType === 'weekly' && task.recurrencePayload?.daysOfWeek?.length === 7)
      );
      // Для актуальных задач показываем все невыполненные задачи
      setDailyTasks(allTasks);
      setDailyRecurringTasks(dailyRecurring);

      // Генерируем данные для графика XP за неделю (пока заглушка)
      // TODO: Заменить на реальный API endpoint для получения XP по дням
      generateWeeklyXpData();
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Генерирует данные графика XP за неделю (временная заглушка)
  // TODO: Заменить на реальный API endpoint
  const generateWeeklyXpData = () => {
    // Пока возвращаем пустые данные (можно позже добавить API)
    // Формат: { day: 0-6 (Sunday-Saturday), xp: number, label: string }
    const weekData = Array.from({ length: 7 }, (_, i) => {
      const jsDayOfWeek = i; // 0 = Sunday, 1 = Monday, etc.
      return {
        day: jsDayOfWeek,
        xp: 0, // TODO: Получать из API
        label: '', // Будет установлен в компоненте
      };
    });
    
    setWeeklyXpData(weekData);
  };

  const handleStoryClick = (story: Story) => {
    setSelectedStory(story);
    markStoryAsViewed(story.id);
  };

  // Получаем текст важности по difficulty
  const getImportanceText = (difficulty: number): string => {
    const importanceMap: { [key: number]: string } = {
      1: tr('Низкая', 'Low'),
      2: tr('Средняя', 'Medium'),
      3: tr('Высокая', 'High'),
      4: tr('Критическая', 'Critical'),
    };
    return importanceMap[difficulty] || importanceMap[1];
  };

  // Получаем класс для важности (для цвета)
  const getImportanceClass = (difficulty: number): string => {
    const classMap: { [key: number]: string } = {
      1: 'importance-low',      // серый
      2: 'importance-medium',   // зеленый
      3: 'importance-high',     // оранжевый
      4: 'importance-urgent',   // красный
    };
    return classMap[difficulty] || classMap[1];
  };

  // Форматируем дедлайн
  const formatDeadline = (dueAt: string | null): string | null => {
    if (!dueAt) return null;
    
    const deadline = new Date(dueAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
    
    const diffDays = Math.floor((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return tr('Сегодня', 'Today');
    if (diffDays === 1) return tr('Завтра', 'Tomorrow');
    if (diffDays === -1) return tr('Вчера', 'Yesterday');
    if (diffDays < 0) return tr('Просрочено', 'Overdue');
    
    return deadline.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  // Выполнение задачи с возможностью отмены
  const handleTaskComplete = async (taskId: string) => {
    // Если уже есть таймер отмены, сначала очищаем его
    if (undoTimer) {
      clearTimeout(undoTimer);
      setUndoTimer(null);
      setCompletedTaskId(null);
    }

    // Отмечаем задачу как выполненную
    setCompletedTaskId(taskId);

    // Удаляем задачу из списка визуально (опционально - можно просто пометить)
    const taskToComplete = uncompletedTasks.find(t => t.id === taskId);
    if (taskToComplete) {
      // Создаем таймер для отмены (5 секунд)
      const timer = setTimeout(async () => {
        try {
          await api.completeTask(taskId);
          // Перезагружаем данные
          loadData();
          setCompletedTaskId(null);
          setUndoTimer(null);
        } catch (error) {
          console.error('Failed to complete task:', error);
          // В случае ошибки возвращаем задачу обратно
          setCompletedTaskId(null);
          setUndoTimer(null);
        }
      }, 5000); // 5 секунд на отмену

      setUndoTimer(timer);
    }
  };

  // Отмена выполнения задачи
  const handleTaskUndo = () => {
    if (undoTimer) {
      clearTimeout(undoTimer);
      setUndoTimer(null);
      setCompletedTaskId(null);
    }
  };

  if (loading) {
    return (
      <div className="dashboard" aria-busy="true">
        <div className="dashboard-top-bar">
          <div className="level-zone">
            <div className="level-icon">
              <Skeleton width={28} height={28} radius={10} />
            </div>
            <div className="level-progress-container" style={{ width: '100%' }}>
              <div className="level-progress-bar">
                <div className="level-progress-fill" style={{ width: '35%' }} />
              </div>
              <div className="level-xp-info">
                <Skeleton width={120} height={14} radius={8} />
              </div>
            </div>
            <IconChevronRight size={20} className="level-chevron" />
          </div>

          <div className="top-bar-right">
            <div className="avatar-container">
              <div className="avatar avatar-image" style={{ display: 'none' }} />
              <div className="avatar" style={{ display: 'flex' }}>
                <Skeleton width={36} height={36} radius={999} />
              </div>
            </div>
            <IconSettings size={24} className="settings-icon" />
            <IconBell size={24} className="notifications-icon" />
          </div>
        </div>

        <div className="today-stats-block">
          <div className="today-stats-header">
            <Skeleton width={160} height={14} radius={8} />
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '45%' }} />
            </div>
          </div>
          <div className="motivational-text">
            <Skeleton width={220} height={14} radius={8} />
          </div>
        </div>

        <div className="actual-tasks-block">
          <h2 className="block-title">
            <SkeletonValue loading={true} width={170} height={22} radius={10}>
              {tr('Актуальные задачи', 'Current tasks')}
            </SkeletonValue>
          </h2>
          <div className="tasks-list">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="task-item">
                <div className="task-checkbox" />
                <div className="task-content">
                  <div className="task-title">
                    <Skeleton width="70%" height={16} radius={8} />
                  </div>
                  <div className="task-meta">
                    <Skeleton width={70} height={12} radius={999} />
                    <Skeleton width={60} height={12} radius={999} />
                  </div>
                </div>
                <div className="task-right">
                  <div className="task-xp">
                    <Skeleton width={50} height={14} radius={8} />
                  </div>
                  <div className="task-assignee-avatar">
                    <Skeleton width={28} height={28} radius={999} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Статистика "на сегодня" - только для ежедневных повторяющихся задач
  const completedToday = dailyRecurringTasks.filter((task: any) => task.isCompleted === true).length;
  const totalToday = dailyRecurringTasks.length;
  const progress = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;
  
  // Актуальные задачи - все невыполненные И доступные задачи (одноразовые + ежедневные)
  // Для повторяющихся задач показываем только те, которые доступны для выполнения
  const uncompletedTasks = dailyTasks.filter((task: any) => {
    // Пропускаем выполненные задачи
    if (task.isCompleted) return false;
    
    // Для повторяющихся задач проверяем доступность
    const isRecurring = task.recurrenceType && task.recurrenceType !== 'none';
    if (isRecurring) {
      return isTaskAvailable(task);
    }
    
    // Одноразовые задачи показываем всегда (если не выполнены)
    return true;
  });

  // Мотивационные фразы
  const motivationalPhrases = [
    tr('Поднажмите! Вы всё сможете!', 'Push a bit more — you can do it!'),
    tr('Продолжайте в том же духе!', 'Keep it up!'),
    tr('Осталось совсем немного!', 'Almost there!'),
    tr('Вы на правильном пути!', 'You’re on the right track!'),
  ];
  const motivationalText = motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)];

  const level = stats?.level || 1;
  const currentXp = stats?.currentLevelXp || 0;
  const xpToNextLevel = stats?.xpToNextLevel || 100;
  const levelProgress = xpToNextLevel > 0 ? (currentXp / xpToNextLevel) * 100 : 0;

  return (
    <div className="dashboard">
      {/* Верхняя зона Dashboard */}
      <div className="dashboard-top-bar">
        <div 
          className="level-zone"
          onClick={() => navigate('/level-progression')}
        >
          <div className="level-icon">{level}</div>
          <div className="level-progress-container">
            <div className="level-progress-bar">
              <div 
                className="level-progress-fill" 
                style={{ width: `${levelProgress}%` }}
              />
            </div>
            <div className="level-xp-info">
              <span className="level-xp-current">{currentXp}</span>
              <span className="level-xp-separator"> / </span>
              <span className="level-xp-total">{xpToNextLevel}</span>
              <span className="level-xp-label"> XP</span>
            </div>
          </div>
          <IconChevronRight size={20} className="level-chevron" />
        </div>

        <div className="top-bar-right">
          <div 
            className="avatar-container"
            onClick={() => navigate('/profile')}
          >
            {user?.photoUrl ? (
              <img 
                src={user.photoUrl} 
                alt={user.firstName || user.username || tr('Пользователь', 'User')} 
                className="avatar avatar-image"
                onError={(e) => {
                  // Fallback на placeholder если фото не загрузилось
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const placeholder = target.nextElementSibling as HTMLElement;
                  if (placeholder) placeholder.style.display = 'flex';
                }}
              />
            ) : null}
            <div className="avatar" style={{ display: user?.photoUrl ? 'none' : 'flex' }}>
              {user?.firstName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
          <IconSettings 
            size={24} 
            className="settings-icon"
            onClick={() => navigate('/settings')}
          />
          <IconBell 
            size={24} 
            className="notifications-icon"
            onClick={() => {/* TODO: открыть уведомления */}}
          />
        </div>
      </div>

      {/* Карусель историй */}
      {stories.length > 0 && (
        <div className="stories-carousel">
          <div className="stories-container">
            {stories.map((story) => {
              const isViewed = viewedStories.has(story.id);
              return (
                <div 
                  key={story.id} 
                  className="story-item"
                  onClick={() => handleStoryClick(story)}
                >
                  <div className="story-avatar">
                    {story.type === 'Weekly' ? '📊' : '✨'}
                  </div>
                  <div className={`story-indicator ${isViewed ? 'viewed' : 'unviewed'}`} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Блок статистики задач на сегодня */}
      <div className="today-stats-block">
        <div className="today-stats-header">
          <span className="stats-text">
            {totalToday === 0
              ? tr('Задач нет', 'No tasks')
              : tr(`${completedToday} / ${totalToday} выполнено`, `${completedToday} / ${totalToday} completed`)}
          </span>
        </div>
        {totalToday > 0 && (
          <>
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="motivational-text">{motivationalText}</div>
          </>
        )}
        {totalToday === 0 && (
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: '0%' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* График XP за неделю */}
      <WeeklyXpChart data={weeklyXpData} loading={loading} />

      {/* Таблица лидеров пространства */}
      {spaceLeaderboard.length > 0 && (
        <div className="space-leaderboard-mini">
          <h3 className="mini-leaderboard-title">
            {tr('Лидеры пространства', 'Space leaders')}
          </h3>
          <div className="mini-leaderboard-table">
            {spaceLeaderboard.slice(0, 5).map((entry, index) => (
              <div key={entry.userId || index} className="mini-leaderboard-row">
                <div className="mini-leaderboard-rank">#{index + 1}</div>
                <div className="mini-leaderboard-name">
                  {entry.firstName || entry.username || tr('Неизвестно', 'Unknown')}
                </div>
                <div className="mini-leaderboard-xp">{entry.totalXp || 0} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Блок актуальных задач */}
      <div className="actual-tasks-block">
        <h2 className="block-title">{tr('Актуальные задачи', 'Current tasks')}</h2>
        {uncompletedTasks.length === 0 ? (
          <div className="empty-state">
            {totalToday === 0 ? tr('Вы можете добавить задачу', 'You can add a task') : tr('Все задачи выполнены! 🎉', 'All tasks completed!')}
          </div>
        ) : (
          <div className="tasks-list">
            {uncompletedTasks.map((task: any) => {
              const isCompleted = completedTaskId === task.id;
              const importanceClass = getImportanceClass(task.difficulty || 1);
              const deadlineText = formatDeadline(task.dueAt);
              
              // Находим assignee (прикрепленного пользователя)
              const assigneeId = task.assigneeUserId;
              const assignee = assigneeId ? members.find((m: any) => m.id === assigneeId) : null;
              
              return (
                <div 
                  key={task.id} 
                  className={`task-item ${isCompleted ? 'completed' : ''}`}
                >
                  <div 
                    className={`task-checkbox ${isCompleted ? 'checked' : ''}`}
                    onClick={() => !isCompleted ? handleTaskComplete(task.id) : handleTaskUndo()}
                  >
                    {isCompleted && <span className="check-icon">✓</span>}
                  </div>
                  <div className="task-content">
                    <div className="task-title">{task.title}</div>
                    <div className="task-meta">
                      <span className={`task-importance ${importanceClass}`}>
                        {getImportanceText(task.difficulty || 1)}
                      </span>
                      {deadlineText && (
                        <span className={`task-deadline ${deadlineText === tr('Просрочено', 'Overdue') || deadlineText === tr('Вчера', 'Yesterday') ? 'overdue' : ''}`}>
                          <IconClock size={14} style={{ marginRight: '2px', verticalAlign: 'text-top' }} />
                          {deadlineText}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="task-right">
                    {task.xp > 0 && (
                      <div className="task-xp">+{task.xp} XP</div>
                    )}
                    {assignee ? (
                      <div className="task-assignee-avatar" title={assignee.firstName || assignee.username || tr('Без имени', 'No name')}>
                        {assignee.photoUrl ? (
                          <img src={assignee.photoUrl} alt={assignee.firstName || assignee.username || ''} />
                        ) : (
                          <span>{(assignee.firstName || assignee.username || '?').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    ) : (
                      <div className="task-assignee-avatar task-assignee-empty" title={tr('Не назначено', 'Unassigned')}>
                        <span>?</span>
                      </div>
                    )}
                  </div>
                  {isCompleted && (
                    <button 
                      className="task-undo-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskUndo();
                      }}
                    >
                      {tr('Отменить', 'Undo')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Просмотр истории через BottomSheet */}
      <BottomSheet
        isOpen={!!selectedStory}
        onClose={() => setSelectedStory(null)}
        title={selectedStory?.type === 'Weekly'
          ? tr('Недельная статистика', 'Weekly summary')
          : tr('Новость', 'News')}
      >
        {selectedStory && (
          <div className="story-content">
            <div className="story-stats">
              {selectedStory.data.tasksCompleted !== undefined && (
                <div className="stat-item">
                  <div className="stat-label">{tr('Выполнено задач', 'Tasks completed')}</div>
                  <div className="stat-value">{selectedStory.data.tasksCompleted}</div>
                </div>
              )}

              {selectedStory.data.levelsGained !== undefined && selectedStory.data.levelsGained > 0 && (
                <div className="stat-item">
                  <div className="stat-label">{tr('Получено уровней', 'Levels gained')}</div>
                  <div className="stat-value">+{selectedStory.data.levelsGained}</div>
                </div>
              )}

              {selectedStory.data.leaderboardChange !== undefined && (
                <div className="stat-item">
                  <div className="stat-label">{tr('Изменение в лидерборде', 'Leaderboard change')}</div>
                  <div className={`stat-value ${selectedStory.data.leaderboardChange >= 0 ? 'positive' : 'negative'}`}>
                    {selectedStory.data.leaderboardChange > 0 ? '↑' : selectedStory.data.leaderboardChange < 0 ? '↓' : '→'} 
                    {tr(
                      `${Math.abs(selectedStory.data.leaderboardChange)} мест${Math.abs(selectedStory.data.leaderboardChange) === 1 ? 'о' : ''}`,
                      `${Math.abs(selectedStory.data.leaderboardChange)} places`,
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="story-date">
              {new Date(selectedStory.weekStartDate).toLocaleDateString(locale, { 
                day: 'numeric', 
                month: 'long' 
              })} — {new Date(new Date(selectedStory.weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString(locale, { 
                day: 'numeric', 
                month: 'long' 
              })}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
