import { useEffect, useState } from 'react';
import { api } from '../api';
import { Skeleton } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import './Tasks.css';

export default function Tasks() {
  const { tr } = useLanguage();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', difficulty: 1, xp: 0 });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data.tasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      alert(tr('Не удалось загрузить задачи', 'Failed to load tasks'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return;

    try {
      await api.createTask(newTask);
      setNewTask({ title: '', difficulty: 1, xp: 0 });
      setShowCreate(false);
      loadTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert(tr('Не удалось создать задачу', 'Failed to create task'));
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!confirm(tr('Выполнить эту задачу?', 'Complete this task?'))) return;

    try {
      const result = await api.completeTask(taskId) as { xpEarned: number; newLevel: number | null };
      loadTasks();
      alert(
        tr(
          `Задача выполнена! Вы получили ${result.xpEarned} XP${result.newLevel ? ` и достигли уровня ${result.newLevel}!` : '!'}`,
          `Task completed! You earned ${result.xpEarned} XP${result.newLevel ? ` and reached level ${result.newLevel}!` : '!'}`,
        ),
      );
    } catch (error) {
      console.error('Failed to complete task:', error);
      alert(tr('Не удалось выполнить задачу', 'Failed to complete task'));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm(tr('Удалить эту задачу?', 'Delete this task?'))) return;

    try {
      await api.deleteTask(taskId);
      loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  if (loading) {
    return (
      <div className="tasks">
        <div className="tasks-header">
          <Skeleton width={120} height={34} />
          <Skeleton width={88} height={34} radius={10} />
        </div>
        <div className="tasks-list">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="task-card">
              <div className="task-content">
                <Skeleton width="72%" height={18} radius={8} />
                <div className="task-meta">
                  <Skeleton width={120} height={14} radius={8} />
                  <Skeleton width={80} height={14} radius={8} />
                </div>
              </div>
              <div className="task-actions">
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
    <div className="tasks">
      <div className="tasks-header">
        <h1>{tr('Задачи', 'Tasks')}</h1>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? tr('Отмена', 'Cancel') : tr('+ Добавить', '+ Add')}
        </button>
      </div>

      {showCreate && (
        <div className="create-task-form">
          <input
            type="text"
            placeholder={tr('Название задачи', 'Task title')}
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            className="input"
          />
          <div className="form-row">
            <input
              type="number"
              placeholder={tr('Сложность', 'Difficulty')}
              value={newTask.difficulty}
              onChange={(e) => setNewTask({ ...newTask, difficulty: parseInt(e.target.value) || 1 })}
              className="input"
              style={{ width: '100px' }}
            />
            <input
              type="number"
              placeholder="XP"
              value={newTask.xp}
              onChange={(e) => setNewTask({ ...newTask, xp: parseInt(e.target.value) || 0 })}
              className="input"
              style={{ width: '100px' }}
            />
          </div>
          <button className="btn-primary" onClick={handleCreateTask}>
            {tr('Создать', 'Create')}
          </button>
        </div>
      )}

      <div className="tasks-list">
        {tasks.map((task) => (
          <div key={task.id} className="task-card">
            <div className="task-content">
              <div className="task-title">{task.title}</div>
              <div className="task-meta">
                <span>{tr('Сложность', 'Difficulty')}: {task.difficulty}</span>
                <span>XP: {task.xp}</span>
              </div>
            </div>
            <div className="task-actions">
              <button
                className="btn-complete"
                onClick={() => handleCompleteTask(task.id)}
                title={tr('Выполнить', 'Complete')}
              >
                ✓
              </button>
              <button
                className="btn-delete"
                onClick={() => handleDeleteTask(task.id)}
              >
                {tr('Удалить', 'Delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
