import { Context } from 'grammy';
import { prisma } from '../db';
import { AuthContext, ensureUser, requireSpace, requireRole } from '../middleware/auth';
import { Bot } from 'grammy';
import { Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import { setCurrentSpace } from '../utils/session';

export function setupMemberCommands(bot: Bot<AuthContext>) {
  bot.command('invite_create', ensureUser, requireSpace, requireRole('Admin'), async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const roleStr = args?.[0]?.toLowerCase();

    if (!roleStr || !ctx.currentSpaceId || !ctx.user) {
      return ctx.reply('Usage: /invite_create <role> (Admin/Editor/Viewer)');
    }

    let role: Role;
    if (roleStr === 'admin') role = 'Admin';
    else if (roleStr === 'editor') role = 'Editor';
    else if (roleStr === 'viewer') role = 'Viewer';
    else {
      return ctx.reply('Invalid role. Use: Admin, Editor, or Viewer');
    }

    const code = randomBytes(8).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await prisma.invite.create({
      data: {
        spaceId: ctx.currentSpaceId,
        role,
        code,
        expiresAt,
        createdBy: ctx.user.id,
      },
    });

    await ctx.reply(`Invite code created!\n\nCode: ${code}\nRole: ${role}\nExpires: ${expiresAt.toLocaleString()}`);
  });

  bot.command('invite_use', ensureUser, async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const code = args?.[0];

    if (!code || !ctx.user) {
      return ctx.reply('Usage: /invite_use <code>');
    }

    const invite = await prisma.invite.findUnique({
      where: { code },
      include: { space: true },
    });

    if (!invite) {
      return ctx.reply('Invalid invite code.');
    }

    if (invite.expiresAt < new Date()) {
      return ctx.reply('This invite code has expired.');
    }

    const existingMember = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: invite.spaceId,
          userId: ctx.user.id,
        },
      },
    });

    if (existingMember) {
      return ctx.reply('You are already a member of this space.');
    }

    await prisma.spaceMember.create({
      data: {
        spaceId: invite.spaceId,
        userId: ctx.user.id,
        role: invite.role,
      },
    });

    await prisma.userSpaceStats.upsert({
      where: {
        spaceId_userId: {
          spaceId: invite.spaceId,
          userId: ctx.user.id,
        },
      },
      create: {
        spaceId: invite.spaceId,
        userId: ctx.user.id,
        totalXp: 0,
        level: 1,
      },
      update: {},
    });

    setCurrentSpace(ctx.user.id, invite.spaceId);

    await ctx.reply(`You joined space: ${invite.space.name} (Role: ${invite.role})`);
  });

  bot.command('members', ensureUser, requireSpace, async (ctx) => {
    if (!ctx.currentSpaceId) return;

    const members = await prisma.spaceMember.findMany({
      where: { spaceId: ctx.currentSpaceId },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });

    const membersList = members
      .map((m) => `- ${m.user.firstName || m.user.username || 'Unknown'} (@${m.user.username || 'no username'}) - ${m.role}`)
      .join('\n');

    await ctx.reply(`Members:\n\n${membersList}`);
  });

  bot.command('member_role', ensureUser, requireSpace, requireRole('Admin'), async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const username = args?.[0]?.replace('@', '');
    const roleStr = args?.[1]?.toLowerCase();

    if (!username || !roleStr || !ctx.currentSpaceId) {
      return ctx.reply('Usage: /member_role <username> <role>');
    }

    let role: Role;
    if (roleStr === 'admin') role = 'Admin';
    else if (roleStr === 'editor') role = 'Editor';
    else if (roleStr === 'viewer') role = 'Viewer';
    else {
      return ctx.reply('Invalid role. Use: Admin, Editor, or Viewer');
    }

    const targetUser = await prisma.telegramUser.findFirst({
      where: { username },
    });

    if (!targetUser) {
      return ctx.reply('User not found.');
    }

    const member = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: ctx.currentSpaceId,
          userId: targetUser.id,
        },
      },
    });

    if (!member) {
      return ctx.reply('User is not a member of this space.');
    }

    await prisma.spaceMember.update({
      where: {
        spaceId_userId: {
          spaceId: ctx.currentSpaceId,
          userId: targetUser.id,
        },
      },
      data: { role },
    });

    await ctx.reply(`Role updated: ${username} is now ${role}`);
  });

  bot.command('member_kick', ensureUser, requireSpace, requireRole('Admin'), async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const username = args?.[0]?.replace('@', '');

    if (!username || !ctx.currentSpaceId || !ctx.user) {
      return ctx.reply('Usage: /member_kick <username>');
    }

    const targetUser = await prisma.telegramUser.findFirst({
      where: { username },
    });

    if (!targetUser) {
      return ctx.reply('User not found.');
    }

    if (targetUser.id === ctx.user.id) {
      return ctx.reply('You cannot kick yourself.');
    }

    const member = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: ctx.currentSpaceId,
          userId: targetUser.id,
        },
      },
    });

    if (!member) {
      return ctx.reply('User is not a member of this space.');
    }

    await prisma.spaceMember.delete({
      where: {
        spaceId_userId: {
          spaceId: ctx.currentSpaceId,
          userId: targetUser.id,
        },
      },
    });

    await ctx.reply(`User ${username} has been removed from the space.`);
  });
}