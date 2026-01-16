import { useEffect, useState } from 'react';
import { api } from '../api';
import './Goals.css';

export default function Goals() {
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
      alert('Failed to load goals');
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
      alert('Failed to create goal');
    }
  };

  const handleToggleGoal = async (goalId: string) => {
    try {
      const result = await api.toggleGoal(goalId) as { isDone: boolean; xp: number };
      loadGoals();
      if (result.isDone) {
        alert(`Goal completed! You earned ${result.xp} XP!`);
      }
    } catch (error) {
      console.error('Failed to toggle goal:', error);
      alert('Failed to toggle goal');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Delete this goal?')) return;

    try {
      await api.deleteGoal(goalId);
      loadGoals();
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  if (loading) {
    return <div className="goals">Loading...</div>;
  }

  return (
    <div className="goals">
      <div className="goals-header">
        <h1>Goals</h1>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showCreate && (
        <div className="create-goal-form">
          <input
            type="text"
            placeholder="Goal title"
            value={newGoal.title}
            onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
            className="input"
          />
          <div className="form-row">
            <input
              type="number"
              placeholder="Difficulty"
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
            Create
          </button>
        </div>
      )}

      <div className="goals-list">
        {goals.length === 0 ? (
          <div className="empty-state">No goals yet</div>
        ) : (
          goals.map((goal) => (
            <div 
              key={goal.id} 
              className={`goal-card ${goal.isDone ? 'done' : ''}`}
            >
              <div className="goal-content">
                <div className="goal-title">{goal.title}</div>
                <div className="goal-meta">
                  <span>Difficulty: {goal.difficulty}</span>
                  <span>XP: {goal.xp}</span>
                  {goal.isDone && <span className="done-badge">Done</span>}
                </div>
              </div>
              <div className="goal-actions">
                <button
                  className={`btn-toggle ${goal.isDone ? 'done' : ''}`}
                  onClick={() => handleToggleGoal(goal.id)}
                  title={goal.isDone ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {goal.isDone ? '✓' : '○'}
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteGoal(goal.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
