import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronLeft } from '@tabler/icons-react';
import { api } from '../api';
import { Skeleton } from '../components/ui';
import TaskListItem from '../components/TaskListItem';
import { getGoalTimeframeLabel } from '../utils/goalTimeframe';
import { useLanguage } from '../contexts/LanguageContext';
import './AllGoals.css';

export default function AllGoals() {
  const navigate = useNavigate();
  const { tr, locale } = useLanguage();
  const [members, setMembers] = useState<any[]>([]);
  const [currentSpace, setCurrentSpace] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'year' | 'month' | 'unlimited'>('all');

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
      setGoals(data.goals || []);
      setMembers(membersData.members || []);
      setCurrentSpace(spaceInfo);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredGoals = () => {
    let filtered = goals;
    
    if (filter === 'year') {
      filtered = goals.filter((g: any) => g.targetType === 'year');
    } else if (filter === 'month') {
      filtered = goals.filter((g: any) => g.targetType === 'month');
    } else if (filter === 'unlimited') {
      filtered = goals.filter((g: any) => !g.targetType || g.targetType === 'unlimited');
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
      const currentMonth = new Date().toLocaleString(locale, { month: 'long' });

  return (
    <div className="all-goals">
      {/* Хедер */}
      <div className="all-goals-header">
        <IconChevronLeft 
          size={24} 
          className="back-icon"
          onClick={() => navigate('/deals')}
        />
        <h1 className="all-goals-title">{tr('Все цели', 'All goals')}</h1>
        <div style={{ width: 24 }} />
      </div>

      {/* Фильтры по периодам */}
      <div className="period-filters">
        <button 
          className={`filter-button ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          {tr('Все', 'All')}
        </button>
        <button 
          className={`filter-button ${filter === 'year' ? 'active' : ''}`}
          onClick={() => setFilter('year')}
        >
          {tr(`На ${currentYear} год`, `${currentYear} year`)}
        </button>
        <button 
          className={`filter-button ${filter === 'month' ? 'active' : ''}`}
          onClick={() => setFilter('month')}
        >
          {tr(`На ${currentMonth}`, currentMonth)}
        </button>
        <button 
          className={`filter-button ${filter === 'unlimited' ? 'active' : ''}`}
          onClick={() => setFilter('unlimited')}
        >
          {tr('Бессрочные', 'Unlimited')}
        </button>
      </div>

      {/* Текущие цели */}
      <div className="goals-section">
        <h2 className="section-title">{tr('Текущие цели', 'Current goals')}</h2>
        {current.length === 0 ? (
          <div className="empty-state">{tr('Нет текущих целей', 'No current goals')}</div>
        ) : (
          <div className="goals-list">
            {current.map((goal) => {
              const timeframeLabel = getGoalTimeframeLabel(goal, locale, tr);
              const goalAssignee = goal.assigneeScope === 'space'
                ? {
                    firstName: currentSpace?.name || tr('Дом', 'Home'),
                    photoUrl: currentSpace?.avatarUrl,
                  }
                : goal.assigneeUserId
                  ? members.find((m: any) => m.id === goal.assigneeUserId)
                  : null;
              return (
                <TaskListItem
                  key={goal.id}
                  title={goal.title}
                  assignee={goalAssignee}
                  isChecked={goal.isDone}
                  isDisabled={false}
                  isDimmed={goal.isDone}
                  onToggle={() => window.dispatchEvent(new CustomEvent('open-editor', { detail: { type: 'goal', id: goal.id } }))}
                  dateLabel={timeframeLabel}
                  showCalendarIcon={false}
                  onClick={() => window.dispatchEvent(new CustomEvent('open-editor', { detail: { type: 'goal', id: goal.id } }))}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Выполненные цели */}
      <div className="goals-section">
        <h2 className="section-title">{tr('Выполненные цели', 'Completed goals')}</h2>
        {completed.length === 0 ? (
          <div className="empty-state">{tr('Нет выполненных целей', 'No completed goals')}</div>
        ) : (
          <div className="goals-list">
            {completed.map((goal) => {
              const timeframeLabel = getGoalTimeframeLabel(goal, locale, tr);
              const goalAssignee = goal.assigneeScope === 'space'
                ? {
                    firstName: currentSpace?.name || tr('Дом', 'Home'),
                    photoUrl: currentSpace?.avatarUrl,
                  }
                : goal.assigneeUserId
                  ? members.find((m: any) => m.id === goal.assigneeUserId)
                  : null;
              return (
                <TaskListItem
                  key={goal.id}
                  title={goal.title}
                  assignee={goalAssignee}
                  isChecked={goal.isDone}
                  isDisabled={false}
                  isDimmed={goal.isDone}
                  onToggle={() => window.dispatchEvent(new CustomEvent('open-editor', { detail: { type: 'goal', id: goal.id } }))}
                  dateLabel={timeframeLabel}
                  showCalendarIcon={false}
                  onClick={() => window.dispatchEvent(new CustomEvent('open-editor', { detail: { type: 'goal', id: goal.id } }))}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
