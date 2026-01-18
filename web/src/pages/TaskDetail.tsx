import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Button, Input, Dropdown, DateTimePickerWithPresets, ImportanceSelector, RecurringPresets } from '../components/ui';
import { isTaskAvailable, getNextAvailableDate, formatTimeUntilNext as formatTimeUntilNextUtil } from '../utils/taskAvailability';
import { useLanguage } from '../contexts/LanguageContext';
import './TaskDetail.css';

export default function TaskDetail() {
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const { id } = useParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueAt: '',
    importance: 1,
    assigneeUserId: '',
    isRecurring: false,
    daysOfWeek: [] as number[],
    xp: 0,
  });
  
  const [originalTask, setOriginalTask] = useState<any>(null);

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
        setOriginalTask(foundTask);
        const daysOfWeek = foundTask.recurrencePayload?.daysOfWeek || [];
        setFormData({
          title: foundTask.title || '',
          description: foundTask.description || '',
          dueAt: foundTask.dueAt || '',
          importance: foundTask.difficulty || 1,
          assigneeUserId: foundTask.assigneeUserId || '',
          isRecurring: !!foundTask.recurrenceType && foundTask.recurrenceType !== 'none',
          daysOfWeek: daysOfWeek,
          xp: foundTask.xp || 0,
        });
      }
      setMembers(membersData.members || []);
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert(tr('Название обязательно', 'Title is required'));
      return;
    }

    setIsSaving(true);
    try {
      const taskData: any = {
        title: formData.title.trim(),
        difficulty: formData.importance,
        description: formData.description.trim() || undefined,
        dueAt: formData.dueAt || undefined,
        assigneeUserId: formData.assigneeUserId || undefined,
      };

      if (formData.isRecurring && formData.daysOfWeek.length > 0) {
        taskData.isRecurring = true;
        taskData.daysOfWeek = formData.daysOfWeek;
      }

      await api.updateTask(id!, taskData);
      navigate('/deals');
    } catch (error) {
      console.error('Failed to update task:', error);
      alert(tr('Не удалось обновить задачу', 'Failed to update task'));
    } finally {
      setIsSaving(false);
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

  // Больше не нужно - используются новые компоненты

  const memberOptions = [
    { value: '', label: tr('Не назначено', 'Unassigned') },
    ...members.map((m: any) => ({
      value: m.id,
      label: m.firstName || m.username || m.id,
    })),
  ];

  if (loading) {
    return (
      <div className="task-detail-overlay" onClick={() => navigate('/deals')}>
        <div className="task-detail-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="task-detail" aria-busy="true">
            <div className="task-detail-header">
              <div className="swipe-indicator" />
            </div>
            <div className="loading-content">{tr('Загрузка...', 'Loading...')}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!originalTask) {
    return (
      <div className="task-detail-overlay" onClick={() => navigate('/deals')}>
        <div className="task-detail-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="task-detail">{tr('Задача не найдена', 'Task not found')}</div>
        </div>
      </div>
    );
  }

  const isRecurring = originalTask.recurrenceType && originalTask.recurrenceType !== 'none';
  const taskAvailable = isTaskAvailable(originalTask);
  const nextAvailableTime = getNextAvailableDate(originalTask);
  
  const formatTimeUntilNextText = (): string => {
    return formatTimeUntilNextUtil(originalTask);
  };

  return (
    <div className="task-detail-overlay" onClick={() => navigate('/deals')}>
      <div className="task-detail-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="task-detail">
          <div className="task-detail-header">
            <div className="swipe-indicator" />
          </div>

          <div className="task-detail-content">
            <h2 className="detail-title">{tr('Редактировать задачу', 'Edit Task')}</h2>

            {/* Название */}
            <Input
              label={tr('Название', 'Title') + ' *'}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={tr('Задача', 'Task')}
              fullWidth
            />

            {/* Описание */}
            <div className="form-field">
              <label className="form-label">{tr('Описание', 'Description')}</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={tr('Необязательное описание', 'Optional description')}
                rows={3}
              />
            </div>

            {/* Дедлайн - только для одноразовых задач */}
            {!formData.isRecurring && (
              <DateTimePickerWithPresets
                label={tr('Дедлайн', 'Deadline')}
                value={formData.dueAt}
                onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })}
                fullWidth
              />
            )}

            {/* Важность */}
            <ImportanceSelector
              label={tr('Важность', 'Priority')}
              value={formData.importance}
              onChange={(value) => setFormData({ ...formData, importance: value })}
              fullWidth
            />

            {/* Исполнитель */}
            <Dropdown
              label={tr('Исполнитель', 'Assignee')}
              value={String(formData.assigneeUserId)}
              onChange={(value: string | number) => setFormData({ ...formData, assigneeUserId: String(value) })}
              options={memberOptions}
              fullWidth
            />

            {/* Повторяющаяся задача */}
            <div className="form-field">
              <label className="form-checkbox-label">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                />
                <span>{tr('Повторяющаяся задача', 'Recurring task')}</span>
              </label>
            </div>

            {/* Дни недели */}
            {formData.isRecurring && (
              <RecurringPresets
                label={tr('Дни недели', 'Days of week')}
                selectedDays={formData.daysOfWeek}
                onChange={(days) => setFormData({ ...formData, daysOfWeek: days })}
                fullWidth
              />
            )}

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
                variant="primary"
                onClick={handleSave}
                disabled={isSaving || !formData.title.trim()}
                loading={isSaving}
                fullWidth
              >
                {tr('Сохранить', 'Save')}
              </Button>
              <Button
                variant="danger"
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
    </div>
  );
}
