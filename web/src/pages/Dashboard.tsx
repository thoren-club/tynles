import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronRight, IconSettings, IconBell } from '@tabler/icons-react';
import { api } from '../api';
import { Skeleton, SkeletonValue } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import { isTaskAvailable } from '../utils/taskAvailability';
import { getTaskDateParts } from '../utils/taskDate';
import { triggerLightHaptic } from '../utils/haptics';
import { applyRecurringCompletion, getTaskSections, groupTasksByDue, sortTasksByDue } from '../utils/taskList';
import WeeklyXpChart from '../components/WeeklyXpChart';
import TaskListItem from '../components/TaskListItem';
import './Dashboard.css';
import './SpaceLeaderboardMini.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { tr, locale } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedTaskId, setCompletedTaskId] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);
  const [spaceLeaderboard, setSpaceLeaderboard] = useState<any[]>([]);
  const [weeklyXpData, setWeeklyXpData] = useState<Array<{ day: number; xp: number; label: string }>>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [currentSpace, setCurrentSpace] = useState<any>(null);

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
      const [userData, statsData, tasksData, leaderboardData, membersData, spaceInfo, weeklyXp] = await Promise.all([
        api.getUser(),
        api.getMyStats(),
        api.getTasks(),
        api.getSpaceLeaderboard().catch(() => ({ leaderboard: [] })),
        api.getMembers().catch(() => ({ members: [] })),
        api.getCurrentSpace().catch(() => null),
        api.getWeeklyXp().catch(() => ({ days: [] })),
      ]);
      
      setUser(userData);
      setStats(statsData);
      setSpaceLeaderboard((leaderboardData as any).leaderboard || []);
      setMembers((membersData as any).members || []);
      setCurrentSpace(spaceInfo);
      
      // Фильтруем задачи: показываем все задачи (одноразовые и ежедневные)
      // Для статистики "на сегодня" используем только ежедневные повторяющиеся
      const allTasks = tasksData.tasks;
      // Для актуальных задач показываем все невыполненные задачи
      setDailyTasks(allTasks);

      generateWeeklyXpData(weeklyXp.days || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateWeeklyXpData = (days: Array<{ date: string; xp: number }>) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const xpByDate = new Map<string, number>();
    const normalizeDate = (date: Date) => date.toISOString().slice(0, 10);

    days.forEach((day) => {
      if (!day?.date) return;
      xpByDate.set(day.date, day.xp || 0);
    });

    const weekData = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      const key = normalizeDate(day);
      const label = day.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase();
      return {
        day: i,
        xp: xpByDate.get(key) || 0,
        label,
      };
    });

    setWeeklyXpData(weekData);
  };

  const handleRecurringComplete = async (taskId: string) => {
    triggerLightHaptic();
    const previousTasks = dailyTasks;
    const { tasks: updatedTasks } = applyRecurringCompletion(previousTasks, taskId);
    setDailyTasks(updatedTasks);

    try {
      await api.completeTask(taskId);
    } catch (error) {
      console.error('Failed to complete task:', error);
      setDailyTasks(previousTasks);
    }
  };

  // Выполнение задачи с возможностью отмены
  const handleTaskComplete = async (taskId: string) => {
    triggerLightHaptic();
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

        <div className="actual-tasks-block">
          <h2 className="block-title">
            <SkeletonValue loading={true} width={170} height={22} radius={10}>
              {tr('Актуальные задачи', 'Current tasks')}
            </SkeletonValue>
          </h2>
          <div className="tasks-list">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="task-item">
                <Skeleton width={22} height={22} radius={999} />
                <div className="task-content">
                  <Skeleton width="65%" height={14} radius={8} />
                  <Skeleton width="45%" height={12} radius={8} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Актуальные задачи - показываем все невыполненные, даже если они ещё не доступны
  const uncompletedTasks = dailyTasks.filter((task: any) => !task.isCompleted);
  const groupedTasks = groupTasksByDue(uncompletedTasks);
  const taskSections = getTaskSections(tr);

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

      <div className="weekly-xp-panel">
        <WeeklyXpChart data={weeklyXpData} loading={loading} />
        {spaceLeaderboard.length > 0 && (
          <div className="space-leaderboard-mini">
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
      </div>

      {/* Блок актуальных задач */}
      <div className="actual-tasks-block">
        <h2 className="block-title">{tr('Актуальные задачи', 'Current tasks')}</h2>
        {taskSections.map((section) => {
          const tasksForSection = groupedTasks[section.key];
          if (tasksForSection.length === 0) return null;
          return (
            <div key={section.key} className="task-group">
              <div className="task-group-title">{section.label}</div>
              <div className="tasks-list">
                {sortTasksByDue(tasksForSection).map((task: any) => {
                  const isRecurring = task.recurrenceType && task.recurrenceType !== 'none';
                  const taskAvailable = !isRecurring || isTaskAvailable(task);
                  const isChecked = !isRecurring && completedTaskId === task.id;
                  const dateParts = getTaskDateParts(task.dueAt, locale, tr);
                  const assigneeId = task.assigneeUserId;
                  const assignee = task.assigneeScope === 'space'
                    ? {
                        firstName: currentSpace?.name || tr('Пространство', 'Space'),
                        photoUrl: currentSpace?.avatarUrl,
                      }
                    : assigneeId
                      ? members.find((m: any) => m.id === assigneeId)
                      : null;

                  return (
                    <TaskListItem
                      key={task.id}
                      title={task.title}
                      assignee={assignee}
                      isChecked={isChecked}
                      isDisabled={!taskAvailable}
                      isDimmed={isChecked}
                      dateLabel={dateParts?.label}
                      timeLabel={dateParts?.time}
                      isOverdue={dateParts?.isOverdue}
                      isRecurring={isRecurring}
                      onClick={() => navigate(`/task/${task.id}`)}
                      onToggle={() => {
                        if (!taskAvailable) return;
                        if (isRecurring) {
                          handleRecurringComplete(task.id);
                          return;
                        }
                        if (isChecked) {
                          handleTaskUndo();
                          return;
                        }
                        handleTaskComplete(task.id);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {completedTaskId && (
        <div className="task-undo-bar">
          <button className="task-undo-button" onClick={handleTaskUndo}>
            {tr('Отменить', 'Undo')}
          </button>
        </div>
      )}
    </div>
  );
}
