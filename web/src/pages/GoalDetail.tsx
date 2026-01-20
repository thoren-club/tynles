import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Button, Dropdown } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import './GoalDetail.css';

export default function GoalDetail() {
  const navigate = useNavigate();
  const { tr, locale } = useLanguage();
  const { id } = useParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [currentSpace, setCurrentSpace] = useState<any>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigneeUserId: '',
    assigneeScope: 'space' as 'space' | 'user',
    targetType: 'unlimited' as 'year' | 'month' | 'unlimited',
    targetYear: new Date().getFullYear(),
    targetMonth: new Date().getMonth() + 1,
  });
  
  const [originalGoal, setOriginalGoal] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadGoal();
    }
  }, [id]);

  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg?.BackButton) return;
    const handleBack = () => navigate(-1);
    try {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
    } catch {
      // no-op
    }
    return () => {
      try {
        tg.BackButton.offClick(handleBack);
        tg.BackButton.hide();
      } catch {
        // no-op
      }
    };
  }, [navigate]);

  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg?.BackButton) return;

    let tracking = false;
    let startX = 0;
    let startY = 0;
    const edgeThreshold = 24;
    const swipeThreshold = 80;
    const maxVerticalDrift = 50;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch || touch.clientX > edgeThreshold) return;
      tracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      const touch = e.touches[0];
      if (!touch) return;
      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);
      if (deltaX > swipeThreshold && deltaY < maxVerticalDrift) {
        tracking = false;
        navigate(-1);
      }
    };

    const handleTouchEnd = () => {
      tracking = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigate]);

  const loadGoal = async () => {
    try {
      const [goals, membersData, spaceInfo] = await Promise.all([
        api.getGoals(),
        api.getMembers().catch(() => ({ members: [] })),
        api.getCurrentSpace().catch(() => null),
      ]);
      const foundGoal = goals.goals.find((g: any) => g.id === id);
      if (foundGoal) {
        setOriginalGoal(foundGoal);
        setFormData({
          title: foundGoal.title || '',
          description: foundGoal.description || '',
          assigneeUserId: foundGoal.assigneeUserId || '',
          assigneeScope: foundGoal.assigneeScope === 'user' && foundGoal.assigneeUserId ? 'user' : 'space',
          targetType: foundGoal.targetType || 'unlimited',
          targetYear: foundGoal.targetYear || new Date().getFullYear(),
          targetMonth: foundGoal.targetMonth || new Date().getMonth() + 1,
        });
      }
      setMembers(membersData.members || []);
      setCurrentSpace(spaceInfo);
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
        difficulty: originalGoal?.difficulty || 1,
        assigneeScope: formData.assigneeScope,
        assigneeUserId: formData.assigneeScope === 'user' ? formData.assigneeUserId || undefined : undefined,
        targetType: formData.targetType,
        targetYear: formData.targetType !== 'unlimited' ? formData.targetYear : undefined,
        targetMonth: formData.targetType === 'month' ? formData.targetMonth : undefined,
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

  const memberOptions = members.map((m: any) => ({
    value: `user:${m.id}`,
    label: m.firstName || m.username || m.id,
  }));

  const assigneeOptions = [
    { value: 'space', label: currentSpace?.name || tr('Дом', 'Home') },
    ...memberOptions,
  ];

  const assigneeValue =
    formData.assigneeScope === 'space' || !formData.assigneeUserId
      ? 'space'
      : `user:${formData.assigneeUserId}`;

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  if (loading) {
    return (
      <div className="goal-detail-page">
        <div className="goal-detail" aria-busy="true">
          <div className="loading-content">{tr('Загрузка...', 'Loading...')}</div>
        </div>
      </div>
    );
  }

  if (!originalGoal) {
    return (
      <div className="goal-detail-page">
        <div className="goal-detail">{tr('Цель не найдена', 'Goal not found')}</div>
      </div>
    );
  }

  return (
    <div className="goal-detail-page">
      <div className="goal-detail">
        <div className="goal-detail-content">
            <div className="detail-title-row">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  className="detail-title-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setIsEditingTitle(false);
                    }
                  }}
                  placeholder={tr('Цель', 'Goal')}
                />
              ) : (
                <button
                  type="button"
                  className="detail-title-button"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {formData.title || tr('Цель', 'Goal')}
                </button>
              )}
            </div>

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

            {/* Исполнитель */}
            <Dropdown
              label={tr('Исполнитель', 'Assignee') + ' *'}
              value={assigneeValue}
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

            {/* Период */}
            <Dropdown
              label={tr('Период', 'Period')}
              value={String(formData.targetType)}
              onChange={(value) => setFormData({ ...formData, targetType: value as any })}
              options={[
                { value: 'unlimited', label: tr('Бессрочно', 'Unlimited') },
                { value: 'month', label: tr('В течение месяца', 'Within a month') },
                { value: 'year', label: tr('В течение года', 'Within a year') },
              ]}
              fullWidth
            />
            {formData.targetType === 'month' && (
              <>
                <Dropdown
                  label={tr('Месяц', 'Month')}
                  value={String(formData.targetMonth)}
                  onChange={(value) => setFormData({ ...formData, targetMonth: Number(value) })}
                  options={Array.from({ length: 12 }, (_, index) => {
                    const date = new Date(formData.targetYear, index, 1);
                    return {
                      value: String(index + 1),
                      label: date.toLocaleString(locale, { month: 'long' }),
                    };
                  })}
                  fullWidth
                />
                <Dropdown
                  label={tr('Год', 'Year')}
                  value={String(formData.targetYear)}
                  onChange={(value) => setFormData({ ...formData, targetYear: Number(value) })}
                  options={Array.from({ length: 6 }, (_, index) => {
                    const year = new Date().getFullYear() + index;
                    return { value: String(year), label: String(year) };
                  })}
                  fullWidth
                />
              </>
            )}
            {formData.targetType === 'year' && (
              <Dropdown
                label={tr('Год', 'Year')}
                value={String(formData.targetYear)}
                onChange={(value) => setFormData({ ...formData, targetYear: Number(value) })}
                options={Array.from({ length: 6 }, (_, index) => {
                  const year = new Date().getFullYear() + index;
                  return { value: String(year), label: String(year) };
                })}
                fullWidth
              />
            )}

            {/* Кнопки действий */}
            <div className="goal-actions">
              <Button 
                variant="success"
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
  );
}
