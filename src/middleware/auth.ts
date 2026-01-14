import { Context, NextFunction } from 'grammy';
import { prisma } from '../db';
import { Role } from '@prisma/client';
import { getCurrentSpace } from '../utils/session';

export interface AuthContext extends Context {
  user?: {
    id: bigint;
    tgId: bigint;
    username?: string | null;
    firstName?: string | null;
    language?: string;
  };
  currentSpaceId?: bigint;
  userRole?: Role;
}

export async function ensureUser(ctx: AuthContext, next: NextFunction) {
  if (!ctx.from) {
    return ctx.reply('User not found');
  }

  let user = await prisma.telegramUser.findUnique({
    where: { tgId: BigInt(ctx.from.id) },
  });

  if (!user) {
    user = await prisma.telegramUser.create({
      data: {
        tgId: BigInt(ctx.from.id),
        username: ctx.from.username || null,
        firstName: ctx.from.first_name || null,
      },
    });
  } else {
    // Update user info if changed
    await prisma.telegramUser.update({
      where: { id: user.id },
      data: {
        username: ctx.from.username || null,
        firstName: ctx.from.first_name || null,
      },
    });
  }

  ctx.user = {
    id: user.id,
    tgId: user.tgId,
    username: user.username,
    firstName: user.firstName,
  };

  return next();
}

export async function requireSpace(ctx: AuthContext, next: NextFunction) {
  if (!ctx.user) {
    return ctx.reply('User not authenticated');
  }

  // Try to get current space from session, or use first space
  let spaceId = getCurrentSpace(ctx.user.id);
  let member;

  if (spaceId) {
    member = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId: ctx.user.id,
        },
      },
      include: { space: true },
    });
  }

  if (!member) {
    // Use first space as fallback
    member = await prisma.spaceMember.findFirst({
      where: { userId: ctx.user.id },
      include: { space: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (!member) {
      return ctx.reply('You are not a member of any space. Use /space_create to create one.');
    }
  }

  ctx.currentSpaceId = member.spaceId;
  ctx.userRole = member.role;

  return next();
}

export function requireRole(requiredRole: Role) {
  return async (ctx: AuthContext, next: NextFunction) => {
    if (!ctx.userRole) {
      return ctx.reply('You are not a member of any space.');
    }

    const roleHierarchy: Record<Role, number> = {
      Viewer: 1,
      Editor: 2,
      Admin: 3,
    };

    if (roleHierarchy[ctx.userRole] < roleHierarchy[requiredRole]) {
      return ctx.reply(`This command requires ${requiredRole} role or higher. Your role: ${ctx.userRole}`);
    }

    return next();
  };
}