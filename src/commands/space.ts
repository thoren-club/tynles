import { Context } from 'grammy';
import { prisma } from '../db';
import { AuthContext, ensureUser, requireSpace } from '../middleware/auth';
import { Bot } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { setCurrentSpace } from '../utils/session';

export function setupSpaceCommands(bot: Bot<AuthContext>) {
  bot.command('space_create', ensureUser, async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const name = args?.join(' ') || 'My Space';

    if (!ctx.user) return;

    const space = await prisma.space.create({
      data: {
        name,
        ownerUserId: ctx.user.id,
        timezone: 'Europe/Berlin',
      },
    });

    await prisma.spaceMember.create({
      data: {
        spaceId: space.id,
        userId: ctx.user.id,
        role: 'Admin',
      },
    });

    await prisma.userSpaceStats.create({
      data: {
        spaceId: space.id,
        userId: ctx.user.id,
        totalXp: 0,
        level: 1,
      },
    });

    setCurrentSpace(ctx.user.id, space.id);

    await ctx.reply(`Space "${name}" created! ID: ${space.id}`);
  });

  bot.command('space_list', ensureUser, async (ctx) => {
    if (!ctx.user) return;

    const members = await prisma.spaceMember.findMany({
      where: { userId: ctx.user.id },
      include: { space: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (members.length === 0) {
      return ctx.reply('You are not a member of any space. Use /space_create to create one.');
    }

    const spacesList = members
      .map((m, idx) => `${idx + 1}. ${m.space.name} (ID: ${m.space.id}) - ${m.role}`)
      .join('\n');

    await ctx.reply(`Your spaces:\n\n${spacesList}\n\nUse /space_switch <id> to switch`);
  });

  bot.command('space_switch', ensureUser, async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const spaceIdStr = args?.[0];

    if (!spaceIdStr || !ctx.user) {
      return ctx.reply('Usage: /space_switch <space_id>');
    }

    const spaceId = BigInt(spaceIdStr);

    const member = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId: ctx.user.id,
        },
      },
      include: { space: true },
    });

    if (!member) {
      return ctx.reply('You are not a member of this space.');
    }

    setCurrentSpace(ctx.user.id, spaceId);
    ctx.currentSpaceId = spaceId;
    ctx.userRole = member.role;

    await ctx.reply(`Switched to space: ${member.space.name}`);
  });

  bot.command('space_info', ensureUser, requireSpace, async (ctx) => {
    if (!ctx.currentSpaceId || !ctx.user) return;

    const space = await prisma.space.findUnique({
      where: { id: ctx.currentSpaceId },
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

    if (!space) return;

    const member = space.members.find((m) => m.userId === ctx.user!.id);
    const stats = await prisma.userSpaceStats.findUnique({
      where: {
        spaceId_userId: {
          spaceId: ctx.currentSpaceId,
          userId: ctx.user.id,
        },
      },
    });

    const info = `
Space: ${space.name}
ID: ${space.id}
Timezone: ${space.timezone}
Your role: ${member?.role || 'Unknown'}
Your level: ${stats?.level || 1}
Your XP: ${stats?.totalXp || 0}
Tasks: ${space._count.tasks}
Goals: ${space._count.goals}
Members: ${space.members.length}
`;

    await ctx.reply(info.trim());
  });
}