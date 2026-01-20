import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronRight } from '@tabler/icons-react';
import { api } from '../api';
import { isTaskAvailable } from '../utils/taskAvailability';
import { getTaskDateParts } from '../utils/taskDate';
import { getGoalTimeframeLabel } from '../utils/goalTimeframe';
import { triggerLightHaptic } from '../utils/haptics';
import { applyRecurringCompletion, getTaskSections, groupTasksByDue, sortTasksByDue } from '../utils/taskList';
import { Skeleton } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import TaskListItem from '../components/TaskListItem';
import './Deals.css';

export default function Deals() {
  const navigate = useNavigate();
  const { tr, locale } = useLanguage();
  const [goals, setGoals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [currentSpace, setCurrentSpace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completedTaskId, setCompletedTaskId] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleDataChanged = () => {
      loadData();
    };
    window.addEventListener('app-data-changed', handleDataChanged);
    return () => window.removeEventListener('app-data-changed', handleDataChanged);
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimer) {
        clearTimeout(undoTimer);
      }
    };
  }, []);

  const loadData = async () => {
    try {
      const [goalsData, tasksData, membersData, spaceInfo] = await Promise.all([
        api.getGoals(),
        api.getTasks(),
        api.getMembers().catch(() => ({ members: [] })),
        api.getCurrentSpace().catch(() => null),
      ]);
      
      setGoals(goalsData.goals || []);
      setTasks(tasksData.tasks || []);
      setMembers(membersData.members || []);
      setCurrentSpace(spaceInfo);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoalClick = (goalId: string) => {
    navigate(`/goal/${goalId}`);
  };

  const handleGoalToggle = async (goalId: string) => {
    triggerLightHaptic();
    try {
      await api.toggleGoal(goalId);
      await loadData();
    } catch (error) {
      console.error('Failed to toggle goal:', error);
      alert(tr('Не удалось изменить статус цели', 'Failed to update goal status'));
    }
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/task/${taskId}`);
  };

  const handleRecurringComplete = async (taskId: string) => {
    triggerLightHaptic();
    const previousTasks = tasks;
    const { tasks: updatedTasks } = applyRecurringCompletion(previousTasks, taskId);
    setTasks(updatedTasks);

    try {
      await api.completeTask(taskId);
    } catch (error) {
      console.error('Failed to complete task:', error);
      setTasks(previousTasks);
      alert(tr('Не удалось выполнить задачу', 'Failed to complete task'));
    }
  };

  const handleTaskComplete = async (taskId: string) => {
    triggerLightHaptic();
    if (undoTimer) {
      clearTimeout(undoTimer);
      setUndoTimer(null);
      setCompletedTaskId(null);
    }

    setCompletedTaskId(taskId);

    const taskToComplete = uncompletedTasks.find((t) => t.id === taskId);
    if (taskToComplete) {
      const timer = setTimeout(async () => {
        try {
          await api.completeTask(taskId);
          await loadData();
          setCompletedTaskId(null);
          setUndoTimer(null);
        } catch (error) {
          console.error('Failed to complete task:', error);
          setCompletedTaskId(null);
          setUndoTimer(null);
        }
      }, 5000);

      setUndoTimer(timer);
    }
  };

  const handleTaskUndo = () => {
    if (undoTimer) {
      clearTimeout(undoTimer);
      setUndoTimer(null);
      setCompletedTaskId(null);
    }
  };

  const displayedGoals = goals.slice(0, 6);
  const hasMoreGoals = goals.length > 6;
  
  // Показываем все невыполненные задачи, даже если они ещё недоступны
  const uncompletedTasks = tasks.filter((task: any) => !task.isCompleted);
  const groupedTasks = groupTasksByDue(uncompletedTasks);
  const taskSections = getTaskSections(tr);

  if (loading) {
    return (
      <div className="deals">
        <div className="deals-header">
          <Skeleton width={90} height={30} />
          <Skeleton width={110} height={34} radius={999} />
        </div>

        <div className="goals-section">
          <div className="section-header">
            <Skeleton width={90} height={22} />
            <Skeleton width={110} height={18} radius={10} />
          </div>
          <div className="goals-list">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="goal-card">
                <div className="goal-content">
                  <Skeleton width="70%" height={16} radius={8} />
                  <div className="goal-meta">
                    <Skeleton width={90} height={12} radius={999} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="tasks-section">
          <Skeleton width={90} height={22} />
          <div className="tasks-list">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="task-card">
                <div className="task-content">
                  <div className="task-header">
                    <Skeleton width="65%" height={16} radius={8} />
                    <Skeleton width={60} height={14} radius={999} />
                  </div>
                  <div className="task-meta">
                    <Skeleton width={140} height={14} radius={999} />
                  </div>
                </div>
                <Skeleton width={92} height={34} radius={999} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="deals">
      {/* Хедер с кнопкой создать */}
      <div className="deals-header">
        <h1 className="deals-title">{tr('Дела', 'Deals')}</h1>
      </div>

      {/* Секция целей */}
      <div className="goals-section">
        <div className="section-header">
          <h2 className="section-title">{tr('Цели', 'Goals')}</h2>
          {hasMoreGoals && (
            <button 
              className="all-goals-link"
              onClick={() => navigate('/all-goals')}
            >
              {tr('Все цели', 'All goals')}
              <IconChevronRight size={16} />
            </button>
          )}
        </div>

        {displayedGoals.length === 0 ? (
          <div className="empty-state">{tr('Целей пока нет', 'No goals yet')}</div>
        ) : (
          <div className="goals-list">
            {displayedGoals.map((goal) => {
              const timeframeLabel = getGoalTimeframeLabel(goal, locale, tr);
              const goalAssignee = goal.assigneeScope === 'space'
                ? {
                    firstName: currentSpace?.name || tr('Пространство', 'Space'),
                    photoUrl: currentSpace?.avatarUrl,
                  }
                : goal.assigneeUserId
                  ? members.find((m: any) => m.id === goal.assigneeUserId)
                  : null;

              return (
                <TaskListItem
                  key={goal.id}
                  title={goal.title}
                  assignee={goalAssignee}
                  isChecked={goal.isDone}
                  isDisabled={false}
                  isDimmed={goal.isDone}
                  onToggle={() => handleGoalToggle(goal.id)}
                  dateLabel={timeframeLabel}
                  showCalendarIcon={false}
                  onClick={() => handleGoalClick(goal.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Секция задач */}
      <div className="tasks-section">
        <h2 className="section-title">{tr('Задачи', 'Tasks')}</h2>
        {taskSections.map((section) => {
          const tasksForSection = groupedTasks[section.key];
          if (tasksForSection.length === 0) return null;
          return (
            <div key={section.key} className="task-group">
              <div className="task-group-title">{section.label}</div>
              <div className="tasks-list">
                {sortTasksByDue(tasksForSection).map((task) => {
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
                      onClick={() => handleTaskClick(task.id)}
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
