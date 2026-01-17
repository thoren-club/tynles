import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronRight, IconSettings, IconBell, IconX } from '@tabler/icons-react';
import { api } from '../api';
import './Dashboard.css';

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
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [dailyRecurringTasks, setDailyRecurringTasks] = useState<any[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedTaskId, setCompletedTaskId] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

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
      const [userData, statsData, tasksData, storiesData] = await Promise.all([
        api.getUser(),
        api.getMyStats(),
        api.getTasks(),
        api.getStories().catch(() => ({ stories: [] })),
      ]);
      
      setUser(userData);
      setStats(statsData);
      setStories(storiesData.stories || []);
      
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
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoryClick = (story: Story) => {
    setSelectedStory(story);
    markStoryAsViewed(story.id);
  };

  // Получаем текст важности по difficulty
  const getImportanceText = (difficulty: number): string => {
    const importanceMap: { [key: number]: string } = {
      1: 'Не обязательно',
      2: 'Можно не торопиться',
      3: 'Нужно торопиться',
      4: 'Подпекает',
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
    
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Завтра';
    if (diffDays === -1) return 'Вчера';
    if (diffDays < 0) return 'Просрочено';
    
    return deadline.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
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
    return <div className="dashboard">Loading...</div>;
  }

  // Статистика "на сегодня" - только для ежедневных повторяющихся задач
  const completedToday = dailyRecurringTasks.filter((task: any) => task.isCompleted === true).length;
  const totalToday = dailyRecurringTasks.length;
  const progress = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;
  
  // Актуальные задачи - все невыполненные задачи (одноразовые + ежедневные)
  const uncompletedTasks = dailyTasks.filter((task: any) => !task.isCompleted);

  // Мотивационные фразы
  const motivationalPhrases = [
    'Поднажмите! Вы всё сможете!',
    'Продолжайте в том же духе!',
    'Осталось совсем немного!',
    'Вы на правильном пути!',
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
          </div>
          <IconChevronRight size={20} className="level-chevron" />
        </div>

        <div className="top-bar-right">
          <div 
            className="avatar-container"
            onClick={() => navigate('/profile')}
          >
            <div className="avatar">
              {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
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
            {totalToday === 0 ? 'Задач нет' : `${completedToday} / ${totalToday} выполнено`}
          </span>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="motivational-text">{motivationalText}</div>
      </div>

      {/* Блок актуальных задач */}
      <div className="actual-tasks-block">
        <h2 className="block-title">Актуальные задачи</h2>
        {uncompletedTasks.length === 0 ? (
          <div className="empty-state">
            {totalToday === 0 ? 'Вы можете добавить задачу' : 'Все задачи выполнены! 🎉'}
          </div>
        ) : (
          <div className="tasks-list">
            {uncompletedTasks.map((task: any) => {
              const isCompleted = completedTaskId === task.id;
              const importanceClass = getImportanceClass(task.difficulty || 1);
              const deadlineText = formatDeadline(task.dueAt);
              
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
                    <div className="task-header">
                      <div className="task-title">{task.title}</div>
                      {task.xp > 0 && (
                        <div className="task-xp">+{task.xp} XP</div>
                      )}
                    </div>
                    <div className="task-meta">
                      <span className={`task-importance ${importanceClass}`}>
                        {getImportanceText(task.difficulty || 1)}
                      </span>
                      {deadlineText && (
                        <span className={`task-deadline ${deadlineText === 'Просрочено' || deadlineText === 'Вчера' ? 'overdue' : ''}`}>
                          {deadlineText}
                        </span>
                      )}
                    </div>
                  </div>
                  {isCompleted && (
                    <button 
                      className="task-undo-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskUndo();
                      }}
                    >
                      Отменить
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Модальное окно просмотра истории */}
      {selectedStory && (
        <div className="story-viewer-overlay" onClick={() => setSelectedStory(null)}>
          <div className="story-viewer-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="story-viewer">
              <div className="story-viewer-header">
                <IconX 
                  size={24} 
                  className="story-close-icon"
                  onClick={() => setSelectedStory(null)}
                />
              </div>

              <div className="story-content">
                <div className="story-title">
                  {selectedStory.type === 'Weekly' ? 'Недельная статистика' : 'Новость'}
                </div>

                <div className="story-stats">
                  {selectedStory.data.tasksCompleted !== undefined && (
                    <div className="stat-item">
                      <div className="stat-label">Выполнено задач</div>
                      <div className="stat-value">{selectedStory.data.tasksCompleted}</div>
                    </div>
                  )}

                  {selectedStory.data.levelsGained !== undefined && selectedStory.data.levelsGained > 0 && (
                    <div className="stat-item">
                      <div className="stat-label">Получено уровней</div>
                      <div className="stat-value">+{selectedStory.data.levelsGained}</div>
                    </div>
                  )}

                  {selectedStory.data.leaderboardChange !== undefined && (
                    <div className="stat-item">
                      <div className="stat-label">Изменение в лидерборде</div>
                      <div className={`stat-value ${selectedStory.data.leaderboardChange >= 0 ? 'positive' : 'negative'}`}>
                        {selectedStory.data.leaderboardChange > 0 ? '↑' : selectedStory.data.leaderboardChange < 0 ? '↓' : '→'} 
                        {Math.abs(selectedStory.data.leaderboardChange)} мест{Math.abs(selectedStory.data.leaderboardChange) === 1 ? 'о' : ''}
                      </div>
                    </div>
                  )}
                </div>

                <div className="story-date">
                  {new Date(selectedStory.weekStartDate).toLocaleDateString('ru-RU', { 
                    day: 'numeric', 
                    month: 'long' 
                  })} — {new Date(new Date(selectedStory.weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU', { 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
