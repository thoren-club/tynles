import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useLanguage } from '../contexts/LanguageContext';
import { DateTimePickerWithPresets, ImportanceSelector, RecurringPresets, Dropdown, BottomSheet, Button } from './ui';
import { triggerLightHaptic } from '../utils/haptics';
import { emitLevelUp } from '../utils/levelUp';
import './CreateTaskGoalSheet.css';

type EditorType = 'task' | 'goal';

interface TaskGoalEditorSheetProps {
  isOpen: boolean;
  type: EditorType | null;
  entityId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

const formatLocalDate = (date: Date) => {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

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

export default function TaskGoalEditorSheet({
  isOpen,
  type,
  entityId,
  onClose,
  onChanged,
}: TaskGoalEditorSheetProps) {
  const { tr, locale } = useLanguage();
  const [members, setMembers] = useState<any[]>([]);
  const [currentSpace, setCurrentSpace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<'none' | 'deadline' | 'recurring'>('none');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [deadlineHasTime, setDeadlineHasTime] = useState(false);
  const [recurringHasTime, setRecurringHasTime] = useState(false);
  const [recurringTime, setRecurringTime] = useState('11:59');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueAt: '',
    importance: 1,
    assigneeUserId: '',
    assigneeScope: 'space' as 'space' | 'user',
    isRecurring: false,
    daysOfWeek: [] as number[],
    goalTargetType: 'unlimited' as 'year' | 'month' | 'unlimited',
    goalTargetYear: new Date().getFullYear(),
    goalTargetMonth: new Date().getMonth() + 1,
  });

  const [initialSnapshot, setInitialSnapshot] = useState('');

  const buildDeadlineIso = (dateValue: string, timeValue: string, hasTime: boolean) => {
    if (!dateValue) return '';
    const timePart = hasTime ? (timeValue || '23:59') : '00:00';
    const localDateTime = `${dateValue}T${timePart}`;
    const parsed = new Date(localDateTime);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString();
  };

  const memberOptions = useMemo(() => members.map((m: any) => ({
    value: `user:${m.id}`,
    label: m.firstName || m.username || m.id,
  })), [members]);

  const spaceOption = useMemo(() => ({
    value: 'space',
    label: currentSpace?.name || tr('Пространство', 'Space'),
  }), [currentSpace?.name, tr]);

  const assigneeOptions = useMemo(() => [spaceOption, ...memberOptions], [spaceOption, memberOptions]);

  const buildSnapshot = () => JSON.stringify({
    type,
    entityId,
    scheduleMode,
    deadlineDate,
    deadlineTime,
    deadlineHasTime,
    recurringHasTime,
    recurringTime,
    formData,
  });

  const isDirty = useMemo(() => initialSnapshot && initialSnapshot !== buildSnapshot(), [initialSnapshot, scheduleMode, deadlineDate, deadlineTime, deadlineHasTime, recurringHasTime, recurringTime, formData, type, entityId]);

  useEffect(() => {
    if (!isOpen || !type || !entityId) return;
    const loadData = async () => {
      setHasLoaded(false);
      setInitialSnapshot('');
      setIsLoading(true);
      try {
        const [membersData, spaceInfo] = await Promise.all([
          api.getMembers().catch(() => ({ members: [] })),
          api.getCurrentSpace().catch(() => null),
        ]);
        setMembers(membersData.members || []);
        setCurrentSpace(spaceInfo);

        if (type === 'task') {
          const tasksData = await api.getTasks();
          const foundTask: any = tasksData.tasks.find((t) => t.id === entityId);
          if (!foundTask) return;
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
            goalTargetType: 'unlimited',
            goalTargetYear: new Date().getFullYear(),
            goalTargetMonth: new Date().getMonth() + 1,
          });
          const parsed = parseDueAtToLocal(foundTask.dueAt, foundTask.dueHasTime);
          const resolvedDueHasTime = typeof foundTask.dueHasTime === 'boolean'
            ? foundTask.dueHasTime
            : parsed.hasTime;
          if (!isRecurringTask && parsed.date) {
            setDeadlineDate(parsed.date);
            setDeadlineTime(parsed.time);
            setDeadlineHasTime(resolvedDueHasTime);
          } else {
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
        } else {
          const goalsData = await api.getGoals();
          const foundGoal: any = goalsData.goals.find((g) => g.id === entityId);
          if (!foundGoal) return;
          setFormData({
            title: foundGoal.title || '',
            description: foundGoal.description || '',
            dueAt: '',
            importance: foundGoal.difficulty || 1,
            assigneeUserId: foundGoal.assigneeUserId || '',
            assigneeScope: foundGoal.assigneeScope === 'space' || !foundGoal.assigneeUserId ? 'space' : 'user',
            isRecurring: false,
            daysOfWeek: [],
            goalTargetType: foundGoal.targetType || 'unlimited',
            goalTargetYear: foundGoal.targetYear || new Date().getFullYear(),
            goalTargetMonth: foundGoal.targetMonth || new Date().getMonth() + 1,
          });
          setScheduleMode('none');
        }
      } catch (error) {
        console.error('Failed to load editor data:', error);
      } finally {
        setIsLoading(false);
        setHasLoaded(true);
      }
    };
    loadData();
  }, [isOpen, type, entityId]);

  useEffect(() => {
    if (!isOpen || isLoading || !hasLoaded || initialSnapshot) return;
    setInitialSnapshot(buildSnapshot());
  }, [isOpen, isLoading, hasLoaded, initialSnapshot]);

  useEffect(() => {
    if (scheduleMode !== 'deadline') {
      setFormData((prev) => ({ ...prev, dueAt: '' }));
      return;
    }
    if (!deadlineDate) return;
    const nextValue = buildDeadlineIso(deadlineDate, deadlineTime, deadlineHasTime);
    if (nextValue && nextValue !== formData.dueAt) {
      setFormData((prev) => ({ ...prev, dueAt: nextValue }));
    }
  }, [scheduleMode, deadlineDate, deadlineTime, deadlineHasTime, formData.dueAt]);

  const handleScheduleModeChange = (mode: 'none' | 'deadline' | 'recurring') => {
    if (mode !== scheduleMode) {
      triggerLightHaptic();
    }
    setScheduleMode(mode);
    if (mode === 'deadline') {
      setFormData((prev) => ({ ...prev, isRecurring: false, daysOfWeek: [] }));
      setRecurringHasTime(false);
      setRecurringTime('11:59');
      if (!deadlineDate) {
        setDeadlineDate(formatLocalDate(new Date()));
      }
      return;
    }
    if (mode === 'recurring') {
      setDeadlineHasTime(false);
      setFormData((prev) => ({ ...prev, dueAt: '', isRecurring: true }));
      return;
    }
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

  const handleSave = async (closeAfter: boolean) => {
    if (!type || !entityId) return;
    if (!formData.title.trim()) {
      alert(tr('Название обязательно', 'Title is required'));
      return;
    }
    setIsSaving(true);
    try {
      const safeAssigneeScope = formData.assigneeUserId ? formData.assigneeScope : 'space';
      if (type === 'task') {
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
        } else {
          taskData.isRecurring = false;
          taskData.daysOfWeek = [];
        }
        await api.updateTask(entityId, taskData);
      } else {
        await api.updateGoal(entityId, {
          title: formData.title.trim(),
          difficulty: formData.importance,
          description: formData.description.trim() || undefined,
          assigneeScope: safeAssigneeScope,
          assigneeUserId: safeAssigneeScope === 'user' ? formData.assigneeUserId || undefined : undefined,
          targetType: formData.goalTargetType,
          targetYear: formData.goalTargetType !== 'unlimited' ? formData.goalTargetYear : undefined,
          targetMonth: formData.goalTargetType === 'month' ? formData.goalTargetMonth : undefined,
        });
      }
      onChanged?.();
      setInitialSnapshot(buildSnapshot());
      if (closeAfter) {
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to save:', error);
      alert(tr('Не удалось сохранить', 'Failed to save'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = async () => {
    if (isSaving) return;
    if (isDirty) {
      await handleSave(true);
      return;
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!type || !entityId) return;
    if (!confirm(tr('Удалить?', 'Delete?'))) return;
    setIsDeleting(true);
    try {
      if (type === 'task') {
        await api.deleteTask(entityId);
      } else {
        await api.deleteGoal(entityId);
      }
      onChanged?.();
      onClose();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert(tr('Не удалось удалить', 'Failed to delete'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleComplete = async () => {
    if (type !== 'task' || !entityId || isCompleting) return;
    triggerLightHaptic();
    setIsCompleting(true);
    try {
      const result = await api.completeTask(entityId);
      const newLevel = (result as any)?.newLevel;
      if (newLevel) {
        emitLevelUp(newLevel);
      }
      if (result && (result as any).isRecurring) {
        await handleSave(false);
      } else {
        onChanged?.();
        onClose();
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
      alert(tr('Не удалось выполнить задачу', 'Failed to complete task'));
    } finally {
      setIsCompleting(false);
    }
  };

  if (!isOpen || !type || !entityId) return null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      showHeader={false}
      className="create-sheet"
      contentClassName="create-modal-content"
      size="high"
    >
      <div className="create-modal">
        <div className="create-modal-title">
          {type === 'goal'
            ? tr('Цель', 'Goal')
            : tr('Задача', 'Task')}
        </div>
        <div className="create-form">
          <div className="form-field">
            <label className="form-label">{tr('Название', 'Title')} *</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={type === 'goal' ? tr('Цель', 'Goal') : tr('Задача', 'Task')}
            />
          </div>

          <Dropdown
            label={tr('Исполнитель', 'Assignee') + ' *'}
            value={
              formData.assigneeScope === 'space' || !formData.assigneeUserId
                ? 'space'
                : `user:${formData.assigneeUserId}`
            }
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

          {type === 'task' && (
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
          )}

          {type === 'task' && (
            <ImportanceSelector
              label={tr('Важность', 'Priority')}
              value={formData.importance}
              onChange={(value) => setFormData({ ...formData, importance: value })}
              fullWidth
            />
          )}

          {type === 'goal' && (
            <ImportanceSelector
              label={tr('Важность', 'Priority')}
              value={formData.importance}
              onChange={(value) => setFormData({ ...formData, importance: value })}
              fullWidth
            />
          )}

          {type === 'goal' && (
            <>
              <Dropdown
                label={tr('Период', 'Period')}
                value={String(formData.goalTargetType)}
                onChange={(value) => setFormData({ ...formData, goalTargetType: value as any })}
                options={[
                  { value: 'unlimited', label: tr('Бессрочно', 'Unlimited') },
                  { value: 'month', label: tr('В течение месяца', 'Within a month') },
                  { value: 'year', label: tr('В течение года', 'Within a year') },
                ]}
                fullWidth
              />
              {formData.goalTargetType === 'month' && (
                <>
                  <Dropdown
                    label={tr('Месяц', 'Month')}
                    value={String(formData.goalTargetMonth)}
                    onChange={(value) => setFormData({ ...formData, goalTargetMonth: Number(value) })}
                    options={Array.from({ length: 12 }, (_, index) => {
                      const date = new Date(formData.goalTargetYear, index, 1);
                      return {
                        value: String(index + 1),
                        label: date.toLocaleString(locale, { month: 'long' }),
                      };
                    })}
                    fullWidth
                  />
                  <Dropdown
                    label={tr('Год', 'Year')}
                    value={String(formData.goalTargetYear)}
                    onChange={(value) => setFormData({ ...formData, goalTargetYear: Number(value) })}
                    options={Array.from({ length: 6 }, (_, index) => {
                      const year = new Date().getFullYear() + index;
                      return { value: String(year), label: String(year) };
                    })}
                    fullWidth
                  />
                </>
              )}
              {formData.goalTargetType === 'year' && (
                <Dropdown
                  label={tr('Год', 'Year')}
                  value={String(formData.goalTargetYear)}
                  onChange={(value) => setFormData({ ...formData, goalTargetYear: Number(value) })}
                  options={Array.from({ length: 6 }, (_, index) => {
                    const year = new Date().getFullYear() + index;
                    return { value: String(year), label: String(year) };
                  })}
                  fullWidth
                />
              )}
            </>
          )}

          <div className="editor-actions">
            {type === 'task' && (
              <Button
                variant="success"
                onClick={handleComplete}
                disabled={isCompleting || isLoading}
                loading={isCompleting}
                fullWidth
              >
                {tr('Выполнить', 'Complete')}
              </Button>
            )}
            {type === 'task' && (
              <Button
                variant="primary"
                onClick={() => handleSave(true)}
                disabled={isSaving || !formData.title.trim()}
                loading={isSaving}
                fullWidth
              >
                {tr('Сохранить', 'Save')}
              </Button>
            )}
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={isDeleting}
              loading={isDeleting}
              fullWidth
            >
              {tr('Удалить', 'Delete')}
            </Button>
            {type === 'goal' && (
              <Button
                variant="primary"
                onClick={() => handleSave(true)}
                disabled={isSaving || !formData.title.trim()}
                loading={isSaving}
                fullWidth
              >
                {tr('Сохранить', 'Save')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
