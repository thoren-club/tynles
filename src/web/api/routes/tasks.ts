import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../db';
import { AuthRequest } from '../middleware/auth';
import { calculateTaskXp, calculateLevel } from '../../../types';
import { addXp } from '../../../utils/xp';
import { calculateNextDueDate } from '../../../utils/recurrence';
import { notifyTaskAssigneeChanged, notifyUser } from '../../../notifications';

/**
 * Получает первый доступный день для повторяющейся задачи
 * Если сегодня входит в дни повторения - возвращает сегодня, иначе следующий доступный день
 */
function getFirstAvailableDate(recurrenceType: string | null, payload: any, now: Date): Date {
  if (!recurrenceType || recurrenceType === 'none') {
    return now; // Для одноразовых задач возвращаем текущую дату
  }
  
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  // Для ежедневных задач (7 дней) - сегодня
  if (recurrenceType === 'daily') {
    return today;
  }
  
  // Для еженедельных задач проверяем дни недели
  if (recurrenceType === 'weekly' && payload?.daysOfWeek && payload.daysOfWeek.length > 0) {
    const currentDay = now.getDay(); // 0 = воскресенье, 1 = понедельник, ...
    const daysOfWeek = payload.daysOfWeek.sort((a: number, b: number) => a - b);
    
    // Если сегодня входит в дни недели - возвращаем сегодня
    if (daysOfWeek.includes(currentDay)) {
      return today;
    }
    
    // Иначе находим следующий доступный день
    let nextDay = daysOfWeek.find((d: number) => d > currentDay);
    if (!nextDay) {
      // Следующий день на следующей неделе
      nextDay = daysOfWeek[0];
      const nextAvailable = new Date(now);
      nextAvailable.setDate(nextAvailable.getDate() + (7 - currentDay + nextDay));
      nextAvailable.setHours(0, 0, 0, 0);
      return nextAvailable;
    } else {
      // Следующий день на этой неделе
      const nextAvailable = new Date(now);
      nextAvailable.setDate(nextAvailable.getDate() + (nextDay - currentDay));
      nextAvailable.setHours(0, 0, 0, 0);
      return nextAvailable;
    }
  }
  
  // По умолчанию - сегодня
  return today;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getAssigneeScopeFromPayload(payload: any): 'user' | 'space' {
  return payload?.assigneeScope === 'space' ? 'space' : 'user';
}

function getAssigneeUserIdFromPayload(payload: any): bigint | null {
  if (getAssigneeScopeFromPayload(payload) === 'space') {
    return null;
  }
  const raw = payload?.assigneeUserId;
  if (!raw) return null;
  try {
    // stored as string in JSON
    return BigInt(String(raw));
  } catch {
    return null;
  }
}

function applyTimeOfDay(baseDate: Date, timeOfDay?: string | null) {
  if (!timeOfDay) return baseDate;
  const [hours, minutes] = timeOfDay.split(':').map((part) => parseInt(part, 10));
  if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
    const next = new Date(baseDate);
    next.setHours(hours, minutes, 0, 0);
    return next;
  }
  return baseDate;
}

const router = Router();

// Get all tasks
router.get('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId) {
      return res.status(404).json({ error: 'No current space' });
    }

    const tasks = await prisma.task.findMany({
      where: { spaceId: authReq.currentSpaceId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      tasks: tasks.map((task) => ({
        id: task.id.toString(),
        title: task.title,
        difficulty: task.difficulty,
        xp: task.xp,
        dueAt: task.dueAt?.toISOString() || null,
        isPaused: task.isPaused,
        recurrenceType: task.recurrenceType || null,
        recurrencePayload: (task.recurrencePayload as any) || null,
        assigneeUserId: getAssigneeUserIdFromPayload(task.recurrencePayload as any)?.toString() || null,
        assigneeScope: getAssigneeScopeFromPayload(task.recurrencePayload as any),
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// Create task
router.post('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId) {
      return res.status(404).json({ error: 'No current space' });
    }

    const { title, difficulty, xp, dueAt, description, isRecurring, daysOfWeek, assigneeUserId, assigneeScope } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Обработка повторяющейся задачи
    let recurrenceType: string | null = null;
    let recurrencePayload: Prisma.InputJsonValue | Prisma.JsonNullValueInput | null = null;
    
    const resolvedAssigneeScope = assigneeScope === 'space' ? 'space' : 'user';
    let resolvedAssigneeId: bigint | null = null;
    if (resolvedAssigneeScope === 'user' && assigneeUserId) {
      try {
        resolvedAssigneeId = BigInt(String(assigneeUserId));
      } catch {
        return res.status(400).json({ error: 'Invalid assigneeUserId' });
      }
    }

    if (resolvedAssigneeId) {
      const member = await prisma.spaceMember.findUnique({
        where: { spaceId_userId: { spaceId: authReq.currentSpaceId, userId: resolvedAssigneeId } },
      });
      if (!member) {
        return res.status(404).json({ error: 'Assignee not found in this space' });
      }
    }

    if (isRecurring && daysOfWeek && daysOfWeek.length > 0) {
      // Определяем тип повторения: ежедневная (7 дней) или еженедельная (меньше 7)
      if (daysOfWeek.length === 7) {
        recurrenceType = 'daily';
      } else {
        recurrenceType = 'weekly';
      }
    }

    const dueAtDate = dueAt ? new Date(dueAt) : null;
    const timeOfDay = dueAtDate
      ? `${dueAtDate.getHours().toString().padStart(2, '0')}:${dueAtDate.getMinutes().toString().padStart(2, '0')}`
      : undefined;

    const payload: Record<string, any> = {};
    if (daysOfWeek && daysOfWeek.length > 0) {
      payload.daysOfWeek = daysOfWeek;
    }
    if (resolvedAssigneeScope === 'space') {
      payload.assigneeScope = 'space';
    }
    if (resolvedAssigneeId) {
      payload.assigneeUserId = resolvedAssigneeId.toString();
    }
    if (timeOfDay) {
      payload.timeOfDay = timeOfDay;
    }

    if (Object.keys(payload).length > 0) {
      recurrencePayload = payload;
    } else {
      recurrencePayload = Prisma.JsonNull;
    }

    // Рассчитываем XP автоматически, если не передано
    const taskDifficulty = difficulty || 1;
    const taskRecurrenceType = recurrenceType || 'none';
    const calculatedXp = xp !== undefined ? xp : calculateTaskXp(taskDifficulty, taskRecurrenceType);

    // Для повторяющихся задач устанавливаем dueAt на первый доступный день
    // Для одноразовых - используем переданный dueAt
    let taskDueAt: Date | null = null;
    const now = new Date();
    const referenceDate = dueAt ? new Date(dueAt) : now;
    
    if (isRecurring && daysOfWeek && daysOfWeek.length > 0) {
      // Для повторяющихся задач устанавливаем dueAt на первый доступный день
      const firstAvailableDate = getFirstAvailableDate(
        recurrenceType,
        { daysOfWeek },
        referenceDate
      );
      const baseDate = startOfDay(firstAvailableDate);
      taskDueAt = timeOfDay ? applyTimeOfDay(baseDate, timeOfDay) : endOfDay(baseDate);
    } else if (dueAt) {
      // Для одноразовых задач используем переданный dueAt
      taskDueAt = new Date(dueAt);
    }

    const task = await prisma.task.create({
      data: {
        spaceId: authReq.currentSpaceId,
        title: title || 'Задача',
        difficulty: taskDifficulty,
        xp: calculatedXp,
        dueAt: taskDueAt,
        recurrenceType,
        recurrencePayload: recurrencePayload === Prisma.JsonNull ? Prisma.JsonNull : recurrencePayload,
        createdBy: authReq.user!.id,
      },
    });

    res.json({
      id: task.id.toString(),
      title: task.title,
      difficulty: task.difficulty,
      xp: task.xp,
      dueAt: task.dueAt?.toISOString() || null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Assign/unassign task to a user within current space
router.put('/:taskId/assignee', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId || !authReq.user) {
      return res.status(404).json({ error: 'No current space' });
    }

    const taskId = BigInt(req.params.taskId);
    const { userId, assigneeScope } = req.body as { userId?: string | null; assigneeScope?: string };

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.spaceId !== authReq.currentSpaceId) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const space = await prisma.space.findUnique({ where: { id: authReq.currentSpaceId } });
    const spaceName = space?.name || 'Пространство';

    const payloadRaw = (task.recurrencePayload as any) ?? {};
    const payload = (payloadRaw && typeof payloadRaw === 'object') ? { ...payloadRaw } : {};

    const prevAssigneeId = getAssigneeUserIdFromPayload(payload);

    let nextAssigneeId: bigint | null = null;
    const nextAssigneeScope = assigneeScope === 'space' || userId === 'space' ? 'space' : 'user';
    if (nextAssigneeScope === 'user' && userId) {
      try {
        nextAssigneeId = BigInt(userId);
      } catch {
        return res.status(400).json({ error: 'Invalid userId' });
      }

      // ensure member of this space
      const member = await prisma.spaceMember.findUnique({
        where: { spaceId_userId: { spaceId: authReq.currentSpaceId, userId: nextAssigneeId } },
        include: { user: true },
      });
      if (!member) {
        return res.status(404).json({ error: 'User not found in this space' });
      }
    }

    if (nextAssigneeScope === 'space') {
      payload.assigneeScope = 'space';
      delete payload.assigneeUserId;
    } else if (nextAssigneeId) {
      payload.assigneeScope = 'user';
      payload.assigneeUserId = nextAssigneeId.toString();
    } else {
      delete payload.assigneeUserId;
      delete payload.assigneeScope;
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        recurrencePayload: payload as any,
        reminderSent: false,
      },
    });

    const actorName = authReq.user.firstName || authReq.user.username || 'Кто-то';

    if (nextAssigneeScope !== 'space') {
      await notifyTaskAssigneeChanged({
        prevAssigneeId,
        nextAssigneeId,
        taskTitle: task.title,
        spaceName,
        actorName,
      });
    }

    res.json({
      success: true,
      assigneeUserId: nextAssigneeId?.toString() || null,
      assigneeScope: nextAssigneeScope,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update assignee' });
  }
});

// Complete task
router.post('/:taskId/complete', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId || !authReq.user) {
      return res.status(404).json({ error: 'No current space' });
    }

    const taskId = BigInt(req.params.taskId);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.spaceId !== authReq.currentSpaceId) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update user stats with XP using the utility function
    const result = await addXp(authReq.currentSpaceId, authReq.user.id, task.xp);

    await prisma.taskCompletion.create({
      data: {
        taskId: task.id,
        spaceId: task.spaceId,
        userId: authReq.user.id,
        xp: task.xp,
      },
    });

    // Для повторяющихся задач не удаляем, а обновляем updatedAt и dueAt на следующий доступный день
    // Для одноразовых задач удаляем
    if (task.recurrenceType && task.recurrenceType !== 'none') {
      const now = new Date();
      
      // Определяем тип повторения
      let recurrenceType = task.recurrenceType;
      const payload = task.recurrencePayload as { daysOfWeek?: number[] } | null;
      
      // Если есть daysOfWeek - это еженедельная задача, независимо от типа
      if (payload?.daysOfWeek && payload.daysOfWeek.length > 0) {
        if (payload.daysOfWeek.length === 7) {
          recurrenceType = 'daily';
        } else {
          recurrenceType = 'weekly';
        }
      }
      
      // Рассчитываем следующий доступный день для выполнения
      const nextDueDate = calculateNextDueDate(
        recurrenceType,
        payload as any,
        now
      );

      const nextOccurrenceDayStart = startOfDay(nextDueDate);
      const nextOccurrenceDeadline = (payload as any)?.timeOfDay
        ? nextDueDate
        : endOfDay(nextOccurrenceDayStart);
      
      // Обновляем задачу: updatedAt для отслеживания последнего выполнения и dueAt на следующий день
      await prisma.task.update({
        where: { id: taskId },
        data: {
          updatedAt: now, // Время последнего выполнения
          dueAt: nextOccurrenceDeadline, // Дедлайн следующего окна выполнения
          reminderSent: false, // Сбрасываем флаг напоминания для следующего периода
        },
      });
    } else {
      // Удаляем одноразовую задачу
      await prisma.task.delete({
        where: { id: taskId },
      });
    }

    const completionMessage = `✅ Задача выполнена: <b>${task.title}</b>\n+${task.xp} XP`;
    await notifyUser({ userId: authReq.user.id, message: completionMessage });
    if (result.levelUp) {
      await notifyUser({
        userId: authReq.user.id,
        message: `🎉 Поздравляем! Ты достиг уровня ${result.newLevel}.`,
      });
    }

    res.json({ 
      success: true,
      xpEarned: task.xp,
      newLevel: result.levelUp ? result.newLevel : null,
      isRecurring: !!(task.recurrenceType && task.recurrenceType !== 'none'),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// Delete task
router.delete('/:taskId', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId) {
      return res.status(404).json({ error: 'No current space' });
    }

    const taskId = BigInt(req.params.taskId);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.spaceId !== authReq.currentSpaceId) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export { router as tasksRouter };
