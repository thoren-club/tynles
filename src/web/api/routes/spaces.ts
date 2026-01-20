import { Router, Request, Response } from 'express';
import { prisma } from '../../../db';
import { AuthRequest } from '../middleware/auth';
import { getUserLanguage } from '../../../utils/language';
import { setCurrentSpace } from '../../../utils/session';
import { notifyUser } from '../../../notifications';

const router = Router();

// Get current space info
router.get('/current', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId) {
      return res.status(404).json({ error: 'No current space' });
    }

    const space = await prisma.space.findUnique({
      where: { id: authReq.currentSpaceId },
      include: {
        members: {
          include: { user: true },
        },
        _count: {
          select: {
            tasks: true,
            goals: true,
          },
        },
      },
    });

    if (!space) {
      return res.status(404).json({ error: 'Space not found' });
    }

    const member = space.members.find((m) => m.userId === authReq.user!.id);

    res.json({
      id: space.id.toString(),
      name: space.name,
      timezone: space.timezone,
      role: member?.role,
      isOwner: space.ownerUserId === authReq.user!.id,
      avatarUrl: space.avatarUrl || null,
      stats: {
        tasks: space._count.tasks,
        goals: space._count.goals,
        members: space.members.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get space info' });
  }
});

// Create space
router.post('/create', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }

    const space = await prisma.space.create({
      data: {
        name,
        ownerUserId: authReq.user!.id,
        timezone: 'Europe/Berlin',
      },
    });

    await prisma.spaceMember.create({
      data: {
        spaceId: space.id,
        userId: authReq.user!.id,
        role: 'Admin',
      },
    });

    await prisma.userSpaceStats.create({
      data: {
        spaceId: space.id,
        userId: authReq.user!.id,
        totalXp: 0,
        level: 1,
      },
    });

    setCurrentSpace(authReq.user!.id, space.id);

    res.json({
      id: space.id.toString(),
      name: space.name,
      role: 'Admin',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create space' });
  }
});

// Switch space
router.post('/:spaceId/switch', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const spaceId = BigInt(req.params.spaceId);

    const member = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId: authReq.user!.id,
        },
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this space' });
    }

    setCurrentSpace(authReq.user!.id, spaceId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to switch space' });
  }
});

// Get space leaderboard (based on completed tasks in last 30 days)
router.get('/current/leaderboard', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId) {
      return res.status(404).json({ error: 'No current space' });
    }

    const spaceId = authReq.currentSpaceId;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Получаем всех участников пространства со статистикой
    const stats = await prisma.userSpaceStats.findMany({
      where: { spaceId },
      include: { user: true },
      orderBy: { totalXp: 'desc' },
    });

    // TODO: После добавления таблицы TaskCompletion использовать реальный подсчёт
    // Пока используем приблизительную оценку на основе опыта
    // Средняя задача даёт ~50 XP, поэтому делим totalXp на 50 для оценки количества задач
    const AVERAGE_XP_PER_TASK = 50;

    const leaderboard = stats.map((s) => {
      // Приблизительная оценка количества выполненных задач за 30 дней
      // Используем totalXp как прокси, так как нет истории выполнения
      const estimatedTasksCompleted = Math.floor(s.totalXp / AVERAGE_XP_PER_TASK);

      return {
        userId: s.userId.toString(),
        username: s.user.username,
        firstName: s.user.firstName,
        level: s.level,
        totalXp: s.totalXp,
        tasksCompleted30Days: estimatedTasksCompleted, // TODO: заменить на реальный подсчёт
      };
    });

    // Сортируем по количеству выполненных задач за 30 дней (убывание)
    leaderboard.sort((a, b) => b.tasksCompleted30Days - a.tasksCompleted30Days);

    // Добавляем позиции после сортировки
    const leaderboardWithPositions = leaderboard.map((entry, index) => ({
      ...entry,
      position: index + 1,
    }));

    res.json({
      leaderboard: leaderboardWithPositions,
      periodDays: 30,
      note: 'Tasks count is estimated based on total XP. Real task completion tracking will be available after database migration.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get space leaderboard' });
  }
});

// Get level rewards for space
router.get('/current/rewards', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId) {
      return res.status(404).json({ error: 'No current space' });
    }

    const rewards = await prisma.reward.findMany({
      where: { spaceId: authReq.currentSpaceId },
      orderBy: { level: 'asc' },
    });

    res.json({
      rewards: rewards.map((r) => ({
        level: r.level,
        text: r.text,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get level rewards' });
  }
});

// Get level rewards for specific space
router.get('/:spaceId/rewards', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const spaceId = BigInt(req.params.spaceId);

    // Проверяем, что пользователь является участником этого пространства
    const member = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: spaceId,
          userId: authReq.user.id,
        },
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this space' });
    }

    const rewards = await prisma.reward.findMany({
      where: { spaceId: spaceId },
      orderBy: { level: 'asc' },
    });

    res.json({
      rewards: rewards.map((r) => ({
        level: r.level,
        text: r.text,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get level rewards' });
  }
});

// Delete space by ID (Owner only)
router.delete('/:spaceId', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const spaceId = BigInt(req.params.spaceId);

    // Получаем информацию о пространстве
    const space = await prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!space) {
      return res.status(404).json({ error: 'Space not found' });
    }

    // Проверяем, что пользователь - владелец пространства
    if (space.ownerUserId !== authReq.user.id) {
      return res.status(403).json({ error: 'Only space owner can delete the space' });
    }

    // Персональный Space нельзя удалить
    if (space.name === 'Персональный') {
      return res.status(403).json({ error: 'Персональный Space нельзя удалить' });
    }

    // Проверяем, что пользователь является участником этого пространства
    const member = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: spaceId,
          userId: authReq.user.id,
        },
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this space' });
    }

    // Удаляем пространство (каскадное удаление удалит всех участников, задачи, цели и т.д.)
    await prisma.space.delete({
      where: { id: spaceId },
    });

    // Если удаляемое пространство - текущее активное, очищаем session
    if (authReq.currentSpaceId === spaceId) {
      setCurrentSpace(authReq.user.id, undefined);
    }

    await notifyUser({
      userId: authReq.user.id,
      message: `🗑️ Пространство <b>${space.name}</b> удалено.`,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete space:', error);
    res.status(500).json({ error: 'Failed to delete space' });
  }
});

// Get space info by ID
router.get('/:spaceId/info', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const spaceId = BigInt(req.params.spaceId);

    const space = await prisma.space.findUnique({
      where: { id: spaceId },
      include: {
        members: {
          where: { userId: authReq.user.id },
        },
      },
    });

    if (!space) {
      return res.status(404).json({ error: 'Space not found' });
    }

    // Проверяем, что пользователь является участником
    const member = space.members[0];
    if (!member) {
      return res.status(403).json({ error: 'Not a member of this space' });
    }

    res.json({
      id: space.id.toString(),
      name: space.name,
      role: member.role,
      isOwner: space.ownerUserId === authReq.user.id,
      avatarUrl: space.avatarUrl || null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get space info' });
  }
});

// Update space avatar
router.put('/:spaceId/avatar', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const spaceId = BigInt(req.params.spaceId);
    const { avatarData } = req.body as { avatarData?: string | null };
    if (!avatarData || typeof avatarData !== 'string') {
      return res.status(400).json({ error: 'avatarData is required' });
    }

    const member = await prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: authReq.user.id } },
    });
    if (!member || (member.role !== 'Admin' && member.role !== 'Editor')) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const maxLength = 8 * 1024 * 1024;
    if (avatarData.length > maxLength) {
      return res.status(400).json({ error: 'Avatar is too large' });
    }

    await prisma.space.update({
      where: { id: spaceId },
      data: { avatarUrl: avatarData },
    });

    res.json({ success: true, avatarUrl: avatarData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// Update level reward for specific space (Admin only)
router.put('/:spaceId/rewards/:level', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const spaceId = BigInt(req.params.spaceId);

    // Check if user is Admin of this space
    const member = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: spaceId,
          userId: authReq.user.id,
        },
      },
    });

    if (!member || member.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const level = parseInt(req.params.level);
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (level < 1 || level > 80) {
      return res.status(400).json({ error: 'Level must be between 1 and 80' });
    }

    const reward = await prisma.reward.upsert({
      where: {
        spaceId_level: {
          spaceId: spaceId,
          level,
        },
      },
      update: {
        text,
      },
      create: {
        spaceId: spaceId,
        level,
        text,
      },
    });

    res.json({
      level: reward.level,
      text: reward.text,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update level reward' });
  }
});

// Update level reward (Admin only) - для обратной совместимости с текущим пространством
router.put('/current/rewards/:level', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId) {
      return res.status(404).json({ error: 'No current space' });
    }

    // Check if user is Admin
    const member = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: authReq.currentSpaceId,
          userId: authReq.user!.id,
        },
      },
    });

    if (!member || member.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const level = parseInt(req.params.level);
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (level < 1 || level > 80) {
      return res.status(400).json({ error: 'Level must be between 1 and 80' });
    }

    const reward = await prisma.reward.upsert({
      where: {
        spaceId_level: {
          spaceId: authReq.currentSpaceId,
          level,
        },
      },
      update: {
        text,
      },
      create: {
        spaceId: authReq.currentSpaceId,
        level,
        text,
      },
    });

    res.json({
      level: reward.level,
      text: reward.text,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update level reward' });
  }
});

export { router as spacesRouter };
