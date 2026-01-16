import { Router, Request, Response } from 'express';
import { prisma } from '../../../db';
import { AuthRequest } from '../middleware/auth';
import { getUserLanguage } from '../../../utils/language';
import { setCurrentSpace } from '../../../utils/session';

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

export { router as spacesRouter };
