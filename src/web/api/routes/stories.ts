import { Router, Request, Response } from 'express';
import { prisma } from '../../../db';
import { AuthRequest } from '../middleware/auth';
import { generateStoryForUser } from '../../../utils/story-generator';

const router = Router();

/**
 * Получает начало текущей недели (понедельник)
 */
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Get stories for current user in current space
router.get('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || !authReq.currentSpaceId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Проверяем, есть ли история для текущей недели, если нет - создаем
    const weekStart = getWeekStart();
    const currentWeekStory = await prisma.story.findFirst({
      where: {
        spaceId: authReq.currentSpaceId,
        userId: authReq.user.id,
        type: 'Weekly',
        weekStartDate: weekStart,
      },
    });

    // Если нет истории за текущую неделю, создаем её автоматически
    if (!currentWeekStory) {
      try {
        await generateStoryForUser(authReq.currentSpaceId, authReq.user.id, weekStart);
      } catch (error) {
        console.error('Failed to auto-generate story:', error);
        // Не прерываем выполнение, просто логируем ошибку
      }
    }

    const stories = await prisma.story.findMany({
      where: {
        spaceId: authReq.currentSpaceId,
        userId: authReq.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10, // Последние 10 историй
    });

    res.json({
      stories: stories.map((story) => ({
        id: story.id.toString(),
        type: story.type,
        data: story.data as any,
        weekStartDate: story.weekStartDate.toISOString(),
        createdAt: story.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Failed to get stories:', error);
    res.status(500).json({ error: 'Failed to get stories' });
  }
});

export { router as storiesRouter };
