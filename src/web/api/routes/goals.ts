import { Router, Request, Response } from 'express';
import { prisma } from '../../../db';
import { AuthRequest } from '../middleware/auth';
import { addXp } from '../../../utils/xp';
import { sendTelegramMessage } from '../../../utils/telegram';

const router = Router();

async function notifySpaceMembers(spaceId: bigint, message: string) {
  const members = await prisma.spaceMember.findMany({
    where: { spaceId },
    include: { user: true },
  });
  await Promise.all(
    members.map((m) => sendTelegramMessage(m.user.tgId, message))
  );
}

// Get all goals
router.get('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId) {
      return res.status(404).json({ error: 'No current space' });
    }

    const goals = await prisma.goal.findMany({
      where: { spaceId: authReq.currentSpaceId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      goals: goals.map((goal) => ({
        id: goal.id.toString(),
        title: goal.title,
        difficulty: goal.difficulty,
        xp: goal.xp,
        isDone: goal.isDone,
        createdAt: goal.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get goals' });
  }
});

// Create goal
router.post('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId) {
      return res.status(404).json({ error: 'No current space' });
    }

    const { title, difficulty, xp, description, deadline, type } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const goal = await prisma.goal.create({
      data: {
        spaceId: authReq.currentSpaceId,
        title: title || 'Цель',
        difficulty: difficulty || 1,
        xp: xp || 0,
        createdBy: authReq.user!.id,
      },
    });

    const actorName = authReq.user?.firstName || authReq.user?.username || 'Кто-то';
    await notifySpaceMembers(
      authReq.currentSpaceId,
      `🎯 В пространстве появилась новая цель: <b>${goal.title}</b>\nИнициатор: <b>${actorName}</b>`,
    );

    res.json({
      id: goal.id.toString(),
      title: goal.title,
      difficulty: goal.difficulty,
      xp: goal.xp,
      isDone: goal.isDone,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Toggle goal completion
router.post('/:goalId/toggle', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId || !authReq.user) {
      return res.status(404).json({ error: 'No current space' });
    }

    const goalId = BigInt(req.params.goalId);

    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal || goal.spaceId !== authReq.currentSpaceId) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const newIsDone = !goal.isDone;

    // If marking as done, add XP
    if (newIsDone && !goal.isDone) {
      // Update user stats with XP using the utility function
      await addXp(authReq.currentSpaceId, authReq.user.id, goal.xp);
    }

    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: { isDone: newIsDone },
    });

    const actorName = authReq.user?.firstName || authReq.user?.username || 'Кто-то';
    await notifySpaceMembers(
      authReq.currentSpaceId,
      updatedGoal.isDone
        ? `✅ Цель выполнена: <b>${updatedGoal.title}</b>\nИнициатор: <b>${actorName}</b>`
        : `↩️ Выполнение цели отменено: <b>${updatedGoal.title}</b>\nИнициатор: <b>${actorName}</b>`,
    );

    res.json({
      id: updatedGoal.id.toString(),
      title: updatedGoal.title,
      difficulty: updatedGoal.difficulty,
      xp: updatedGoal.xp,
      isDone: updatedGoal.isDone,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle goal' });
  }
});

// Delete goal
router.delete('/:goalId', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId) {
      return res.status(404).json({ error: 'No current space' });
    }

    const goalId = BigInt(req.params.goalId);

    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal || goal.spaceId !== authReq.currentSpaceId) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    await prisma.goal.delete({
      where: { id: goalId },
    });

    const actorName = authReq.user?.firstName || authReq.user?.username || 'Кто-то';
    await notifySpaceMembers(
      authReq.currentSpaceId,
      `🗑️ Цель удалена: <b>${goal.title}</b>\nИнициатор: <b>${actorName}</b>`,
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

export { router as goalsRouter };
