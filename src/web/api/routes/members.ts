import { Router, Request, Response } from 'express';
import { prisma } from '../../../db';
import { AuthRequest } from '../middleware/auth';
import { randomBytes } from 'crypto';

const router = Router();

// Get members
router.get('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    // Поддерживаем получение участников конкретного Space через query параметр
    const spaceIdParam = req.query.spaceId as string | undefined;
    const targetSpaceId = spaceIdParam ? BigInt(spaceIdParam) : authReq.currentSpaceId;
    
    if (!targetSpaceId) {
      return res.status(404).json({ error: 'No space specified' });
    }

    // Проверяем, что пользователь является участником этого Space
    const userMember = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: targetSpaceId,
          userId: authReq.user!.id,
        },
      },
    });

    if (!userMember) {
      return res.status(403).json({ error: 'Not a member of this space' });
    }

    const members = await prisma.spaceMember.findMany({
      where: { spaceId: targetSpaceId },
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
    // Поддерживаем создание приглашения для конкретного Space через query параметр
    const spaceIdParam = req.query.spaceId as string | undefined;
    const targetSpaceId = spaceIdParam ? BigInt(spaceIdParam) : authReq.currentSpaceId;
    
    if (!targetSpaceId) {
      return res.status(404).json({ error: 'No space specified' });
    }

    // Check if user is Admin
    const member = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: targetSpaceId,
          userId: authReq.user!.id,
        },
      },
    });

    if (!member || member.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const { role } = req.body;
    if (!['Editor', 'Viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const code = randomBytes(8).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const invite = await prisma.invite.create({
      data: {
        spaceId: targetSpaceId,
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

// Update member role (Admin only)
router.put('/:userId/role', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    // Поддерживаем изменение роли в конкретном Space через query параметр
    const spaceIdParam = req.query.spaceId as string | undefined;
    const targetSpaceId = spaceIdParam ? BigInt(spaceIdParam) : authReq.currentSpaceId;
    
    if (!targetSpaceId) {
      return res.status(404).json({ error: 'No space specified' });
    }

    // Check if user is Admin of target space
    const currentMember = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: targetSpaceId,
          userId: authReq.user!.id,
        },
      },
    });

    if (!currentMember || currentMember.role !== 'Admin') {
      return res.status(403).json({ error: 'Admin role required' });
    }

    const userId = BigInt(req.params.userId);
    const { role } = req.body;

    if (!['Editor', 'Viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Cannot change own role
    if (userId === authReq.user!.id) {
      return res.status(400).json({ error: 'Cannot change own role' });
    }

    const updatedMember = await prisma.spaceMember.update({
      where: {
        spaceId_userId: {
          spaceId: targetSpaceId,
          userId,
        },
      },
      include: { user: true },
      data: { role },
    });

    res.json({
      id: updatedMember.user.id.toString(),
      username: updatedMember.user.username,
      firstName: updatedMember.user.firstName,
      role: updatedMember.role,
      joinedAt: updatedMember.joinedAt.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

export { router as membersRouter };
