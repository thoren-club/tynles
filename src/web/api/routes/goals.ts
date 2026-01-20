import { Router, Request, Response } from 'express';
import { prisma } from '../../../db';
import { AuthRequest } from '../middleware/auth';
import { addXp } from '../../../utils/xp';
import { notifySpaceMembers } from '../../../notifications';

const router = Router();

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
        assigneeUserId: goal.assigneeUserId?.toString() || null,
        assigneeScope: (goal.assigneeScope as any) || 'space',
        targetType: (goal.targetType as any) || 'unlimited',
        targetYear: goal.targetYear || null,
        targetMonth: goal.targetMonth || null,
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

    const { title, difficulty, xp, assigneeUserId, assigneeScope, targetType, targetYear, targetMonth } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    let resolvedAssigneeId: bigint | null = null;
    const resolvedAssigneeScope = assigneeScope === 'user' ? 'user' : 'space';
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

    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    const isPlaceholderTitle = ['цель', 'goal'].includes(trimmedTitle.toLowerCase());
    const goal = await prisma.goal.create({
      data: {
        spaceId: authReq.currentSpaceId,
        title: trimmedTitle || 'Цель',
        difficulty: difficulty || 1,
        xp: xp || 0,
        assigneeUserId: resolvedAssigneeId,
        assigneeScope: resolvedAssigneeScope,
        targetType: targetType || 'unlimited',
        targetYear: targetType === 'unlimited' ? null : targetYear || null,
        targetMonth: targetType === 'month' ? targetMonth || null : null,
        createdBy: authReq.user!.id,
      },
    });

    if (trimmedTitle && !isPlaceholderTitle) {
      const actorName = authReq.user?.firstName || authReq.user?.username || 'Кто-то';
      await notifySpaceMembers(
        authReq.currentSpaceId,
        `🎯 В пространстве появилась новая цель: <b>${goal.title}</b>\nИнициатор: <b>${actorName}</b>`,
      );
    }

    res.json({
      id: goal.id.toString(),
      title: goal.title,
      difficulty: goal.difficulty,
      xp: goal.xp,
      isDone: goal.isDone,
      assigneeUserId: goal.assigneeUserId?.toString() || null,
      assigneeScope: goal.assigneeScope || 'space',
      targetType: goal.targetType || 'unlimited',
      targetYear: goal.targetYear || null,
      targetMonth: goal.targetMonth || null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Update goal
router.put('/:goalId', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId) {
      return res.status(404).json({ error: 'No current space' });
    }

    const goalId = BigInt(req.params.goalId);
    const { title, difficulty, xp, assigneeUserId, assigneeScope, targetType, targetYear, targetMonth } = req.body;

    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.spaceId !== authReq.currentSpaceId) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    let resolvedAssigneeId: bigint | null = null;
    const resolvedAssigneeScope = assigneeScope === 'user' ? 'user' : 'space';
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

    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        title: title || undefined,
        difficulty: typeof difficulty === 'number' ? difficulty : undefined,
        xp: typeof xp === 'number' ? xp : undefined,
        assigneeUserId: resolvedAssigneeId,
        assigneeScope: resolvedAssigneeScope,
        targetType: targetType || undefined,
        targetYear: targetType === 'unlimited' ? null : targetYear || null,
        targetMonth: targetType === 'month' ? targetMonth || null : null,
      },
    });

    res.json({
      id: updatedGoal.id.toString(),
      title: updatedGoal.title,
      difficulty: updatedGoal.difficulty,
      xp: updatedGoal.xp,
      isDone: updatedGoal.isDone,
      assigneeUserId: updatedGoal.assigneeUserId?.toString() || null,
      assigneeScope: updatedGoal.assigneeScope || 'space',
      targetType: updatedGoal.targetType || 'unlimited',
      targetYear: updatedGoal.targetYear || null,
      targetMonth: updatedGoal.targetMonth || null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update goal' });
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
      await prisma.taskCompletion.create({
        data: {
          taskId: goal.id,
          spaceId: authReq.currentSpaceId,
          userId: authReq.user.id,
          xp: goal.xp,
        },
      });
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
