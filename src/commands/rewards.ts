import { prisma } from '../db';
import { AuthContext, ensureUser, requireSpace, requireRole } from '../middleware/auth';
import { Bot, InlineKeyboard } from 'grammy';
import { getSettingsMenu } from '../menu';
import { getUserLanguage } from '../utils/language';
import { getWizardState, setWizardState, clearWizardState } from '../utils/wizard';

export function setupRewardCommands(bot: Bot<AuthContext>) {
  bot.command('reward_set', ensureUser, requireSpace, requireRole('Admin'), async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const levelStr = args?.[0];
    const text = args?.slice(1).join(' ');

    if (!levelStr || !text || !ctx.currentSpaceId) {
      return ctx.reply('Usage: /reward_set <level> <text>');
    }

    const level = parseInt(levelStr);
    if (isNaN(level) || level < 1) {
      return ctx.reply('Invalid level. Must be a positive number.');
    }

    await prisma.reward.upsert({
      where: {
        spaceId_level: {
          spaceId: ctx.currentSpaceId,
          level,
        },
      },
      create: {
        spaceId: ctx.currentSpaceId,
        level,
        text,
      },
      update: {
        text,
      },
    });

    await ctx.reply(`Reward for level ${level} set: ${text}`);
  });

  bot.command('reward_list', ensureUser, requireSpace, async (ctx) => {
    if (!ctx.currentSpaceId) return;

    const rewards = await prisma.reward.findMany({
      where: { spaceId: ctx.currentSpaceId },
      orderBy: { level: 'asc' },
    });

    if (rewards.length === 0) {
      return ctx.reply('No rewards set.');
    }

    const rewardsList = rewards
      .map((r) => `Level ${r.level}: ${r.text}`)
      .join('\n\n');

    await ctx.reply(`🎁 Rewards:\n\n${rewardsList}`);
  });

  bot.command('reward_delete', ensureUser, requireSpace, requireRole('Admin'), async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const levelStr = args?.[0];

    if (!levelStr || !ctx.currentSpaceId) {
      return ctx.reply('Usage: /reward_delete <level>');
    }

    const level = parseInt(levelStr);
    if (isNaN(level)) {
      return ctx.reply('Invalid level.');
    }

    await prisma.reward.delete({
      where: {
        spaceId_level: {
          spaceId: ctx.currentSpaceId,
          level,
        },
      },
    });

    await ctx.reply(`Reward for level ${level} deleted.`);
  });

  // Callback handler для меню
  bot.callbackQuery('settings:rewards', ensureUser, requireSpace, async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) {
      await ctx.answerCallbackQuery({ text: 'Error' });
      return;
    }

    const lang = await getUserLanguage(ctx.user.id);
    const rewards = await prisma.reward.findMany({
      where: { spaceId: ctx.currentSpaceId },
      orderBy: { level: 'asc' },
    });

    if (rewards.length === 0) {
      const text = lang === 'ru'
        ? '🎁 *Награды*\n\n✨ Награды ещё не настроены! Администратор может добавить награды за достижение уровней.'
        : '🎁 *Rewards*\n\n✨ No rewards set yet! Admin can add rewards for reaching levels.';
      
      await ctx.editMessageText(text, {
        reply_markup: getSettingsMenu(lang),
        parse_mode: 'Markdown'
      });
      await ctx.answerCallbackQuery();
      return;
    }

    const rewardsList = rewards
      .map((r: any) => {
        return `⭐ *Level ${r.level}*\n   ${r.text}`;
      })
      .join('\n\n');

    const text = lang === 'ru'
      ? `🎁 *Награды за уровни*\n\n${rewardsList}`
      : `🎁 *Level Rewards*\n\n${rewardsList}`;

    await ctx.editMessageText(text, {
      reply_markup: getSettingsMenu(lang),
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });
}