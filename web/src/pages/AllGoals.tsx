import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronLeft } from '@tabler/icons-react';
import { api } from '../api';
import { Skeleton } from '../components/ui';
import './AllGoals.css';

export default function AllGoals() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'year' | 'month' | 'unlimited'>('all');

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await api.getGoals();
      setGoals(data.goals || []);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredGoals = () => {
    let filtered = goals;
    
    if (filter === 'year') {
      filtered = goals.filter((g: any) => g.type === 'year');
    } else if (filter === 'month') {
      filtered = goals.filter((g: any) => g.type === 'month');
    } else if (filter === 'unlimited') {
      filtered = goals.filter((g: any) => !g.type || g.type === 'unlimited');
    }
    
    const current = filtered.filter((g: any) => !g.isDone);
    const completed = filtered.filter((g: any) => g.isDone);
    
    return { current, completed };
  };

  if (loading) {
    return (
      <div className="all-goals">
        <div className="all-goals-header">
          <IconChevronLeft size={24} className="back-icon" onClick={() => navigate('/deals')} />
          <Skeleton width={140} height={26} />
          <div style={{ width: 24 }} />
        </div>

        <div className="period-filters">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width={92} height={34} radius={999} />
          ))}
        </div>

        <div className="goals-section">
          <Skeleton width={140} height={20} />
          <div className="goals-list">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="goal-card">
                <Skeleton width="70%" height={16} radius={8} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { current, completed } = getFilteredGoals();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().toLocaleString('ru-RU', { month: 'long' });

  return (
    <div className="all-goals">
      {/* Хедер */}
      <div className="all-goals-header">
        <IconChevronLeft 
          size={24} 
          className="back-icon"
          onClick={() => navigate('/deals')}
        />
        <h1 className="all-goals-title">Все цели</h1>
        <div style={{ width: 24 }} />
      </div>

      {/* Фильтры по периодам */}
      <div className="period-filters">
        <button 
          className={`filter-button ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Все
        </button>
        <button 
          className={`filter-button ${filter === 'year' ? 'active' : ''}`}
          onClick={() => setFilter('year')}
        >
          На {currentYear} год
        </button>
        <button 
          className={`filter-button ${filter === 'month' ? 'active' : ''}`}
          onClick={() => setFilter('month')}
        >
          На {currentMonth}
        </button>
        <button 
          className={`filter-button ${filter === 'unlimited' ? 'active' : ''}`}
          onClick={() => setFilter('unlimited')}
        >
          Бессрочные
        </button>
      </div>

      {/* Текущие цели */}
      <div className="goals-section">
        <h2 className="section-title">Текущие цели</h2>
        {current.length === 0 ? (
          <div className="empty-state">Нет текущих целей</div>
        ) : (
          <div className="goals-list">
            {current.map((goal) => (
              <div 
                key={goal.id} 
                className="goal-card"
                onClick={() => navigate(`/goal/${goal.id}`)}
              >
                <div className="goal-title">{goal.title}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Выполненные цели */}
      <div className="goals-section">
        <h2 className="section-title">Выполненные цели</h2>
        {completed.length === 0 ? (
          <div className="empty-state">Нет выполненных целей</div>
        ) : (
          <div className="goals-list">
            {completed.map((goal) => (
              <div 
                key={goal.id} 
                className="goal-card completed"
                onClick={() => navigate(`/goal/${goal.id}`)}
              >
                <div className="goal-title">{goal.title}</div>
                <div className="goal-done-badge">✓</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
