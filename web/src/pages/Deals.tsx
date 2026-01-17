import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconPlus, IconChevronRight } from '@tabler/icons-react';
import { api } from '../api';
import { isTaskAvailable } from '../utils/taskAvailability';
import './Deals.css';

export default function Deals() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
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
  
  // Для свайпа шторки
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);
  const [swipeCurrentY, setSwipeCurrentY] = useState<number | null>(null);
  const [sheetTransform, setSheetTransform] = useState(0);
  const [canSwipe, setCanSwipe] = useState(false); // Можно ли свайпать (на хедере или контент вверху)
  const sheetContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

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
      const [goalsData, tasksData] = await Promise.all([
        api.getGoals(),
        api.getTasks(),
      ]);
      
      setGoals(goalsData.goals || []);
      setTasks(tasksData.tasks || []);
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
    // Устанавливаем значения по умолчанию
    setFormData({
      title: type === 'goal' ? 'Цель' : 'Задача',
      description: '',
      deadline: '',
      importance: 1,
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
      alert('Название обязательно');
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
      alert('Не удалось создать. Попробуйте ещё раз.');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleDayOfWeek = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  const weekDays = [
    { value: 1, label: 'ПН' },
    { value: 2, label: 'ВТ' },
    { value: 3, label: 'СР' },
    { value: 4, label: 'ЧТ' },
    { value: 5, label: 'ПТ' },
    { value: 6, label: 'СБ' },
    { value: 0, label: 'ВС' },
  ];

  const handleGoalClick = (goalId: string) => {
    navigate(`/goal/${goalId}`);
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/task/${taskId}`);
  };

  const handleTaskCompleteClick = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем открытие детальной страницы
    if (!confirm('Выполнить задачу?')) return;
    
    try {
      await api.completeTask(taskId);
      await loadData(); // Перезагружаем данные
    } catch (error) {
      console.error('Failed to complete task:', error);
      alert('Не удалось выполнить задачу');
    }
  };

  // Получаем текст важности по difficulty
  const getImportanceText = (difficulty: number): string => {
    const importanceMap: { [key: number]: string } = {
      1: 'Низкая',
      2: 'Средняя',
      3: 'Высокая',
      4: 'Критическая',
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

  // Определяем тип задачи
  const getTaskType = (task: any): 'one-time' | 'daily' | 'weekly' => {
    if (!task.recurrenceType) {
      return 'one-time';
    }
    
    if (task.recurrenceType === 'daily') {
      const daysOfWeek = task.recurrencePayload?.daysOfWeek || [];
      // Если выбраны все 7 дней - это ежедневная задача
      if (daysOfWeek.length === 7) {
        return 'daily';
      }
      // Иначе это еженедельная (с конкретными днями)
      return 'weekly';
    }
    
    // Если recurrenceType === 'weekly' или другой тип
    return 'weekly';
  };

  // Получаем текст типа задачи
  const getTaskTypeText = (task: any): string => {
    const type = getTaskType(task);
    
    switch (type) {
      case 'one-time':
        return 'Одноразовая';
      case 'daily':
        return 'Ежедневная';
      case 'weekly': {
        const daysOfWeek = task.recurrencePayload?.daysOfWeek || [];
        if (daysOfWeek.length === 0) {
          return 'Еженедельная';
        }
        // Показываем количество выбранных дней
        return `Еженедельная (${daysOfWeek.length} дней)`;
      }
      default:
        return 'Одноразовая';
    }
  };

  // Получаем иконку для типа задачи
  const getTaskTypeIcon = (task: any): string => {
    const type = getTaskType(task);
    
    switch (type) {
      case 'one-time':
        return '📌';
      case 'daily':
        return '🔄';
      case 'weekly':
        return '📅';
      default:
        return '📌';
    }
  };

  const displayedGoals = goals.slice(0, 6);
  const hasMoreGoals = goals.length > 6;
  
  // Фильтруем задачи: показываем только доступные для выполнения
  // Одноразовые - всегда показываем (если не выполнены)
  // Повторяющиеся - показываем только если доступны (dueAt наступил и текущий день входит в daysOfWeek)
  const availableTasks = tasks.filter((task: any) => {
    // Пропускаем выполненные задачи (они не показываются)
    if (task.isCompleted) return false;
    
    // Для повторяющихся задач проверяем доступность
    const isRecurring = task.recurrenceType && task.recurrenceType !== 'none';
    if (isRecurring) {
      return isTaskAvailable(task);
    }
    
    // Одноразовые задачи показываем всегда (если не выполнены)
    return true;
  });

  if (loading) {
    return <div className="deals">Loading...</div>;
  }

  return (
    <div className="deals">
      {/* Хедер с кнопкой создать */}
      <div className="deals-header">
        <h1 className="deals-title">Дела</h1>
        <div className="create-button-container">
          <button 
            className="create-button"
            onClick={handleCreateClick}
          >
            <IconPlus size={20} />
            <span>создать</span>
          </button>
          
          {showCreateDropdown && (
            <div className="create-dropdown">
              <button 
                className="dropdown-item"
                onClick={() => handleCreateTypeSelect('goal')}
              >
                Цель
              </button>
              <button 
                className="dropdown-item"
                onClick={() => handleCreateTypeSelect('task')}
              >
                Задача
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Секция целей */}
      <div className="goals-section">
        <div className="section-header">
          <h2 className="section-title">Цели</h2>
          {hasMoreGoals && (
            <button 
              className="all-goals-link"
              onClick={() => navigate('/all-goals')}
            >
              Все цели
              <IconChevronRight size={16} />
            </button>
          )}
        </div>

        {displayedGoals.length === 0 ? (
          <div className="empty-state">Целей пока нет</div>
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
        <h2 className="section-title">Задачи</h2>
        
        {availableTasks.length === 0 ? (
          <div className="empty-state">Задач пока нет</div>
        ) : (
          <div className="tasks-list">
            {availableTasks.map((task) => {
              const taskType = getTaskType(task);
              const taskTypeText = getTaskTypeText(task);
              const taskTypeIcon = getTaskTypeIcon(task);
              
              return (
                <div 
                  key={task.id} 
                  className={`task-card task-type-${taskType}`}
                  onClick={() => handleTaskClick(task.id)}
                >
                  <div className="task-content">
                    <div className="task-header">
                      <div className="task-title">{task.title}</div>
                      {task.xp > 0 && (
                        <span className="task-xp">+{task.xp} XP</span>
                      )}
                    </div>
                    <div className="task-meta">
                      <span className="task-type-badge">
                        <span className="task-type-icon">{taskTypeIcon}</span>
                        <span className="task-type-text">{taskTypeText}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    className="task-complete-btn"
                    onClick={(e) => handleTaskCompleteClick(task.id, e)}
                  >
                    Выполнить
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
                  Создать {createType === 'goal' ? 'цель' : 'задачу'}
                </div>

                {/* Форма */}
                <div className="create-form">
                {/* Название */}
                <div className="form-field">
                  <label className="form-label">Название *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={createType === 'goal' ? 'Цель' : 'Задача'}
                    autoFocus
                  />
                </div>

                {/* Описание */}
                <div className="form-field">
                  <label className="form-label">Описание</label>
                  <textarea
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Необязательное описание"
                    rows={3}
                  />
                </div>

                {/* Дедлайн - показываем только для целей и одноразовых задач */}
                {(createType === 'goal' || (createType === 'task' && !formData.isRecurring)) && (
                  <div className="form-field">
                    <label className="form-label">Дедлайн</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                )}

                {/* Важность */}
                <div className="form-field">
                  <label className="form-label">Важность</label>
                  <select
                    className="form-select"
                    value={formData.importance}
                    onChange={(e) => setFormData({ ...formData, importance: parseInt(e.target.value) })}
                  >
                    <option value={1}>Низкая</option>
                    <option value={2}>Средняя</option>
                    <option value={3}>Высокая</option>
                    <option value={4}>Критическая</option>
                  </select>
                </div>

                {/* Тип цели (только для целей) */}
                {createType === 'goal' && (
                  <div className="form-field">
                    <label className="form-label">Тип цели</label>
                    <select
                      className="form-select"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    >
                      <option value="unlimited">Бессрочная</option>
                      <option value="month">На месяц</option>
                      <option value="year">На год</option>
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
                        <span>Повторяющаяся задача</span>
                      </label>
                    </div>

                    {formData.isRecurring && (
                      <div className="form-field">
                        <label className="form-label">Дни недели</label>
                        <div className="days-of-week">
                          {weekDays.map((day) => (
                            <button
                              key={day.value}
                              type="button"
                              className={`day-button ${formData.daysOfWeek.includes(day.value) ? 'active' : ''}`}
                              onClick={() => toggleDayOfWeek(day.value)}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>
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
                    Отмена
                  </button>
                  <button
                    className="btn-create"
                    onClick={handleCreate}
                    disabled={isCreating || !formData.title.trim()}
                  >
                    {isCreating ? 'Создание...' : 'Создать'}
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
