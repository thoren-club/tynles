import { useEffect, useState } from 'react';
import { api } from '../api';
import { Dropdown, Skeleton } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import TaskListItem from '../components/TaskListItem';
import { getGoalTimeframeLabel } from '../utils/goalTimeframe';
import './Goals.css';

export default function Goals() {
  const { tr, locale } = useLanguage();
  const [goals, setGoals] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [currentSpace, setCurrentSpace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    assigneeScope: 'space' as 'space' | 'user',
    assigneeUserId: '',
    targetType: 'unlimited' as 'year' | 'month' | 'unlimited',
    targetYear: new Date().getFullYear(),
    targetMonth: new Date().getMonth() + 1,
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const [data, membersData, spaceInfo] = await Promise.all([
        api.getGoals(),
        api.getMembers().catch(() => ({ members: [] })),
        api.getCurrentSpace().catch(() => null),
      ]);
      setGoals(data.goals);
      setMembers(membersData.members || []);
      setCurrentSpace(spaceInfo);
    } catch (error) {
      console.error('Failed to load goals:', error);
      alert(tr('Не удалось загрузить цели', 'Failed to load goals'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!newGoal.title.trim()) return;

    if (newGoal.assigneeScope === 'user' && !newGoal.assigneeUserId) {
      alert(tr('Выберите исполнителя', 'Select an assignee'));
      return;
    }

    try {
      await api.createGoal({
        title: newGoal.title.trim(),
        assigneeScope: newGoal.assigneeScope,
        assigneeUserId: newGoal.assigneeScope === 'user' ? newGoal.assigneeUserId : undefined,
        targetType: newGoal.targetType,
        targetYear: newGoal.targetType !== 'unlimited' ? newGoal.targetYear : undefined,
        targetMonth: newGoal.targetType === 'month' ? newGoal.targetMonth : undefined,
      });
      setNewGoal({
        title: '',
        assigneeScope: 'space',
        assigneeUserId: '',
        targetType: 'unlimited',
        targetYear: new Date().getFullYear(),
        targetMonth: new Date().getMonth() + 1,
      });
      setShowCreate(false);
      loadGoals();
    } catch (error) {
      console.error('Failed to create goal:', error);
      alert(tr('Не удалось создать цель', 'Failed to create goal'));
    }
  };

  const handleToggleGoal = async (goalId: string) => {
    try {
      const result = await api.toggleGoal(goalId) as { isDone: boolean; xp: number };
      loadGoals();
      if (result.isDone) {
        alert(
          tr(
            `Цель выполнена! Вы получили ${result.xp} XP!`,
            `Goal completed! You earned ${result.xp} XP!`,
          ),
        );
      }
    } catch (error) {
      console.error('Failed to toggle goal:', error);
      alert(tr('Не удалось изменить статус цели', 'Failed to toggle goal'));
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm(tr('Удалить эту цель?', 'Delete this goal?'))) return;

    try {
      await api.deleteGoal(goalId);
      loadGoals();
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  if (loading) {
    return (
      <div className="goals">
        <div className="goals-header">
          <Skeleton width={120} height={34} />
          <Skeleton width={88} height={34} radius={10} />
        </div>
        <div className="goals-list">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="goal-card">
              <div className="goal-content">
                <Skeleton width="64%" height={18} radius={8} />
                <div className="goal-meta">
                  <Skeleton width={120} height={14} radius={8} />
                  <Skeleton width={80} height={14} radius={8} />
                  <Skeleton width={52} height={14} radius={999} />
                </div>
              </div>
              <div className="goal-actions">
                <Skeleton width={34} height={34} radius={10} />
                <Skeleton width={64} height={34} radius={10} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const assigneeOptions = [
    { value: 'space', label: currentSpace?.name || tr('Пространство', 'Space') },
    ...members.map((m: any) => ({
      value: `user:${m.id}`,
      label: m.firstName || m.username || m.id,
    })),
  ];
  const assigneeValue =
    newGoal.assigneeScope === 'space' || !newGoal.assigneeUserId
      ? 'space'
      : `user:${newGoal.assigneeUserId}`;

  return (
    <div className="goals">
      <div className="goals-header">
        <h1>{tr('Цели', 'Goals')}</h1>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? tr('Отмена', 'Cancel') : tr('+ Добавить', '+ Add')}
        </button>
      </div>

      {showCreate && (
        <div className="create-goal-form">
          <input
            type="text"
            placeholder={tr('Название цели', 'Goal title')}
            value={newGoal.title}
            onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
            className="input"
          />
          <Dropdown
            label={tr('Исполнитель', 'Assignee') + ' *'}
            value={assigneeValue}
            onChange={(value: string | number) => {
              const nextValue = String(value);
              if (nextValue === 'space') {
                setNewGoal({ ...newGoal, assigneeScope: 'space', assigneeUserId: '' });
                return;
              }
              const userId = nextValue.replace('user:', '');
              setNewGoal({ ...newGoal, assigneeScope: 'user', assigneeUserId: userId });
            }}
            options={assigneeOptions}
            fullWidth
          />
          <Dropdown
            label={tr('Период', 'Period')}
            value={String(newGoal.targetType)}
            onChange={(value) => setNewGoal({ ...newGoal, targetType: value as any })}
            options={[
              { value: 'unlimited', label: tr('Бессрочно', 'Unlimited') },
              { value: 'month', label: tr('В течение месяца', 'Within a month') },
              { value: 'year', label: tr('В течение года', 'Within a year') },
            ]}
            fullWidth
          />
          {newGoal.targetType === 'month' && (
            <>
              <Dropdown
                label={tr('Месяц', 'Month')}
                value={String(newGoal.targetMonth)}
                onChange={(value) => setNewGoal({ ...newGoal, targetMonth: Number(value) })}
                options={Array.from({ length: 12 }, (_, index) => {
                  const date = new Date(newGoal.targetYear, index, 1);
                  return {
                    value: String(index + 1),
                    label: date.toLocaleString(locale, { month: 'long' }),
                  };
                })}
                fullWidth
              />
              <Dropdown
                label={tr('Год', 'Year')}
                value={String(newGoal.targetYear)}
                onChange={(value) => setNewGoal({ ...newGoal, targetYear: Number(value) })}
                options={Array.from({ length: 6 }, (_, index) => {
                  const year = new Date().getFullYear() + index;
                  return { value: String(year), label: String(year) };
                })}
                fullWidth
              />
            </>
          )}
          {newGoal.targetType === 'year' && (
            <Dropdown
              label={tr('Год', 'Year')}
              value={String(newGoal.targetYear)}
              onChange={(value) => setNewGoal({ ...newGoal, targetYear: Number(value) })}
              options={Array.from({ length: 6 }, (_, index) => {
                const year = new Date().getFullYear() + index;
                return { value: String(year), label: String(year) };
              })}
              fullWidth
            />
          )}
          <button className="btn-primary" onClick={handleCreateGoal}>
            {tr('Создать', 'Create')}
          </button>
        </div>
      )}

      <div className="goals-list">
        {goals.length === 0 ? (
          <div className="empty-state">{tr('Пока нет целей', 'No goals yet')}</div>
        ) : (
          goals.map((goal) => {
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
              <div key={goal.id} className="goal-row">
                <TaskListItem
                  title={goal.title}
                  assignee={goalAssignee}
                  isChecked={goal.isDone}
                  isDisabled={false}
                  isDimmed={goal.isDone}
                  onToggle={() => handleToggleGoal(goal.id)}
                  dateLabel={timeframeLabel}
                  showCalendarIcon={false}
                />
                <button className="btn-delete" onClick={() => handleDeleteGoal(goal.id)}>
                  {tr('Удалить', 'Delete')}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
