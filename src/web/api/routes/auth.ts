import { Router, Response } from 'express';
import { prisma } from '../../../db';
import { getUserLanguage } from '../../../utils/language';
import { setCurrentSpace, getCurrentSpace } from '../../../utils/session';
import { AuthRequest } from '../middleware/auth';
import { getUserRole, UserRole } from '../../../utils/user-role';

const router = Router();

// Get current user info
router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.telegramUser.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Определяем роль пользователя
    const role = getUserRole(user.tgId);

    res.json({
      id: user.id.toString(),
      tgId: user.tgId.toString(),
      username: user.username,
      firstName: user.firstName,
      language: user.language,
      role: role,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Get user's spaces
router.get('/spaces', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const members = await prisma.spaceMember.findMany({
      where: { userId: req.user.id },
      include: { space: true },
      orderBy: { joinedAt: 'asc' },
    });

    const currentSpaceId = getCurrentSpace(req.user.id);

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

// Use invite code
router.post('/invites/use', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const invite = await prisma.invite.findUnique({
      where: { code },
      include: { space: true },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This invite code has expired' });
    }

    const existingMember = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: invite.spaceId,
          userId: req.user.id,
        },
      },
    });

    if (existingMember) {
      return res.status(400).json({ error: 'You are already a member of this space' });
    }

    await prisma.spaceMember.create({
      data: {
        spaceId: invite.spaceId,
        userId: req.user.id,
        role: invite.role,
      },
    });

    await prisma.userSpaceStats.upsert({
      where: {
        spaceId_userId: {
          spaceId: invite.spaceId,
          userId: req.user.id,
        },
      },
      create: {
        spaceId: invite.spaceId,
        userId: req.user.id,
        totalXp: 0,
        level: 1,
      },
      update: {},
    });

    // Set as current space
    setCurrentSpace(req.user.id, invite.spaceId);

    res.json({
      success: true,
      space: {
        id: invite.space.id.toString(),
        name: invite.space.name,
        role: invite.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to use invite code' });
  }
});

// Set current space
router.post('/spaces/:spaceId/switch', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const spaceId = BigInt(req.params.spaceId);

    // Verify user is member
    const member = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId: req.user.id,
        },
      },
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this space' });
    }

    setCurrentSpace(req.user.id, spaceId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to switch space' });
  }
});

// Update user name
router.put('/me', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { firstName } = req.body;

    if (!firstName || typeof firstName !== 'string') {
      return res.status(400).json({ error: 'FirstName is required' });
    }

    const updatedUser = await prisma.telegramUser.update({
      where: { id: req.user.id },
      data: { firstName: firstName.trim() },
    });

    // Определяем роль пользователя
    const role = getUserRole(updatedUser.tgId);

    res.json({
      id: updatedUser.id.toString(),
      tgId: updatedUser.tgId.toString(),
      username: updatedUser.username,
      firstName: updatedUser.firstName,
      language: updatedUser.language,
      role: role,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user name' });
  }
});

export { router as authRouter };
