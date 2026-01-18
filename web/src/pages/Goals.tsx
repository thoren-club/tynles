import { useEffect, useState } from 'react';
import { api } from '../api';
import { Skeleton } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import './Goals.css';

export default function Goals() {
  const { tr } = useLanguage();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', difficulty: 1, xp: 0 });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await api.getGoals();
      setGoals(data.goals);
    } catch (error) {
      console.error('Failed to load goals:', error);
      alert(tr('Не удалось загрузить цели', 'Failed to load goals'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!newGoal.title.trim()) return;

    try {
      await api.createGoal(newGoal);
      setNewGoal({ title: '', difficulty: 1, xp: 0 });
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
          <div className="form-row">
            <input
              type="number"
              placeholder={tr('Сложность', 'Difficulty')}
              value={newGoal.difficulty}
              onChange={(e) => setNewGoal({ ...newGoal, difficulty: parseInt(e.target.value) || 1 })}
              className="input"
              style={{ width: '100px' }}
            />
            <input
              type="number"
              placeholder="XP"
              value={newGoal.xp}
              onChange={(e) => setNewGoal({ ...newGoal, xp: parseInt(e.target.value) || 0 })}
              className="input"
              style={{ width: '100px' }}
            />
          </div>
          <button className="btn-primary" onClick={handleCreateGoal}>
            {tr('Создать', 'Create')}
          </button>
        </div>
      )}

      <div className="goals-list">
        {goals.length === 0 ? (
          <div className="empty-state">{tr('Пока нет целей', 'No goals yet')}</div>
        ) : (
          goals.map((goal) => (
            <div 
              key={goal.id} 
              className={`goal-card ${goal.isDone ? 'done' : ''}`}
            >
              <div className="goal-content">
                <div className="goal-title">{goal.title}</div>
                <div className="goal-meta">
                  <span>{tr('Сложность', 'Difficulty')}: {goal.difficulty}</span>
                  <span>XP: {goal.xp}</span>
                  {goal.isDone && <span className="done-badge">{tr('Готово', 'Done')}</span>}
                </div>
              </div>
              <div className="goal-actions">
                <button
                  className={`btn-toggle ${goal.isDone ? 'done' : ''}`}
                  onClick={() => handleToggleGoal(goal.id)}
                  title={goal.isDone ? tr('Отменить выполнение', 'Mark as incomplete') : tr('Подтвердить выполнение', 'Mark as complete')}
                >
                  {goal.isDone ? '✓' : '○'}
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteGoal(goal.id)}
                >
                  {tr('Удалить', 'Delete')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
