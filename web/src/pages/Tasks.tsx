import { useEffect, useState } from 'react';
import { api } from '../api';
import './Tasks.css';

export default function Tasks() {
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
      alert('Failed to create task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;

    try {
      await api.deleteTask(taskId);
      loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  if (loading) {
    return <div className="tasks">Loading...</div>;
  }

  return (
    <div className="tasks">
      <div className="tasks-header">
        <h1>Tasks</h1>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showCreate && (
        <div className="create-task-form">
          <input
            type="text"
            placeholder="Task title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            className="input"
          />
          <div className="form-row">
            <input
              type="number"
              placeholder="Difficulty"
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
            Create
          </button>
        </div>
      )}

      <div className="tasks-list">
        {tasks.length === 0 ? (
          <div className="empty-state">No tasks yet</div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="task-card">
              <div className="task-content">
                <div className="task-title">{task.title}</div>
                <div className="task-meta">
                  <span>Difficulty: {task.difficulty}</span>
                  <span>XP: {task.xp}</span>
                </div>
              </div>
              <button
                className="btn-delete"
                onClick={() => handleDeleteTask(task.id)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
