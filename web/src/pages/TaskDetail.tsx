import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Button, Dropdown, DateTimePickerWithPresets, ImportanceSelector, RecurringPresets } from '../components/ui';
import { isTaskAvailable, getNextAvailableDate, formatTimeUntilNext as formatTimeUntilNextUtil } from '../utils/taskAvailability';
import { useLanguage } from '../contexts/LanguageContext';
import { triggerLightHaptic } from '../utils/haptics';
import { emitLevelUp } from '../utils/levelUp';
import './TaskDetail.css';

export default function TaskDetail() {
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const { id } = useParams<{ id: string }>();

  const parseDueAtToLocal = (value?: string | null, hasTimeOverride?: boolean) => {
    if (!value) return { date: '', time: '23:59', hasTime: false };
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { date: '', time: '23:59', hasTime: false };
    const pad = (num: number) => String(num).padStart(2, '0');
    const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const timePart = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    const hasTime = typeof hasTimeOverride === 'boolean'
      ? hasTimeOverride
      : !(date.getHours() === 0 && date.getMinutes() === 0);
    return { date: datePart, time: timePart, hasTime };
  };

  const formatLocalDate = (date: Date) => {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const buildDeadlineIso = (dateValue: string, timeValue: string, hasTime: boolean) => {
    if (!dateValue) return '';
    const timePart = hasTime ? (timeValue || '23:59') : '00:00';
    const localDateTime = `${dateValue}T${timePart}`;
    const parsed = new Date(localDateTime);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString();
  };
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [currentSpace, setCurrentSpace] = useState<any>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [deadlineEnabled, setDeadlineEnabled] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [deadlineHasTime, setDeadlineHasTime] = useState(false);
  const [recurringHasTime, setRecurringHasTime] = useState(false);
  const [recurringTime, setRecurringTime] = useState('11:59');
  const [scheduleMode, setScheduleMode] = useState<'none' | 'deadline' | 'recurring'>('none');
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueAt: '',
    importance: 1,
    assigneeUserId: '',
    assigneeScope: 'space' as 'space' | 'user',
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

  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg?.BackButton) return;

    let tracking = false;
    let startX = 0;
    let startY = 0;
    const edgeThreshold = 24;
    const swipeThreshold = 80;
    const maxVerticalDrift = 50;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch || touch.clientX > edgeThreshold) return;
      tracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      const touch = e.touches[0];
      if (!touch) return;
      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);
      if (deltaX > swipeThreshold && deltaY < maxVerticalDrift) {
        tracking = false;
        navigate(-1);
      }
    };

    const handleTouchEnd = () => {
      tracking = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigate]);

  const loadTask = async () => {
    try {
      const [tasksData, membersData, spaceInfo] = await Promise.all([
        api.getTasks(),
        api.getMembers().catch(() => ({ members: [] })),
        api.getCurrentSpace().catch(() => null),
      ]);
      
      const foundTask = tasksData.tasks.find((t: any) => t.id === id);
      if (foundTask) {
        setOriginalTask(foundTask);
        const daysOfWeek = foundTask.recurrencePayload?.daysOfWeek || [];
        const recurrenceTimeOfDay = foundTask.recurrencePayload?.timeOfDay;
        const isRecurringTask = !!foundTask.recurrenceType && foundTask.recurrenceType !== 'none';
        setFormData({
          title: foundTask.title || '',
          description: foundTask.description || '',
          dueAt: isRecurringTask ? '' : foundTask.dueAt || '',
          importance: foundTask.difficulty || 1,
          assigneeUserId: foundTask.assigneeUserId || '',
          assigneeScope: foundTask.assigneeScope === 'space' || !foundTask.assigneeUserId ? 'space' : 'user',
          isRecurring: isRecurringTask,
          daysOfWeek: daysOfWeek,
          xp: foundTask.xp || 0,
        });
        const parsed = parseDueAtToLocal(foundTask.dueAt, foundTask.dueHasTime);
        const resolvedDueHasTime = typeof foundTask.dueHasTime === 'boolean'
          ? foundTask.dueHasTime
          : parsed.hasTime;
        if (!isRecurringTask && parsed.date) {
          setDeadlineEnabled(true);
          setDeadlineDate(parsed.date);
          setDeadlineTime(parsed.time);
          setDeadlineHasTime(resolvedDueHasTime);
        } else {
          setDeadlineEnabled(false);
          setDeadlineDate('');
            setDeadlineTime('23:59');
          setDeadlineHasTime(false);
        }
          if (recurrenceTimeOfDay) {
            setRecurringHasTime(true);
            setRecurringTime(String(recurrenceTimeOfDay).slice(0, 5));
          } else {
            setRecurringHasTime(false);
            setRecurringTime('11:59');
          }
        if (isRecurringTask) {
          setScheduleMode('recurring');
        } else if (parsed.date) {
          setScheduleMode('deadline');
        } else {
          setScheduleMode('none');
        }
      }
      setMembers(membersData.members || []);
      setCurrentSpace(spaceInfo);
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
      const safeAssigneeScope = formData.assigneeUserId ? formData.assigneeScope : 'space';
      const taskData: any = {
        title: formData.title.trim(),
        difficulty: formData.importance,
        description: formData.description.trim() || undefined,
        dueAt: scheduleMode === 'deadline' ? formData.dueAt || undefined : undefined,
        dueHasTime: scheduleMode === 'deadline' ? deadlineHasTime : undefined,
        assigneeUserId: safeAssigneeScope === 'user' ? formData.assigneeUserId || undefined : undefined,
        assigneeScope: safeAssigneeScope,
      };

      if (scheduleMode === 'recurring' && formData.daysOfWeek.length > 0) {
        taskData.isRecurring = true;
        taskData.daysOfWeek = formData.daysOfWeek;
        if (recurringHasTime && recurringTime) {
          taskData.timeOfDay = recurringTime;
        }
      }

      await api.updateTask(id!, taskData);
      navigate('/deals');
    } catch (error: any) {
      console.error('Failed to update task:', error);
      alert(
        error?.message
          ? `${tr('Не удалось обновить задачу', 'Failed to update task')}: ${error.message}`
          : tr('Не удалось обновить задачу', 'Failed to update task'),
      );
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
      const newLevel = (result as any)?.newLevel;
      if (newLevel) {
        emitLevelUp(newLevel);
      }
      if (result && (result as any).isRecurring) {
        await loadTask();
      } else {
        navigate('/deals');
      }
    } catch (error: any) {
      console.error('Failed to complete task:', error);
      alert(
        error?.message
          ? `${tr('Не удалось выполнить задачу', 'Failed to complete task')}: ${error.message}`
          : tr('Не удалось выполнить задачу', 'Failed to complete task'),
      );
    } finally {
      setIsCompleting(false);
    }
  };

  const handleQuickComplete = async () => {
    if (isCompleting) return;
    triggerLightHaptic();
    setIsCompleting(true);
    try {
      const result = await api.completeTask(id!);
      const newLevel = (result as any)?.newLevel;
      if (newLevel) {
        emitLevelUp(newLevel);
      }
      navigate('/deals');
    } catch (error: any) {
      console.error('Failed to complete task:', error);
      alert(
        error?.message
          ? `${tr('Не удалось выполнить задачу', 'Failed to complete task')}: ${error.message}`
          : tr('Не удалось выполнить задачу', 'Failed to complete task'),
      );
    } finally {
      setIsCompleting(false);
    }
  };

  // Больше не нужно - используются новые компоненты

  const memberOptions = members.map((m: any) => ({
    value: `user:${m.id}`,
    label: m.firstName || m.username || m.id,
  }));

  const spaceOption = {
    value: 'space',
    label: currentSpace?.name || tr('Пространство', 'Space'),
  };

  const handleScheduleModeChange = (mode: 'none' | 'deadline' | 'recurring') => {
    if (mode !== scheduleMode) {
      triggerLightHaptic();
    }
    setScheduleMode(mode);
    if (mode === 'deadline') {
      setDeadlineEnabled(true);
      setFormData((prev) => ({ ...prev, isRecurring: false, daysOfWeek: [] }));
      setRecurringHasTime(false);
      setRecurringTime('23:59');
      if (!deadlineDate) {
        setDeadlineDate(formatLocalDate(new Date()));
      }
      return;
    }
    if (mode === 'recurring') {
      setDeadlineEnabled(false);
      setDeadlineHasTime(false);
      setFormData((prev) => ({ ...prev, dueAt: '', isRecurring: true }));
      return;
    }
    setDeadlineEnabled(false);
    setDeadlineHasTime(false);
    setFormData((prev) => ({ ...prev, dueAt: '', isRecurring: false, daysOfWeek: [] }));
    setRecurringHasTime(false);
    setRecurringTime('11:59');
  };

  const handleDeadlineTimeToggle = (checked: boolean) => {
    if (scheduleMode !== 'deadline') return;
    setDeadlineHasTime(checked);
    if (checked && !deadlineDate) {
      setDeadlineDate(formatLocalDate(new Date()));
    }
    if (!checked) {
      setDeadlineTime('23:59');
    }
  };

  const handleRecurringTimeToggle = (checked: boolean) => {
    if (scheduleMode !== 'recurring') return;
    setRecurringHasTime(checked);
    if (!checked) {
      setRecurringTime('11:59');
    }
  };

  const handleDeadlineChange = (value: string) => {
    if (deadlineHasTime) {
      const [datePart] = value.split('T');
      setDeadlineDate(datePart || '');
    } else {
      setDeadlineDate(value);
    }
  };

  useEffect(() => {
    if (!deadlineEnabled) {
      if (formData.dueAt) {
        setFormData((prev) => ({ ...prev, dueAt: '' }));
      }
      return;
    }

    if (!deadlineDate) return;
    const nextValue = buildDeadlineIso(deadlineDate, deadlineTime, deadlineHasTime);
    if (nextValue && nextValue !== formData.dueAt) {
      setFormData((prev) => ({ ...prev, dueAt: nextValue }));
    }
  }, [deadlineEnabled, deadlineDate, deadlineTime, deadlineHasTime, formData.dueAt]);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  const assigneeValue =
    formData.assigneeScope === 'space' || !formData.assigneeUserId
      ? 'space'
      : `user:${formData.assigneeUserId}`;
  const assigneeOptions = [spaceOption, ...memberOptions];

  if (loading) {
    return (
      <div className="task-detail-page">
        <div className="task-detail" aria-busy="true">
          <div className="loading-content">{tr('Загрузка...', 'Loading...')}</div>
        </div>
      </div>
    );
  }

  if (!originalTask) {
    return (
      <div className="task-detail-page">
        <div className="task-detail">{tr('Задача не найдена', 'Task not found')}</div>
      </div>
    );
  }

  const isRecurring = originalTask.recurrenceType && originalTask.recurrenceType !== 'none';
  const taskAvailable = isTaskAvailable(originalTask, currentSpace?.timezone);
  const nextAvailableTime = getNextAvailableDate(originalTask);
  
  const formatTimeUntilNextText = (): string => {
    return formatTimeUntilNextUtil(originalTask, currentSpace?.timezone);
  };

  return (
    <div className="task-detail-page">
      <div className="task-detail">
        <div className="task-detail-content">
          <div className="detail-title-row">
              <button
                type="button"
                className="task-toggle detail-title-toggle"
                onClick={(event) => {
                  event.stopPropagation();
                  handleQuickComplete();
                }}
                disabled={isCompleting}
                role="checkbox"
                aria-checked="false"
              />
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  className="detail-title-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setIsEditingTitle(false);
                    }
                  }}
                  placeholder={tr('Задача', 'Task')}
                />
              ) : (
                <button
                  type="button"
                  className="detail-title-button"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {formData.title || tr('Задача', 'Task')}
                </button>
              )}
            </div>

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

            {/* Сроки / повтор */}
            <div className="detail-block">
              <div className="detail-block-title">{tr('Сроки', 'Schedule')}</div>
              <div className="schedule-tabs">
                <button
                  type="button"
                  className={`schedule-tab${scheduleMode === 'deadline' ? ' active' : ''}`}
                  onClick={() => handleScheduleModeChange('deadline')}
                >
                  {tr('Дедлайн', 'Deadline')}
                </button>
                <button
                  type="button"
                  className={`schedule-tab${scheduleMode === 'recurring' ? ' active' : ''}`}
                  onClick={() => handleScheduleModeChange('recurring')}
                >
                  {tr('Повтор', 'Recurring')}
                </button>
                <button
                  type="button"
                  className={`schedule-tab${scheduleMode === 'none' ? ' active' : ''}`}
                  onClick={() => handleScheduleModeChange('none')}
                >
                  {tr('Без срока', 'No deadline')}
                </button>
              </div>

              {scheduleMode === 'deadline' && (
                <div className="schedule-panel">
                  <DateTimePickerWithPresets
                    label={tr('Дата', 'Date')}
                    value={deadlineDate}
                    onChange={(e) => handleDeadlineChange(e.target.value)}
                    fullWidth
                    showTime={false}
                  />
                  <div className="deadline-time-row">
                    <span className="deadline-time-label">{tr('Время', 'Time')}</span>
                    <label className="form-checkbox-label form-switch">
                      <input
                        type="checkbox"
                        className="form-checkbox form-switch-input"
                        checked={deadlineHasTime}
                        onChange={(e) => handleDeadlineTimeToggle(e.target.checked)}
                      />
                    </label>
                  </div>
                  {deadlineHasTime && (
                    <input
                      type="time"
                      className="form-input"
                      value={deadlineTime}
                      onChange={(e) => setDeadlineTime(e.target.value)}
                    />
                  )}
                </div>
              )}

              {scheduleMode === 'recurring' && (
                <div className="schedule-panel">
                  <RecurringPresets
                    label={tr('Дни недели', 'Days of week')}
                    selectedDays={formData.daysOfWeek}
                    onChange={(days) => setFormData({ ...formData, daysOfWeek: days })}
                    fullWidth
                  />

                  <div className="deadline-time-row">
                    <span className="deadline-time-label">{tr('Время', 'Time')}</span>
                    <label className="form-checkbox-label form-switch">
                      <input
                        type="checkbox"
                        className="form-checkbox form-switch-input"
                        checked={recurringHasTime}
                        onChange={(e) => handleRecurringTimeToggle(e.target.checked)}
                      />
                    </label>
                  </div>

                  {recurringHasTime && (
                    <input
                      type="time"
                      className="form-input"
                      value={recurringTime}
                      onChange={(e) => setRecurringTime(e.target.value)}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Важность */}
            <div className="detail-block">
              <div className="detail-block-title">{tr('Важность', 'Priority')}</div>
              <ImportanceSelector
                value={formData.importance}
                onChange={(value) => setFormData({ ...formData, importance: value })}
                fullWidth
              />
            </div>

            {/* Исполнитель */}
            <Dropdown
              label={tr('Исполнитель', 'Assignee')}
              value={assigneeValue}
              onChange={(value: string | number) => {
                const nextValue = String(value);
                if (nextValue === 'space') {
                  setFormData({ ...formData, assigneeScope: 'space', assigneeUserId: '' });
                  return;
                }
                const userId = nextValue.replace('user:', '');
                setFormData({ ...formData, assigneeScope: 'user', assigneeUserId: userId });
              }}
              options={assigneeOptions}
              fullWidth
            />
            {/* Кнопки действий */}
            <div className="task-actions">
              {isRecurring && !taskAvailable && nextAvailableTime ? (
                <div className="task-next-available">
                  <span className="next-available-text">{formatTimeUntilNextText()}</span>
                </div>
              ) : (
                <Button
                  variant="success"
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
  );
}
