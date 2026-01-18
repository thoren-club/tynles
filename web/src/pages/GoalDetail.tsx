import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Button, Input, Dropdown, DateTimePickerWithPresets, ImportanceSelector } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import './GoalDetail.css';

export default function GoalDetail() {
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const { id } = useParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    importance: 1,
    type: 'unlimited' as 'year' | 'month' | 'unlimited',
  });
  
  const [originalGoal, setOriginalGoal] = useState<any>(null);

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
        setOriginalGoal(foundGoal);
        setFormData({
          title: foundGoal.title || '',
          description: foundGoal.description || '',
          deadline: foundGoal.deadline || '',
          importance: foundGoal.difficulty || 1,
          type: foundGoal.type || 'unlimited',
        });
      }
    } catch (error) {
      console.error('Failed to load goal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert(tr('Название обязательно', 'Title is required'));
      return;
    }

    setIsSaving(true);
    try {
      await api.updateGoal(id!, {
        title: formData.title.trim(),
        difficulty: formData.importance,
        description: formData.description.trim() || undefined,
        deadline: formData.deadline || undefined,
        type: formData.type || undefined,
      });
      navigate('/deals');
    } catch (error) {
      console.error('Failed to update goal:', error);
      alert(tr('Не удалось обновить цель', 'Failed to update goal'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(tr('Удалить цель?', 'Delete goal?'))) return;
    
    setIsDeleting(true);
    try {
      await api.deleteGoal(id!);
      navigate('/deals');
    } catch (error) {
      console.error('Failed to delete goal:', error);
      alert(tr('Не удалось удалить цель', 'Failed to delete goal'));
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
      alert(tr('Не удалось изменить статус цели', 'Failed to update goal status'));
    } finally {
      setIsCompleting(false);
    }
  };

  const typeOptions = [
    { value: 'unlimited', label: tr('Бессрочная', 'Unlimited') },
    { value: 'month', label: tr('На месяц', 'Month') },
    { value: 'year', label: tr('На год', 'Year') },
  ];

  if (loading) {
    return (
      <div className="goal-detail-overlay" onClick={() => navigate('/deals')}>
        <div className="goal-detail-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="goal-detail" aria-busy="true">
            <div className="goal-detail-header">
              <div className="swipe-indicator" />
            </div>
            <div className="loading-content">{tr('Загрузка...', 'Loading...')}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!originalGoal) {
    return (
      <div className="goal-detail-overlay" onClick={() => navigate('/deals')}>
        <div className="goal-detail-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="goal-detail">{tr('Цель не найдена', 'Goal not found')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="goal-detail-overlay" onClick={() => navigate('/deals')}>
      <div className="goal-detail-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="goal-detail">
          <div className="goal-detail-header">
            <div className="swipe-indicator" />
          </div>

          <div className="goal-detail-content">
            <h2 className="detail-title">{tr('Редактировать цель', 'Edit Goal')}</h2>

            {/* Название */}
            <Input
              label={tr('Название', 'Title') + ' *'}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={tr('Цель', 'Goal')}
              fullWidth
            />

            {/* Описание */}
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

            {/* Дедлайн */}
            <DateTimePickerWithPresets
              label={tr('Дедлайн', 'Deadline')}
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              fullWidth
            />

            {/* Важность */}
            <ImportanceSelector
              label={tr('Важность', 'Priority')}
              value={formData.importance}
              onChange={(value) => setFormData({ ...formData, importance: value })}
              fullWidth
            />

            {/* Тип цели */}
            <Dropdown
              label={tr('Тип цели', 'Goal type')}
              value={String(formData.type)}
              onChange={(value) => setFormData({ ...formData, type: value as 'year' | 'month' | 'unlimited' })}
              options={typeOptions}
              fullWidth
            />

            {/* Кнопки действий */}
            <div className="goal-actions">
              <Button 
                variant={originalGoal.isDone ? 'success' : 'primary'}
                onClick={handleComplete}
                disabled={isCompleting}
                loading={isCompleting}
                fullWidth
                className={originalGoal.isDone ? 'done' : ''}
              >
                {originalGoal.isDone
                  ? tr('Отменить выполнение', 'Undo completion')
                  : tr('Подтвердить выполнение', 'Mark as completed')}
              </Button>
              <Button 
                variant="primary"
                onClick={handleSave}
                disabled={isSaving || !formData.title.trim()}
                loading={isSaving}
                fullWidth
              >
                {tr('Сохранить', 'Save')}
              </Button>
              <Button 
                variant="danger"
                onClick={handleDelete}
                disabled={isDeleting}
                loading={isDeleting}
                fullWidth
              >
                {tr('Удалить цель', 'Delete goal')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
