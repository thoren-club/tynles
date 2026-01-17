import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Button } from '../components/ui';
import './TaskDetail.css';

export default function TaskDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadTask();
    }
  }, [id]);

  const loadTask = async () => {
    try {
      const tasksData = await api.getTasks();
      const foundTask = tasksData.tasks.find((t: any) => t.id === id);
      if (foundTask) {
        setTask(foundTask);
      }
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить задачу?')) return;
    
    setIsDeleting(true);
    try {
      await api.deleteTask(id!);
      navigate('/deals');
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Не удалось удалить задачу');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm('Выполнить задачу?')) return;
    
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
      alert('Не удалось выполнить задачу');
    } finally {
      setIsCompleting(false);
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
    
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Завтра';
    if (diffDays === -1) return 'Вчера';
    if (diffDays < 0) return 'Просрочено';
    
    return deadline.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  // Получаем текст важности по difficulty
  const getImportanceText = (difficulty: number): string => {
    const importanceMap: { [key: number]: string } = {
      1: 'Низкая',
      2: 'Средняя',
      3: 'Высокая',
      4: 'Критическая',
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
        return 'Одноразовая';
      case 'daily':
        return 'Ежедневная';
      case 'weekly': {
        const daysOfWeek = task.recurrencePayload?.daysOfWeek || [];
        if (daysOfWeek.length === 0) {
          return 'Еженедельная';
        }
        return `Еженедельная (${daysOfWeek.length} дней)`;
      }
      default:
        return 'Одноразовая';
    }
  };

  // Проверяем, является ли задача повторяющейся и была ли выполнена недавно
  const isRecurring = task.recurrenceType && task.recurrenceType !== 'none';
  const lastCompletedAt = task.updatedAt ? new Date(task.updatedAt) : null;
  const now = new Date();
  
  // Определяем, доступна ли задача для выполнения
  const getNextAvailableTime = (): Date | null => {
    if (!isRecurring || !lastCompletedAt) return null;
    
    const taskType = getTaskType(task);
    
    if (taskType === 'daily') {
      // Ежедневная задача - доступна через 24 часа после выполнения
      const nextAvailable = new Date(lastCompletedAt);
      nextAvailable.setHours(nextAvailable.getHours() + 24);
      return nextAvailable;
    } else if (taskType === 'weekly') {
      // Еженедельная задача - находим следующий доступный день недели
      const daysOfWeek = task.recurrencePayload?.daysOfWeek || [];
      if (daysOfWeek.length === 0) return null;
      
      const currentDay = now.getDay(); // 0 = воскресенье, 1 = понедельник, ...
      const nextDay = daysOfWeek.find((day: number) => day > currentDay) || daysOfWeek[0];
      
      const nextAvailable = new Date(now);
      if (nextDay > currentDay) {
        nextAvailable.setDate(nextAvailable.getDate() + (nextDay - currentDay));
      } else {
        // Следующий день на следующей неделе
        nextAvailable.setDate(nextAvailable.getDate() + (7 - currentDay + nextDay));
      }
      nextAvailable.setHours(0, 0, 0, 0);
      return nextAvailable;
    }
    
    return null;
  };

  const nextAvailableTime = getNextAvailableTime();
  const isTaskAvailable = !nextAvailableTime || now >= nextAvailableTime;
  
  // Форматируем время до следующего выполнения
  const formatTimeUntilNext = (): string => {
    if (!nextAvailableTime) return '';
    
    const diffMs = nextAvailableTime.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `Доступна через ${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'}`;
    } else if (diffHours > 0) {
      return `Доступна через ${diffHours} ${diffHours === 1 ? 'час' : diffHours < 5 ? 'часа' : 'часов'}`;
    } else if (diffMinutes > 0) {
      return `Доступна через ${diffMinutes} ${diffMinutes === 1 ? 'минуту' : diffMinutes < 5 ? 'минуты' : 'минут'}`;
    } else {
      return 'Доступна сейчас';
    }
  };

  if (loading) {
    return (
      <div className="task-detail-overlay" onClick={() => navigate('/deals')}>
        <div className="task-detail-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="task-detail">Loading...</div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="task-detail-overlay" onClick={() => navigate('/deals')}>
        <div className="task-detail-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="task-detail">Задача не найдена</div>
        </div>
      </div>
    );
  }

  const importance = getImportanceText(task.difficulty || 1);
  const importanceClass = getImportanceClass(task.difficulty || 1);
  const taskType = getTaskTypeText(task);
  const deadlineText = formatDeadline(task.dueAt);

  // Проверяем, является ли задача повторяющейся и была ли выполнена недавно
  const isRecurring = task.recurrenceType && task.recurrenceType !== 'none';
  const lastCompletedAt = task.updatedAt ? new Date(task.updatedAt) : null;
  const now = new Date();
  
  // Определяем, доступна ли задача для выполнения
  const getNextAvailableTime = (): Date | null => {
    if (!isRecurring || !lastCompletedAt) return null;
    
    const taskTypeEnum = getTaskType(task);
    
    if (taskTypeEnum === 'daily') {
      // Ежедневная задача - доступна через 24 часа после выполнения
      const nextAvailable = new Date(lastCompletedAt);
      nextAvailable.setHours(nextAvailable.getHours() + 24);
      return nextAvailable;
    } else if (taskTypeEnum === 'weekly') {
      // Еженедельная задача - находим следующий доступный день недели
      const daysOfWeek = task.recurrencePayload?.daysOfWeek || [];
      if (daysOfWeek.length === 0) return null;
      
      const currentDay = now.getDay(); // 0 = воскресенье, 1 = понедельник, ...
      const nextDay = daysOfWeek.find((day: number) => day > currentDay) || daysOfWeek[0];
      
      const nextAvailable = new Date(now);
      if (nextDay > currentDay) {
        nextAvailable.setDate(nextAvailable.getDate() + (nextDay - currentDay));
      } else {
        // Следующий день на следующей неделе
        nextAvailable.setDate(nextAvailable.getDate() + (7 - currentDay + nextDay));
      }
      nextAvailable.setHours(0, 0, 0, 0);
      return nextAvailable;
    }
    
    return null;
  };

  const nextAvailableTime = getNextAvailableTime();
  const isTaskAvailable = !nextAvailableTime || now >= nextAvailableTime;
  
  // Форматируем время до следующего выполнения
  const formatTimeUntilNext = (): string => {
    if (!nextAvailableTime) return '';
    
    const diffMs = nextAvailableTime.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `Доступна через ${diffDays} ${diffDays === 1 ? 'день' : diffDays < 5 ? 'дня' : 'дней'}`;
    } else if (diffHours > 0) {
      return `Доступна через ${diffHours} ${diffHours === 1 ? 'час' : diffHours < 5 ? 'часа' : 'часов'}`;
    } else if (diffMinutes > 0) {
      return `Доступна через ${diffMinutes} ${diffMinutes === 1 ? 'минуту' : diffMinutes < 5 ? 'минуты' : 'минут'}`;
    } else {
      return 'Доступна сейчас';
    }
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
            <label className="task-label">Название</label>
            <div className="task-value">{task.title}</div>
          </div>

          {/* Описание */}
          {(task as any).description && (
            <div className="task-field">
              <label className="task-label">Описание</label>
              <div className="task-value">{(task as any).description}</div>
            </div>
          )}

          {/* Дедлайн */}
          {deadlineText && (
            <div className="task-field">
              <label className="task-label">Дедлайн</label>
              <div className={`task-value ${deadlineText === 'Просрочено' || deadlineText === 'Вчера' ? 'overdue' : ''}`}>
                {deadlineText}
              </div>
            </div>
          )}

          {/* Важность */}
          <div className="task-field">
            <label className="task-label">Важность</label>
            <div className={`task-value task-importance ${importanceClass}`}>
              {importance}
            </div>
          </div>

          {/* Тип */}
          <div className="task-field">
            <label className="task-label">Тип</label>
            <div className="task-value">{taskType}</div>
          </div>

          {/* XP */}
          {task.xp > 0 && (
            <div className="task-field">
              <label className="task-label">Опыт</label>
              <div className="task-value task-xp">+{task.xp} XP</div>
            </div>
          )}

          {/* Кнопки действий */}
          <div className="task-actions">
            {isRecurring && !isTaskAvailable ? (
              <div className="task-next-available">
                <span className="next-available-text">{formatTimeUntilNext()}</span>
              </div>
            ) : (
              <Button
                variant="primary"
                onClick={handleComplete}
                disabled={isCompleting || !isTaskAvailable}
                loading={isCompleting}
                fullWidth
              >
                Выполнить
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={handleDelete}
              disabled={isDeleting}
              loading={isDeleting}
              fullWidth
            >
              Удалить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
