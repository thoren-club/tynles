import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../db';
import { AuthRequest } from '../middleware/auth';
import { calculateTaskXp, calculateLevel } from '../../../types';
import { addXp } from '../../../utils/xp';

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
        recurrencePayload: task.recurrencePayload as any || null,
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

    const { title, difficulty, xp, dueAt, description, isRecurring, daysOfWeek } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Обработка повторяющейся задачи
    let recurrenceType: string | null = null;
    let recurrencePayload: Prisma.InputJsonValue | Prisma.JsonNullValueInput | null = null;
    
    if (isRecurring && daysOfWeek && daysOfWeek.length > 0) {
      // Определяем тип повторения: ежедневная (7 дней) или еженедельная (меньше 7)
      if (daysOfWeek.length === 7) {
        recurrenceType = 'daily';
      } else {
        recurrenceType = 'weekly';
      }
      recurrencePayload = { daysOfWeek: daysOfWeek };
    } else {
      // Используем Prisma.JsonNull для явного null в Json поле
      recurrencePayload = Prisma.JsonNull;
    }

    // Рассчитываем XP автоматически, если не передано
    const taskDifficulty = difficulty || 1;
    const taskRecurrenceType = recurrenceType || 'none';
    const calculatedXp = xp !== undefined ? xp : calculateTaskXp(taskDifficulty, taskRecurrenceType);

    const task = await prisma.task.create({
      data: {
        spaceId: authReq.currentSpaceId,
        title: title || 'Задача',
        difficulty: taskDifficulty,
        xp: calculatedXp,
        dueAt: dueAt ? new Date(dueAt) : null,
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

    // Для повторяющихся задач не удаляем, а обновляем updatedAt (будет использоваться как lastCompletedAt)
    // Для одноразовых задач удаляем
    if (task.recurrenceType && task.recurrenceType !== 'none') {
      // Обновляем updatedAt для отслеживания времени последнего выполнения
      await prisma.task.update({
        where: { id: taskId },
        data: { updatedAt: new Date() },
      });
    } else {
      // Удаляем одноразовую задачу
      await prisma.task.delete({
        where: { id: taskId },
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
