import { useEffect, useState } from 'react';
import { api } from '../api';
import { useLanguage } from '../contexts/LanguageContext';
import { DateTimePickerWithPresets, ImportanceSelector, RecurringPresets, Dropdown, BottomSheet } from './ui';
import { triggerLightHaptic } from '../utils/haptics';
import './CreateTaskGoalSheet.css';

type CreateType = 'task' | 'goal';

interface CreateTaskGoalSheetProps {
  isOpen: boolean;
  createType: CreateType | null;
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateTaskGoalSheet({
  isOpen,
  createType,
  onClose,
  onCreated,
}: CreateTaskGoalSheetProps) {
  const { tr, locale } = useLanguage();
  const [members, setMembers] = useState<any[]>([]);
  const [currentSpace, setCurrentSpace] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deadlineEnabled, setDeadlineEnabled] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [deadlineHasTime, setDeadlineHasTime] = useState(false);
  const [recurringHasTime, setRecurringHasTime] = useState(false);
  const [recurringTime, setRecurringTime] = useState('23:59');
  const formatLocalDate = (date: Date) => {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    importance: 1,
    goalTargetType: 'unlimited' as 'year' | 'month' | 'unlimited',
    goalTargetYear: new Date().getFullYear(),
    goalTargetMonth: new Date().getMonth() + 1,
    isRecurring: false,
    daysOfWeek: [] as number[],
    assigneeUserId: '',
    assigneeScope: 'space' as 'space' | 'user',
  });

  useEffect(() => {
    if (!isOpen || !createType) return;
    loadOptions();
    resetForm(createType);
  }, [isOpen, createType]);

  const loadOptions = async () => {
    try {
      const [membersData, spaceInfo] = await Promise.all([
        api.getMembers().catch(() => ({ members: [] })),
        api.getCurrentSpace().catch(() => null),
      ]);
      setMembers(membersData.members || []);
      setCurrentSpace(spaceInfo);
    } catch (error) {
      console.error('Failed to load create options:', error);
    }
  };

  const resetForm = (type: CreateType) => {
    setFormData({
      title: '',
      description: '',
      deadline: '',
      importance: 1,
      goalTargetType: 'unlimited',
      goalTargetYear: new Date().getFullYear(),
      goalTargetMonth: new Date().getMonth() + 1,
      isRecurring: false,
      daysOfWeek: [],
      assigneeUserId: '',
      assigneeScope: type === 'task' ? 'space' : 'space',
    });
    setDeadlineEnabled(false);
    setDeadlineDate(formatLocalDate(new Date()));
    setDeadlineTime('23:59');
    setDeadlineHasTime(false);
    setRecurringHasTime(false);
    setRecurringTime('23:59');
  };

  const closeSheet = () => {
    onClose();
  };

  const memberOptions = members.map((m: any) => ({
    value: `user:${m.id}`,
    label: m.firstName || m.username || m.id,
  }));
  const spaceOption = {
    value: 'space',
    label: currentSpace?.name || tr('Дом', 'Home'),
  };
  const assigneeOptions = [spaceOption, ...memberOptions];

  const handleRecurringToggle = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isRecurring: checked,
      daysOfWeek: checked ? prev.daysOfWeek : [],
    }));
    if (checked) {
      setDeadlineEnabled(false);
      setDeadlineHasTime(false);
      setFormData((prev) => ({ ...prev, deadline: '' }));
    } else {
      setRecurringHasTime(false);
    }
  };

  const handleDeadlineToggle = (checked: boolean) => {
    setDeadlineEnabled(checked);
    if (checked) {
      setFormData((prev) => ({ ...prev, isRecurring: false, daysOfWeek: [] }));
      setRecurringHasTime(false);
      setDeadlineHasTime(false);
      if (!deadlineDate) {
        setDeadlineDate(formatLocalDate(new Date()));
      }
    } else {
      setDeadlineHasTime(false);
      setFormData((prev) => ({ ...prev, deadline: '' }));
    }
  };

  const handleDeadlineTimeToggle = (checked: boolean) => {
    if (!deadlineEnabled) return;
    setDeadlineHasTime(checked);
    if (checked && !deadlineDate) {
      setDeadlineDate(formatLocalDate(new Date()));
    }
    if (!checked) {
      setDeadlineTime('23:59');
    }
  };

  const handleRecurringTimeToggle = (checked: boolean) => {
    if (!formData.isRecurring) return;
    setRecurringHasTime(checked);
    if (!checked) {
      setRecurringTime('23:59');
    }
  };

  const handleDeadlineChange = (value: string) => {
    if (deadlineHasTime) {
      const [datePart, timePart] = value.split('T');
      setDeadlineDate(datePart || '');
      setDeadlineTime((timePart || '23:59').slice(0, 5));
    } else {
      setDeadlineDate(value);
    }
  };

  useEffect(() => {
    if (!deadlineEnabled) {
      if (formData.deadline) {
        setFormData((prev) => ({ ...prev, deadline: '' }));
      }
      return;
    }
    if (!deadlineDate) return;
    const timePart = deadlineHasTime ? (deadlineTime || '23:59') : '23:59';
    const nextValue = `${deadlineDate}T${timePart}`;
    if (nextValue !== formData.deadline) {
      setFormData((prev) => ({ ...prev, deadline: nextValue }));
    }
  }, [deadlineEnabled, deadlineDate, deadlineTime, deadlineHasTime, formData.deadline]);

  const handleCreate = async () => {
    if (!createType) return;
    if (!formData.title.trim()) {
      alert(tr('Название обязательно', 'Title is required'));
      return;
    }
    if ((createType === 'task' || createType === 'goal') && formData.assigneeScope === 'user' && !formData.assigneeUserId) {
      alert(tr('Выберите исполнителя', 'Select an assignee'));
      return;
    }

    setIsCreating(true);
    try {
      if (createType === 'goal') {
        await api.createGoal({
          title: formData.title.trim(),
          difficulty: formData.importance,
          description: formData.description.trim() || undefined,
          assigneeScope: formData.assigneeScope,
          assigneeUserId: formData.assigneeScope === 'user' ? formData.assigneeUserId || undefined : undefined,
          targetType: formData.goalTargetType,
          targetYear: formData.goalTargetType !== 'unlimited' ? formData.goalTargetYear : undefined,
          targetMonth: formData.goalTargetType === 'month' ? formData.goalTargetMonth : undefined,
        });
      } else {
        const taskData: any = {
          title: formData.title.trim(),
          difficulty: formData.importance,
          description: formData.description.trim() || undefined,
          dueAt: formData.deadline || undefined,
          assigneeScope: formData.assigneeScope,
          assigneeUserId: formData.assigneeScope === 'user' ? formData.assigneeUserId || undefined : undefined,
        };
        if (formData.isRecurring && formData.daysOfWeek.length > 0) {
          taskData.isRecurring = true;
          taskData.daysOfWeek = formData.daysOfWeek;
          if (recurringHasTime && recurringTime) {
            taskData.timeOfDay = recurringTime;
          }
        }
        await api.createTask(taskData);
        triggerLightHaptic();
      }
      onCreated?.();
      closeSheet();
    } catch (error) {
      console.error('Failed to create:', error);
      alert(tr('Не удалось создать. Попробуйте ещё раз.', 'Failed to create. Please try again.'));
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen || !createType) return null;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={closeSheet}
      showHeader={false}
      className="create-sheet"
      contentClassName="create-modal-content"
      size="high"
    >
      <div className="create-modal">
        <div className="create-modal-title">
          {tr('Создать', 'Create')} {createType === 'goal' ? tr('цель', 'goal') : tr('задачу', 'task')}
        </div>
        <div className="create-form">
              <div className="form-field">
                <label className="form-label">{tr('Название', 'Title')} *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={createType === 'goal' ? tr('Цель', 'Goal') : tr('Задача', 'Task')}
                  autoFocus
                />
              </div>

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

              {createType === 'task' && (
                <>
                  <div className="form-field switch-section">
                    <label className="form-checkbox-label form-switch">
                      <span>{tr('Дедлайн', 'Deadline')}</span>
                      <input
                        type="checkbox"
                        className="form-checkbox form-switch-input"
                        checked={deadlineEnabled}
                        onChange={(e) => handleDeadlineToggle(e.target.checked)}
                      />
                    </label>
                    {deadlineEnabled && (
                      <div className="switch-body">
                        <DateTimePickerWithPresets
                          label={tr('Дата', 'Date')}
                          value={deadlineHasTime ? `${deadlineDate}T${deadlineTime}` : deadlineDate}
                          onChange={(e) => handleDeadlineChange(e.target.value)}
                          fullWidth
                          showTime={deadlineHasTime}
                        />
                      </div>
                    )}
                  </div>

                  {deadlineEnabled && (
                    <>
                      <div className="form-separator" />
                      <div className="form-field switch-section">
                        <label className="form-checkbox-label form-switch">
                          <span>{tr('Время', 'Time')}</span>
                          <input
                            type="checkbox"
                            className="form-checkbox form-switch-input"
                            checked={deadlineHasTime}
                            onChange={(e) => handleDeadlineTimeToggle(e.target.checked)}
                          />
                        </label>
                      </div>
                    </>
                  )}
                </>
              )}

              {createType === 'task' && (
                <ImportanceSelector
                  label={tr('Важность', 'Priority')}
                  value={formData.importance}
                  onChange={(value) => setFormData({ ...formData, importance: value })}
                  fullWidth
                />
              )}

              {createType === 'task' && <div className="form-separator" />}

              {createType === 'goal' && (
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

              {(createType === 'task' || createType === 'goal') && (
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
              )}

              {(createType === 'task' || createType === 'goal') && <div className="form-separator" />}

              {createType === 'task' && (
                <>
                  <div className="form-field">
                    <label className="form-checkbox-label form-switch">
                      <span>{tr('Повторяющаяся задача', 'Recurring task')}</span>
                      <input
                        type="checkbox"
                        className="form-checkbox form-switch-input"
                        checked={formData.isRecurring}
                        onChange={(e) => handleRecurringToggle(e.target.checked)}
                      />
                    </label>
                  </div>

                  {formData.isRecurring && (
                    <RecurringPresets
                      label={tr('Дни недели', 'Days of week')}
                      selectedDays={formData.daysOfWeek}
                      onChange={(days) => setFormData({ ...formData, daysOfWeek: days })}
                      fullWidth
                    />
                  )}

                  {formData.isRecurring && (
                    <>
                      <div className="form-field switch-section">
                        <label className="form-checkbox-label form-switch">
                          <span>{tr('Время', 'Time')}</span>
                          <input
                            type="checkbox"
                            className="form-checkbox form-switch-input"
                            checked={recurringHasTime}
                            onChange={(e) => handleRecurringTimeToggle(e.target.checked)}
                          />
                        </label>
                      </div>
                      {recurringHasTime && (
                        <div className="switch-body">
                          <label className="form-label">{tr('Время', 'Time')}</label>
                          <input
                            type="time"
                            className="form-input"
                            value={recurringTime}
                            onChange={(e) => setRecurringTime(e.target.value)}
                          />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              <div className="form-actions">
                <button className="btn-cancel" onClick={closeSheet} disabled={isCreating}>
                  {tr('Отмена', 'Cancel')}
                </button>
                <button className="btn-create" onClick={handleCreate} disabled={isCreating || !formData.title.trim()}>
                  {isCreating ? tr('Создание...', 'Creating...') : tr('Создать', 'Create')}
                </button>
              </div>
        </div>
      </div>
    </BottomSheet>
  );
}
