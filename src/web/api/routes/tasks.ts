import { Router, Request, Response } from 'express';
import { prisma } from '../../../db';
import { AuthRequest } from '../middleware/auth';

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
        createdAt: task.createdAt.toISOString(),
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

    const { title, difficulty, xp, dueAt } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const task = await prisma.task.create({
      data: {
        spaceId: authReq.currentSpaceId,
        title,
        difficulty: difficulty || 1,
        xp: xp || 0,
        dueAt: dueAt ? new Date(dueAt) : null,
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
