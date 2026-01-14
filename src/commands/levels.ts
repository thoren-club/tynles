import { prisma } from '../db';
import { AuthContext, ensureUser, requireSpace } from '../middleware/auth';
import { Bot } from 'grammy';
import { getXpProgress } from '../utils/xp';

export function setupLevelCommands(bot: Bot<AuthContext>) {
  bot.command('me', ensureUser, requireSpace, async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) return;

    const stats = await prisma.userSpaceStats.findUnique({
      where: {
        spaceId_userId: {
          spaceId: ctx.currentSpaceId,
          userId: ctx.user.id,
        },
      },
    });

    if (!stats) {
      return ctx.reply('Stats not found.');
    }

    const progress = getXpProgress(stats.totalXp);

    const message = `
📊 Your Stats:
Level: ${stats.level}
Total XP: ${stats.totalXp}
Progress to next level: ${progress.current}/${progress.current + progress.next} (${progress.progress}%)
`;

    await ctx.reply(message.trim());
  });

  bot.command('leaderboard', ensureUser, requireSpace, async (ctx) => {
    if (!ctx.currentSpaceId) return;

    const stats = await prisma.userSpaceStats.findMany({
      where: { spaceId: ctx.currentSpaceId },
      include: { user: true },
      orderBy: { totalXp: 'desc' },
      take: 10,
    });

    if (stats.length === 0) {
      return ctx.reply('No stats found.');
    }

    const leaderboard = stats
      .map((s, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        const name = s.user.firstName || s.user.username || 'Unknown';
        return `${medal} ${name} - Level ${s.level} (${s.totalXp} XP)`;
      })
      .join('\n');

    await ctx.reply(`🏆 Leaderboard:\n\n${leaderboard}`);
  });
}