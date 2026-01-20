import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconPlus, IconChevronRight } from '@tabler/icons-react';
import { api } from '../api';
import { isTaskAvailable } from '../utils/taskAvailability';
import { getTaskDateParts } from '../utils/taskDate';
import { triggerLightHaptic } from '../utils/haptics';
import { Skeleton, DateTimePickerWithPresets, ImportanceSelector, RecurringPresets } from '../components/ui';
import { useLanguage } from '../contexts/LanguageContext';
import TaskListItem from '../components/TaskListItem';
import './Deals.css';

export default function Deals() {
  const navigate = useNavigate();
  const { tr, locale } = useLanguage();
  const [goals, setGoals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'goal' | 'task' | null>(null);
  
  // Форма создания
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    importance: 1,
    type: 'unlimited' as 'year' | 'month' | 'unlimited',
    isRecurring: false,
    daysOfWeek: [] as number[],
  });
  
  const [isCreating, setIsCreating] = useState(false);
  const [completedTaskId, setCompletedTaskId] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Для свайпа шторки
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);
  const [swipeCurrentY, setSwipeCurrentY] = useState<number | null>(null);
  const [sheetTransform, setSheetTransform] = useState(0);
  const [canSwipe, setCanSwipe] = useState(false); // Можно ли свайпать (на хедере или контент вверху)
  const sheetContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimer) {
        clearTimeout(undoTimer);
      }
    };
  }, []);

  useEffect(() => {
    if (showCreateModal) {
      document.body.classList.add('modal-open');
      return () => {
        document.body.classList.remove('modal-open');
      };
    }
  }, [showCreateModal]);

  // Глобальные обработчики для свайпа мыши (на document)
  useEffect(() => {
    if (!showCreateModal || swipeStartY === null || !canSwipe) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - swipeStartY!;
      if (deltaY > 0) {
        e.preventDefault();
        setSwipeCurrentY(e.clientY);
        setSheetTransform(deltaY);
      }
    };

    const handleGlobalMouseUp = () => {
      const currentY = swipeCurrentY;
      if (swipeStartY === null || currentY === null) return;

      const deltaY = currentY - swipeStartY;
      const threshold = 100;

      if (deltaY >= threshold) {
        setSheetTransform(window.innerHeight);
        setTimeout(() => {
          handleCloseModal();
        }, 200);
      } else {
        setSheetTransform(0);
      }

      setSwipeStartY(null);
      setSwipeCurrentY(null);
      setCanSwipe(false);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [swipeStartY, swipeCurrentY, canSwipe, showCreateModal]);

  // Закрытие dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showCreateDropdown) {
        const target = e.target as HTMLElement;
        if (!target.closest('.create-button-container')) {
          setShowCreateDropdown(false);
        }
      }
    };

    if (showCreateDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showCreateDropdown]);

  const loadData = async () => {
    try {
      const [goalsData, tasksData, membersData] = await Promise.all([
        api.getGoals(),
        api.getTasks(),
        api.getMembers().catch(() => ({ members: [] })),
      ]);
      
      setGoals(goalsData.goals || []);
      setTasks(tasksData.tasks || []);
      setMembers(membersData.members || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setShowCreateDropdown(!showCreateDropdown);
  };

  const handleCreateTypeSelect = (type: 'goal' | 'task') => {
    setCreateType(type);
    setShowCreateDropdown(false);
    
    // Умные значения по умолчанию
    const today = new Date();
    today.setHours(23, 59, 0, 0);
    const defaultDeadline = today.toISOString().slice(0, 16);
    
    setFormData({
      title: '',
      description: '',
      deadline: defaultDeadline,
      importance: 2, // Средняя по умолчанию
      type: 'unlimited',
      isRecurring: false,
      daysOfWeek: [],
    });
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setCreateType(null);
    setFormData({
      title: '',
      description: '',
      deadline: '',
      importance: 1,
      type: 'unlimited',
      isRecurring: false,
      daysOfWeek: [],
    });
    setSheetTransform(0);
    setSwipeStartY(null);
    setSwipeCurrentY(null);
  };

  // Проверка, можно ли свайпать (контент вверху или свайп на хедере)
  const checkCanSwipe = (target: HTMLElement): boolean => {
    // Если свайп начат на хедере - всегда можно
    if (target.closest('.swipe-indicator') || target.closest('.create-modal-header')) {
      return true;
    }
    
    // Иначе проверяем, не прокручен ли контент
    if (sheetContentRef.current) {
      const scrollTop = sheetContentRef.current.scrollTop;
      return scrollTop === 0;
    }
    
    return false;
  };

  // Обработка начала свайпа
  const handleSwipeStart = (clientY: number, target: HTMLElement) => {
    const canSwipeNow = checkCanSwipe(target);
    if (canSwipeNow) {
      setCanSwipe(true);
      setSwipeStartY(clientY);
      setSwipeCurrentY(clientY);
    }
  };

  // Обработка движения свайпа
  const handleSwipeMove = (clientY: number, e: React.TouchEvent | React.MouseEvent) => {
    if (swipeStartY === null || !canSwipe) return;

    const deltaY = clientY - swipeStartY;
    
    // Разрешаем движение только вниз (положительный deltaY)
    if (deltaY > 0) {
      e.preventDefault(); // Предотвращаем скролл при свайпе шторки
      setSwipeCurrentY(clientY);
      setSheetTransform(deltaY);
    } else {
      // Движение вверх - не блокируем, позволяем скроллить
      setSheetTransform(0);
    }
  };

  // Обработка окончания свайпа
  const handleSwipeEnd = () => {
    if (swipeStartY === null || swipeCurrentY === null || !canSwipe) {
      setSwipeStartY(null);
      setSwipeCurrentY(null);
      setCanSwipe(false);
      return;
    }

    const deltaY = swipeCurrentY - swipeStartY;
    const threshold = 100; // Минимальное расстояние для закрытия (в пикселях)

    if (deltaY >= threshold) {
      // Закрываем шторку с анимацией
      setSheetTransform(window.innerHeight);
      setTimeout(() => {
        handleCloseModal();
      }, 200);
    } else {
      // Возвращаем в исходное положение с анимацией
      setSheetTransform(0);
    }

    setSwipeStartY(null);
    setSwipeCurrentY(null);
    setCanSwipe(false);
  };

  // Mouse события (для десктопа)
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    handleSwipeStart(e.clientY, target);
  };

  // Mouse события остаются локальными для шторки

  // Touch события (для мобильных)
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    handleSwipeStart(e.touches[0].clientY, target);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (swipeStartY !== null && canSwipe) {
      handleSwipeMove(e.touches[0].clientY, e);
    }
  };

  const handleTouchEnd = () => {
    if (swipeStartY !== null) {
      handleSwipeEnd();
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      alert(tr('Название обязательно', 'Title is required'));
      return;
    }

    setIsCreating(true);
    try {
      if (createType === 'goal') {
        await api.createGoal({
          title: formData.title.trim(),
          difficulty: formData.importance,
          description: formData.description.trim() || undefined,
          deadline: formData.deadline || undefined,
          type: formData.type || undefined,
        });
      } else {
        // Задача
        const taskData: any = {
          title: formData.title.trim(),
          difficulty: formData.importance,
          description: formData.description.trim() || undefined,
          dueAt: formData.deadline || undefined,
        };

        if (formData.isRecurring && formData.daysOfWeek.length > 0) {
          taskData.isRecurring = true;
          taskData.daysOfWeek = formData.daysOfWeek;
        }

        await api.createTask(taskData);
      }

      // Перезагружаем данные
      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to create:', error);
      alert(tr('Не удалось создать. Попробуйте ещё раз.', 'Failed to create. Please try again.'));
    } finally {
      setIsCreating(false);
    }
  };

  // Больше не нужно - используется RecurringPresets

  const handleGoalClick = (goalId: string) => {
    navigate(`/goal/${goalId}`);
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/task/${taskId}`);
  };

  const handleRecurringComplete = async (taskId: string) => {
    triggerLightHaptic();
    try {
      await api.completeTask(taskId);
      await loadData();
    } catch (error) {
      console.error('Failed to complete task:', error);
      alert(tr('Не удалось выполнить задачу', 'Failed to complete task'));
    }
  };

  // Получаем текст важности по difficulty
  const getImportanceText = (difficulty: number): string => {
    const importanceMap: { [key: number]: string } = {
      1: tr('Низкая', 'Low'),
      2: tr('Средняя', 'Medium'),
      3: tr('Высокая', 'High'),
      4: tr('Критическая', 'Critical'),
    };
    return importanceMap[difficulty] || importanceMap[1];
  };

  // Получаем класс для важности (для цвета)
  const getImportanceClass = (difficulty: number): string => {
    const classMap: { [key: number]: string } = {
      1: 'importance-low',      // серый
      2: 'importance-medium',   // зеленый
      3: 'importance-high',     // оранжевый
      4: 'importance-urgent',   // красный
    };
    return classMap[difficulty] || classMap[1];
  };

  const handleTaskComplete = async (taskId: string) => {
    triggerLightHaptic();
    if (undoTimer) {
      clearTimeout(undoTimer);
      setUndoTimer(null);
      setCompletedTaskId(null);
    }

    setCompletedTaskId(taskId);

    const taskToComplete = uncompletedTasks.find((t) => t.id === taskId);
    if (taskToComplete) {
      const timer = setTimeout(async () => {
        try {
          await api.completeTask(taskId);
          await loadData();
          setCompletedTaskId(null);
          setUndoTimer(null);
        } catch (error) {
          console.error('Failed to complete task:', error);
          setCompletedTaskId(null);
          setUndoTimer(null);
        }
      }, 5000);

      setUndoTimer(timer);
    }
  };

  const handleTaskUndo = () => {
    if (undoTimer) {
      clearTimeout(undoTimer);
      setUndoTimer(null);
      setCompletedTaskId(null);
    }
  };

  const getTaskDueGroup = (task: any): 'overdue' | 'today' | 'upcoming' | 'later' | 'no-date' => {
    if (!task.dueAt) return 'no-date';
    const dueDate = new Date(task.dueAt);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const in7Days = new Date(startOfToday);
    in7Days.setDate(in7Days.getDate() + 7);

    if (dueDate < startOfToday) return 'overdue';
    if (dueDate <= endOfToday) return 'today';
    if (dueDate <= in7Days) return 'upcoming';
    return 'later';
  };

  const sortTasksByDue = (items: any[]) => {
    return [...items].sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
  };

  const displayedGoals = goals.slice(0, 6);
  const hasMoreGoals = goals.length > 6;
  
  // Показываем все невыполненные задачи, даже если они ещё недоступны
  const uncompletedTasks = tasks.filter((task: any) => !task.isCompleted);
  const groupedTasks = {
    overdue: [] as any[],
    today: [] as any[],
    upcoming: [] as any[],
    later: [] as any[],
    noDate: [] as any[],
  };

  uncompletedTasks.forEach((task: any) => {
    const group = getTaskDueGroup(task);
    groupedTasks[group === 'no-date' ? 'noDate' : group].push(task);
  });

  const taskSections = [
    { key: 'overdue', label: tr('Просрочено', 'Overdue') },
    { key: 'today', label: tr('Сегодня', 'Today') },
    { key: 'upcoming', label: tr('Ближайшие 7 дней', 'Next 7 days') },
    { key: 'later', label: tr('Позже', 'Later') },
    { key: 'noDate', label: tr('Без срока', 'No due date') },
  ] as const;

  if (loading) {
    return (
      <div className="deals">
        <div className="deals-header">
          <Skeleton width={90} height={30} />
          <Skeleton width={110} height={34} radius={999} />
        </div>

        <div className="goals-section">
          <div className="section-header">
            <Skeleton width={90} height={22} />
            <Skeleton width={110} height={18} radius={10} />
          </div>
          <div className="goals-list">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="goal-card">
                <div className="goal-content">
                  <Skeleton width="70%" height={16} radius={8} />
                  <div className="goal-meta">
                    <Skeleton width={90} height={12} radius={999} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="tasks-section">
          <Skeleton width={90} height={22} />
          <div className="tasks-list">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="task-card">
                <div className="task-content">
                  <div className="task-header">
                    <Skeleton width="65%" height={16} radius={8} />
                    <Skeleton width={60} height={14} radius={999} />
                  </div>
                  <div className="task-meta">
                    <Skeleton width={140} height={14} radius={999} />
                  </div>
                </div>
                <Skeleton width={92} height={34} radius={999} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="deals">
      {/* Хедер с кнопкой создать */}
      <div className="deals-header">
        <h1 className="deals-title">{tr('Дела', 'Deals')}</h1>
        <div className="create-button-container">
          <button 
            className="create-button"
            onClick={handleCreateClick}
          >
            <IconPlus size={20} />
            <span>{tr('создать', 'create')}</span>
          </button>
          
          {showCreateDropdown && (
            <div className="create-dropdown">
              <button 
                className="dropdown-item"
                onClick={() => handleCreateTypeSelect('goal')}
              >
                {tr('Цель', 'Goal')}
              </button>
              <button 
                className="dropdown-item"
                onClick={() => handleCreateTypeSelect('task')}
              >
                {tr('Задача', 'Task')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Секция целей */}
      <div className="goals-section">
        <div className="section-header">
          <h2 className="section-title">{tr('Цели', 'Goals')}</h2>
          {hasMoreGoals && (
            <button 
              className="all-goals-link"
              onClick={() => navigate('/all-goals')}
            >
              {tr('Все цели', 'All goals')}
              <IconChevronRight size={16} />
            </button>
          )}
        </div>

        {displayedGoals.length === 0 ? (
          <div className="empty-state">{tr('Целей пока нет', 'No goals yet')}</div>
        ) : (
          <div className="goals-list">
            {displayedGoals.map((goal) => {
              const importanceClass = getImportanceClass(goal.difficulty || 1);
              const isImportant = (goal.difficulty || 1) >= 3;
              
              return (
                <div 
                  key={goal.id} 
                  className={`goal-card ${importanceClass} ${isImportant ? 'goal-important' : ''}`}
                  onClick={() => handleGoalClick(goal.id)}
                >
                  <div className="goal-content">
                    <div className="goal-title">{goal.title}</div>
                    <div className="goal-meta">
                      <span className={`goal-importance ${importanceClass}`}>
                        {getImportanceText(goal.difficulty || 1)}
                      </span>
                    </div>
                  </div>
                  {goal.isDone && (
                    <div className="goal-done-badge">✓</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Секция задач */}
      <div className="tasks-section">
        <h2 className="section-title">{tr('Задачи', 'Tasks')}</h2>
        {taskSections.map((section) => {
          const tasksForSection = groupedTasks[section.key as keyof typeof groupedTasks];
          if (tasksForSection.length === 0) return null;
          return (
            <div key={section.key} className="task-group">
              <div className="task-group-title">{section.label}</div>
              <div className="tasks-list">
                {sortTasksByDue(tasksForSection).map((task) => {
                  const isRecurring = task.recurrenceType && task.recurrenceType !== 'none';
                  const taskAvailable = !isRecurring || isTaskAvailable(task);
                  const isChecked = !isRecurring && completedTaskId === task.id;
                  const dateParts = getTaskDateParts(task.dueAt, locale, tr);
                  const assigneeId = task.assigneeUserId;
                  const assignee = assigneeId ? members.find((m: any) => m.id === assigneeId) : null;

                  return (
                    <TaskListItem
                      key={task.id}
                      title={task.title}
                      assignee={assignee}
                      isChecked={isChecked}
                      isDisabled={!taskAvailable}
                      isDimmed={isChecked}
                      dateLabel={dateParts?.label}
                      timeLabel={dateParts?.time}
                      isOverdue={dateParts?.isOverdue}
                      isRecurring={isRecurring}
                      onClick={() => handleTaskClick(task.id)}
                      onToggle={() => {
                        if (!taskAvailable) return;
                        if (isRecurring) {
                          handleRecurringComplete(task.id);
                          return;
                        }
                        if (isChecked) {
                          handleTaskUndo();
                          return;
                        }
                        handleTaskComplete(task.id);
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {completedTaskId && (
        <div className="task-undo-bar">
          <button className="task-undo-button" onClick={handleTaskUndo}>
            {tr('Отменить', 'Undo')}
          </button>
        </div>
      )}

      {/* Шторка создания цели/задачи */}
      {showCreateModal && createType && (
        <div 
          className="create-modal-overlay" 
          onClick={handleCloseModal}
        >
          <div 
            className="create-modal-sheet" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              transform: sheetTransform > 0 ? `translateY(${sheetTransform}px)` : 'none',
              transition: swipeStartY === null ? 'transform 0.2s ease-out' : 'none'
            }}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="create-modal">
              {/* Хедер с возможностью свайпа */}
              <div 
                className="create-modal-header"
                style={{ cursor: 'grab' }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              >
                <div className="swipe-indicator" />
              </div>

              <div 
                className="create-modal-content"
                ref={sheetContentRef}
              >
                <div className="create-modal-title">
                  {tr('Создать', 'Create')}{' '}
                  {createType === 'goal' ? tr('цель', 'goal') : tr('задачу', 'task')}
                </div>

                {/* Форма */}
                <div className="create-form">
                {/* Название */}
                <div className="form-field">
                  <label className="form-label">{tr('Название', 'Title')} *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={createType === 'goal' ? tr('Цель', 'Goal') : tr('Задача', 'Task')}
                    autoFocus
                  />
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

                {/* Дедлайн - показываем только для целей и одноразовых задач */}
                {(createType === 'goal' || (createType === 'task' && !formData.isRecurring)) && (
                  <DateTimePickerWithPresets
                    label={tr('Дедлайн', 'Deadline')}
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    fullWidth
                  />
                )}

                {/* Важность */}
                <ImportanceSelector
                  label={tr('Важность', 'Priority')}
                  value={formData.importance}
                  onChange={(value) => setFormData({ ...formData, importance: value })}
                  fullWidth
                />

                {/* Тип цели (только для целей) */}
                {createType === 'goal' && (
                  <div className="form-field">
                    <label className="form-label">{tr('Тип цели', 'Goal type')}</label>
                    <select
                      className="form-select"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    >
                      <option value="unlimited">{tr('Бессрочная', 'Unlimited')}</option>
                      <option value="month">{tr('На месяц', 'Month')}</option>
                      <option value="year">{tr('На год', 'Year')}</option>
                    </select>
                  </div>
                )}

                {/* Повторяющаяся задача (только для задач) */}
                {createType === 'task' && (
                  <>
                    <div className="form-field">
                      <label className="form-checkbox-label">
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={formData.isRecurring}
                          onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                        />
                        <span>{tr('Повторяющаяся задача', 'Recurring task')}</span>
                      </label>
                    </div>

                    {formData.isRecurring && (
                      <RecurringPresets
                        label={tr('Дни недели', 'Days of week')}
                        selectedDays={formData.daysOfWeek}
                        onChange={(days) => setFormData({ ...formData, daysOfWeek: days })}
                        fullWidth
                      />
                    )}
                  </>
                )}

                {/* Кнопки */}
                <div className="form-actions">
                  <button
                    className="btn-cancel"
                    onClick={handleCloseModal}
                    disabled={isCreating}
                  >
                    {tr('Отмена', 'Cancel')}
                  </button>
                  <button
                    className="btn-create"
                    onClick={handleCreate}
                    disabled={isCreating || !formData.title.trim()}
                  >
                    {isCreating ? tr('Создание...', 'Creating...') : tr('Создать', 'Create')}
                  </button>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
