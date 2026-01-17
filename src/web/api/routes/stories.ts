import { Router, Request, Response } from 'express';
import { prisma } from '../../../db';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Get stories for current user in current space
router.get('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user || !authReq.currentSpaceId) {
      return res.status(401).json({ error: 'Not authenticated' });
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
