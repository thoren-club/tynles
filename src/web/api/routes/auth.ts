import { Router, Request, Response } from 'express';
import { prisma } from '../../../db';
import { getUserLanguage } from '../../../utils/language';
import { setCurrentSpace, getCurrentSpace } from '../../../utils/session';

const router = Router();

// Get current user info
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.telegramUser.findUnique({
      where: { id: authReq.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id.toString(),
      tgId: user.tgId.toString(),
      username: user.username,
      firstName: user.firstName,
      language: user.language,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Get user's spaces
router.get('/spaces', async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const members = await prisma.spaceMember.findMany({
      where: { userId: authReq.user.id },
      include: { space: true },
      orderBy: { joinedAt: 'asc' },
    });

    const currentSpaceId = getCurrentSpace(authReq.user.id);

    res.json({
      spaces: members.map((m) => ({
        id: m.space.id.toString(),
        name: m.space.name,
        role: m.role,
        isCurrent: currentSpaceId === m.space.id,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get spaces' });
  }
});

// Set current space
router.post('/spaces/:spaceId/switch', async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const spaceId = BigInt(req.params.spaceId);

    // Verify user is member
    const member = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId: authReq.user.id,
        },
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this space' });
    }

    setCurrentSpace(authReq.user.id, spaceId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to switch space' });
  }
});

export { router as authRouter };
