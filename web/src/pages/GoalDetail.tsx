import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Button, Skeleton } from '../components/ui';
import './GoalDetail.css';

export default function GoalDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [goal, setGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadGoal();
    }
  }, [id]);

  const loadGoal = async () => {
    try {
      const goals = await api.getGoals();
      const foundGoal = goals.goals.find((g: any) => g.id === id);
      if (foundGoal) {
        setGoal(foundGoal);
      }
    } catch (error) {
      console.error('Failed to load goal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить цель?')) return;
    
    setIsDeleting(true);
    try {
      await api.deleteGoal(id!);
      navigate('/deals');
    } catch (error) {
      console.error('Failed to delete goal:', error);
      alert('Не удалось удалить цель');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await api.toggleGoal(id!);
      await loadGoal();
    } catch (error) {
      console.error('Failed to toggle goal:', error);
      alert('Не удалось изменить статус цели');
    } finally {
      setIsCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="goal-detail-overlay" onClick={() => navigate('/deals')}>
        <div className="goal-detail-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="goal-detail" aria-busy="true">
            <div className="goal-detail-header">
              <div className="swipe-indicator" />
            </div>

            <div className="goal-field">
              <Skeleton width={90} height={12} radius={8} />
              <Skeleton width="78%" height={18} radius={10} />
            </div>

            <div className="goal-field">
              <Skeleton width={70} height={12} radius={8} />
              <Skeleton width="92%" height={44} radius={12} />
            </div>

            <div className="goal-actions">
              <Skeleton width="100%" height={44} radius={12} />
              <Skeleton width="100%" height={44} radius={12} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="goal-detail-overlay" onClick={() => navigate('/deals')}>
        <div className="goal-detail-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="goal-detail">Цель не найдена</div>
        </div>
      </div>
    );
  }

  const importanceOptions = [
    'Низкая',
    'Средняя',
    'Высокая',
    'Критическая',
  ];

  const importance = importanceOptions[goal.difficulty - 1] || importanceOptions[0];

  return (
    <div className="goal-detail-overlay" onClick={() => navigate('/deals')}>
      <div className="goal-detail-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="goal-detail">
          {/* Хедер с возможностью свайпа */}
          <div className="goal-detail-header">
            <div className="swipe-indicator" />
          </div>

          {/* Название */}
          <div className="goal-field">
            <label className="goal-label">Название</label>
            <div className="goal-value">{goal.title}</div>
          </div>

          {/* Описание */}
          <div className="goal-field">
            <label className="goal-label">Описание</label>
            <div className="goal-value">
              {goal.description || 'Описание отсутствует'}
            </div>
          </div>

          {/* Дедлайн */}
          <div className="goal-field">
            <label className="goal-label">Дедлайн</label>
            <div className="goal-value">
              {goal.deadline 
                ? new Date(goal.deadline).toLocaleDateString('ru-RU')
                : 'Не установлен'
              }
            </div>
          </div>

          {/* Важность */}
          <div className="goal-field">
            <label className="goal-label">Важность</label>
            <div className="goal-value">{importance}</div>
          </div>

          {/* Тип цели */}
          <div className="goal-field">
            <label className="goal-label">Тип цели</label>
            <div className="goal-value">
              {goal.type === 'year' ? 'На год' : 
               goal.type === 'month' ? 'На месяц' : 
               'Бессрочная'}
            </div>
          </div>

          {/* Действия */}
          <div className="goal-actions">
            <Button 
              variant={goal.isDone ? 'success' : 'primary'}
              onClick={handleComplete}
              disabled={isCompleting}
              loading={isCompleting}
              fullWidth
              className={goal.isDone ? 'done' : ''}
            >
              {goal.isDone ? 'Отменить выполнение' : 'Подтвердить выполнение'}
            </Button>
            <Button 
              variant="danger"
              onClick={handleDelete}
              disabled={isDeleting}
              loading={isDeleting}
              fullWidth
            >
              Удалить цель
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
