import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Button, Skeleton } from '../components/ui';
import { isTaskAvailable, getNextAvailableDate, formatTimeUntilNext as formatTimeUntilNextUtil } from '../utils/taskAvailability';
import { useLanguage } from '../contexts/LanguageContext';
import './TaskDetail.css';

export default function TaskDetail() {
  const navigate = useNavigate();
  const { tr, locale } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [assigneeUserId, setAssigneeUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (id) {
      loadTask();
    }
  }, [id]);

  const loadTask = async () => {
    try {
      const [tasksData, membersData] = await Promise.all([
        api.getTasks(),
        api.getMembers().catch(() => ({ members: [] })),
      ]);
      const foundTask = tasksData.tasks.find((t: any) => t.id === id);
      if (foundTask) {
        setTask(foundTask);
        setAssigneeUserId(foundTask.assigneeUserId || null);
      }
      setMembers(membersData.members || []);
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(tr('Удалить задачу?', 'Delete task?'))) return;
    
    setIsDeleting(true);
    try {
      await api.deleteTask(id!);
      navigate('/deals');
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert(tr('Не удалось удалить задачу', 'Failed to delete task'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm(tr('Выполнить задачу?', 'Complete task?'))) return;
    
    setIsCompleting(true);
    try {
      const result = await api.completeTask(id!);
      // Для повторяющихся задач не переходим на /deals, а обновляем данные
      if (result && (result as any).isRecurring) {
        await loadTask();
      } else {
        navigate('/deals');
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
      alert(tr('Не удалось выполнить задачу', 'Failed to complete task'));
    } finally {
      setIsCompleting(false);
    }
  };

  const handleAssigneeChange = async (nextUserId: string | null) => {
    if (!id) return;
    setIsAssigning(true);
    try {
      await api.setTaskAssignee(id, nextUserId);
      setAssigneeUserId(nextUserId);
      await loadTask();
    } catch (error) {
      console.error('Failed to set assignee:', error);
      alert(tr('Не удалось назначить исполнителя', 'Failed to assign user'));
    } finally {
      setIsAssigning(false);
    }
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
      1: 'importance-low',
      2: 'importance-medium',
      3: 'importance-high',
      4: 'importance-urgent',
    };
    return classMap[difficulty] || classMap[1];
  };

  // Определяем тип задачи
  const getTaskType = (task: any): 'one-time' | 'daily' | 'weekly' => {
    if (!task.recurrenceType) {
      return 'one-time';
    }
    
    if (task.recurrenceType === 'daily') {
      const daysOfWeek = task.recurrencePayload?.daysOfWeek || [];
      if (daysOfWeek.length === 7) {
        return 'daily';
      }
      return 'weekly';
    }
    
    return 'weekly';
  };

  // Получаем текст типа задачи
  const getTaskTypeText = (task: any): string => {
    const type = getTaskType(task);
    
    switch (type) {
      case 'one-time':
        return tr('Одноразовая', 'One-time');
      case 'daily':
        return tr('Ежедневная', 'Daily');
      case 'weekly': {
        const daysOfWeek = task.recurrencePayload?.daysOfWeek || [];
        if (daysOfWeek.length === 0) {
          return tr('Еженедельная', 'Weekly');
        }
        return tr(`Еженедельная (${daysOfWeek.length} дней)`, `Weekly (${daysOfWeek.length} days)`);
      }
      default:
        return tr('Одноразовая', 'One-time');
    }
  };

  if (loading) {
    return (
      <div className="task-detail-overlay" onClick={() => navigate('/deals')}>
        <div className="task-detail-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="task-detail" aria-busy="true">
            <div className="task-detail-header">
              <div className="swipe-indicator" />
            </div>

            <div className="task-field">
              <Skeleton width={90} height={12} radius={8} />
              <Skeleton width="75%" height={18} radius={10} />
            </div>

            <div className="task-field">
              <Skeleton width={70} height={12} radius={8} />
              <Skeleton width="90%" height={44} radius={12} />
            </div>

            <div className="task-field">
              <Skeleton width={70} height={12} radius={8} />
              <Skeleton width={120} height={18} radius={999} />
            </div>

            <div className="task-actions">
              <Skeleton width="100%" height={44} radius={12} />
              <Skeleton width="100%" height={44} radius={12} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="task-detail-overlay" onClick={() => navigate('/deals')}>
        <div className="task-detail-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="task-detail">{tr('Задача не найдена', 'Task not found')}</div>
        </div>
      </div>
    );
  }

  const importance = getImportanceText(task.difficulty || 1);
  const importanceClass = getImportanceClass(task.difficulty || 1);
  const taskType = getTaskTypeText(task);
  const deadlineText = formatDeadline(task.dueAt);

  // Используем утилиту для проверки доступности задачи
  const isRecurring = task.recurrenceType && task.recurrenceType !== 'none';
  const taskAvailable = isTaskAvailable(task);
  const nextAvailableTime = getNextAvailableDate(task);
  
  // Форматируем время до следующего выполнения
  const formatTimeUntilNextText = (): string => {
    return formatTimeUntilNextUtil(task);
  };

  return (
    <div className="task-detail-overlay" onClick={() => navigate('/deals')}>
      <div className="task-detail-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="task-detail">
          {/* Хедер с возможностью свайпа */}
          <div className="task-detail-header">
            <div className="swipe-indicator" />
          </div>

          {/* Название */}
          <div className="task-field">
            <label className="task-label">{tr('Название', 'Title')}</label>
            <div className="task-value">{task.title}</div>
          </div>

          {/* Описание */}
          {(task as any).description && (
            <div className="task-field">
              <label className="task-label">{tr('Описание', 'Description')}</label>
              <div className="task-value">{(task as any).description}</div>
            </div>
          )}

          {/* Дедлайн */}
          {deadlineText && (
            <div className="task-field">
              <label className="task-label">{tr('Дедлайн', 'Deadline')}</label>
              <div className={`task-value ${deadlineText === tr('Просрочено', 'Overdue') || deadlineText === tr('Вчера', 'Yesterday') ? 'overdue' : ''}`}>
                {deadlineText}
              </div>
            </div>
          )}

          {/* Важность */}
          <div className="task-field">
            <label className="task-label">{tr('Важность', 'Priority')}</label>
            <div className={`task-value task-importance ${importanceClass}`}>
              {importance}
            </div>
          </div>

          {/* Тип */}
          <div className="task-field">
            <label className="task-label">{tr('Тип', 'Type')}</label>
            <div className="task-value">{taskType}</div>
          </div>

          {/* XP */}
          {task.xp > 0 && (
            <div className="task-field">
              <label className="task-label">{tr('Опыт', 'XP')}</label>
              <div className="task-value task-xp">+{task.xp} XP</div>
            </div>
          )}

          {/* Исполнитель */}
          <div className="task-field">
            <label className="task-label">{tr('Исполнитель', 'Assignee')}</label>
            <select
              className="task-value"
              value={assigneeUserId || ''}
              onChange={(e) => handleAssigneeChange(e.target.value || null)}
              disabled={isAssigning}
            >
              <option value="">{tr('Не назначено', 'Unassigned')}</option>
              {members.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.firstName || m.username || m.id}
                </option>
              ))}
            </select>
          </div>

          {/* Кнопки действий */}
          <div className="task-actions">
            {isRecurring && !taskAvailable && nextAvailableTime ? (
              <div className="task-next-available">
                <span className="next-available-text">{formatTimeUntilNextText()}</span>
              </div>
            ) : (
              <Button
                variant="primary"
                onClick={handleComplete}
                disabled={isCompleting || !taskAvailable}
                loading={isCompleting}
                fullWidth
              >
                {tr('Выполнить', 'Complete')}
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={handleDelete}
              disabled={isDeleting}
              loading={isDeleting}
              fullWidth
            >
              {tr('Удалить', 'Delete')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
