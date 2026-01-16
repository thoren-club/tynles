import { Router, Request, Response } from 'express';
import { prisma } from '../../../db';
import { AuthRequest } from '../middleware/auth';
import { randomBytes } from 'crypto';

const router = Router();

// Get members
router.get('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId) {
      return res.status(404).json({ error: 'No current space' });
    }

    const members = await prisma.spaceMember.findMany({
      where: { spaceId: authReq.currentSpaceId },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });

    res.json({
      members: members.map((m) => ({
        id: m.user.id.toString(),
        username: m.user.username,
        firstName: m.user.firstName,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get members' });
  }
});

// Create invite
router.post('/invites', async (req: Request, res: Response) => {
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

    const { role } = req.body;
    if (!['Admin', 'Editor', 'Viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const code = randomBytes(8).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const invite = await prisma.invite.create({
      data: {
        spaceId: authReq.currentSpaceId,
        role,
        code,
        expiresAt,
        createdBy: authReq.user!.id,
      },
    });

    res.json({
      code: invite.code,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

export { router as membersRouter };
