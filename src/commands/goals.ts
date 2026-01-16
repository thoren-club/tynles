import { Bot, InlineKeyboard } from 'grammy';
import { prisma } from '../db';
import { AuthContext, ensureUser, requireSpace, requireRole } from '../middleware/auth';
import { getXpForDifficulty } from '../types';
import { getWizardState, setWizardState, clearWizardState } from '../utils/wizard';
import { addXp } from '../utils/xp';
import { getGoalsMenu } from '../menu';
import { getUserLanguage } from '../utils/language';
import { escapeMarkdown } from '../utils/markdown';

export function setupGoalCommands(bot: Bot<AuthContext>) {
  bot.command('goal_add', ensureUser, requireSpace, requireRole('Editor'), async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) return;

    setWizardState(ctx.user.id, {
      type: 'goal',
      step: 0,
      data: { spaceId: ctx.currentSpaceId },
    });

    await ctx.reply('Creating a new goal. Please send the goal title:');
  });

  // Handle goal wizard - step 0: title
  bot.on('message:text', ensureUser, async (ctx) => {
    if (!ctx.user) return;

    const wizardState = getWizardState(ctx.user.id);
    if (!wizardState || wizardState.type !== 'goal' || wizardState.step !== 0) return;

    const text = ctx.message.text;
    wizardState.data.title = text;
    wizardState.step = 1;

    const keyboard = new InlineKeyboard()
      .text('1', 'goal_difficulty_1')
      .text('2', 'goal_difficulty_2')
      .text('3', 'goal_difficulty_3')
      .row()
      .text('4', 'goal_difficulty_4')
      .text('5', 'goal_difficulty_5');

    await ctx.reply('Select difficulty (1-5):', { reply_markup: keyboard });
    setWizardState(ctx.user.id, wizardState);
  });

  bot.callbackQuery(/^goal_difficulty_(\d)$/, ensureUser, async (ctx) => {
    if (!ctx.user) return;

    const wizardState = getWizardState(ctx.user.id);
    if (!wizardState || wizardState.type !== 'goal' || wizardState.step !== 1) {
      return ctx.answerCallbackQuery('Invalid state');
    }

    const difficulty = parseInt(ctx.match[1]);
    const xp = getXpForDifficulty(difficulty);

    const goal = await prisma.goal.create({
      data: {
        spaceId: wizardState.data.spaceId,
        title: wizardState.data.title,
        difficulty,
        xp,
        createdBy: ctx.user.id,
      },
    });

    clearWizardState(ctx.user.id);
    await ctx.editMessageText(`Goal created! ID: ${goal.id}\nTitle: ${goal.title}\nXP: ${goal.xp}`);
    await ctx.answerCallbackQuery();
  });

  bot.command('goal_list', ensureUser, requireSpace, async (ctx) => {
    if (!ctx.currentSpaceId) return;

    const goals = await prisma.goal.findMany({
      where: {
        spaceId: ctx.currentSpaceId,
        isDone: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (goals.length === 0) {
      return ctx.reply('No goals found.');
    }

    const goalsList = goals
      .map((g, idx) => `${idx + 1}. [${g.id}] ${g.title} (XP: ${g.xp})`)
      .join('\n');

    await ctx.reply(`Goals:\n\n${goalsList}`);
  });

  bot.command('goal_done', ensureUser, requireSpace, requireRole('Editor'), async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const goalIdStr = args?.[0];

    if (!goalIdStr || !ctx.user || !ctx.currentSpaceId) {
      return ctx.reply('Usage: /goal_done <goal_id>');
    }

    try {
      const goalId = BigInt(goalIdStr);
      const goal = await prisma.goal.findUnique({
        where: { id: goalId },
      });

      if (!goal || goal.spaceId !== ctx.currentSpaceId) {
        return ctx.reply('Goal not found.');
      }

      if (goal.isDone) {
        return ctx.reply('Goal is already done.');
      }

      await prisma.goal.update({
        where: { id: goalId },
        data: { isDone: true },
      });

      const xpResult = await addXp(ctx.currentSpaceId, ctx.user.id, goal.xp);

      let message = `Goal completed! +${goal.xp} XP`;
      if (xpResult.levelUp) {
        message += `\n🎉 Level up! You reached level ${xpResult.newLevel}!`;

        const reward = await prisma.reward.findUnique({
          where: {
            spaceId_level: {
              spaceId: ctx.currentSpaceId,
              level: xpResult.newLevel,
            },
          },
        });

        if (reward) {
          message += `\n\n🎁 Reward: ${reward.text}`;
        }
      }

      await ctx.reply(message);
    } catch (error: any) {
      await ctx.reply(`Error: ${error.message}`);
    }
  });

  bot.command('goal_edit', ensureUser, requireSpace, requireRole('Editor'), async (ctx) => {
    await ctx.reply('Goal editing not implemented in MVP');
  });

  bot.command('goal_delete', ensureUser, requireSpace, requireRole('Editor'), async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const goalIdStr = args?.[0];

    if (!goalIdStr || !ctx.currentSpaceId) {
      return ctx.reply('Usage: /goal_delete <goal_id>');
    }

    await prisma.goal.delete({
      where: { id: BigInt(goalIdStr) },
    });

    await ctx.reply('Goal deleted.');
  });

  // Callback handler для меню
  bot.callbackQuery('goal:list', ensureUser, requireSpace, async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) {
      await ctx.answerCallbackQuery({ text: 'Error' });
      return;
    }

    const lang = await getUserLanguage(ctx.user.id);
    const goals = await prisma.goal.findMany({
      where: {
        spaceId: ctx.currentSpaceId,
        isDone: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    if (goals.length === 0) {
      const text = lang === 'ru'
        ? '🎯 *Цели*\n\n✨ Пока нет целей! Создайте первую цель и начните свой путь к успеху!'
        : '🎯 *Goals*\n\n✨ No goals yet! Create your first goal and start your journey to success!';
      
      await ctx.editMessageText(text, {
        reply_markup: getGoalsMenu(lang),
        parse_mode: 'Markdown'
      });
      await ctx.answerCallbackQuery();
      return;
    }

    const goalsList = goals
      .map((g: any, idx: number) => {
        const title = escapeMarkdown(g.title);
        return `\`${idx + 1}\` • *${title}*\n   💎 ${g.xp} XP`;
      })
      .join('\n\n');

    const text = lang === 'ru'
      ? `🎯 *Ваши цели*\n\n${goalsList}`
      : `🎯 *Your Goals*\n\n${goalsList}`;

    await ctx.editMessageText(text, {
      reply_markup: getGoalsMenu(lang),
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });

  // Callback для списка целей на удаление
  bot.callbackQuery('goal:delete_list', ensureUser, requireSpace, requireRole('Editor'), async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) {
      await ctx.answerCallbackQuery({ text: 'Error' });
      return;
    }

    const lang = await getUserLanguage(ctx.user.id);
    const goals = await prisma.goal.findMany({
      where: {
        spaceId: ctx.currentSpaceId,
        isDone: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (goals.length === 0) {
      const text = lang === 'ru'
        ? '🗑️ *Удаление целей*\n\n✨ Нет целей для удаления.'
        : '🗑️ *Delete Goals*\n\n✨ No goals to delete.';
      
      await ctx.editMessageText(text, {
        reply_markup: getGoalsMenu(lang),
        parse_mode: 'Markdown'
      });
      await ctx.answerCallbackQuery();
      return;
    }

    const goalsList = goals
      .map((g: any, idx: number) => {
        const title = escapeMarkdown(g.title);
        return `${idx + 1}. *${title}*`;
      })
      .join('\n');

    const text = lang === 'ru'
      ? `🗑️ *Выберите цель для удаления*\n\n${goalsList}`
      : `🗑️ *Select goal to delete*\n\n${goalsList}`;

    const keyboard = new InlineKeyboard();
    goals.forEach((g: any, idx: number) => {
      const title = escapeMarkdown(g.title);
      keyboard.text(`${idx + 1}. ${title.substring(0, 25)}${title.length > 25 ? '...' : ''}`, `goal:delete_confirm:${g.id}`).row();
    });
    keyboard.text(lang === 'ru' ? '◀️ Назад' : '◀️ Back', 'menu:goals');

    await ctx.editMessageText(text, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });

  // Callback для подтверждения удаления цели
  bot.callbackQuery(/^goal:delete_confirm:(.+)$/, ensureUser, requireSpace, requireRole('Editor'), async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) {
      await ctx.answerCallbackQuery({ text: 'Error' });
      return;
    }

    const goalId = BigInt(ctx.match[1]);
    const lang = await getUserLanguage(ctx.user.id);

    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal || goal.spaceId !== ctx.currentSpaceId) {
      await ctx.answerCallbackQuery({ text: 'Goal not found' });
      return;
    }

    await prisma.goal.delete({
      where: { id: goalId },
    });

    const title = escapeMarkdown(goal.title);
    const text = lang === 'ru'
      ? `🗑️ *Цель удалена*\n\nЦель "${title}" была успешно удалена.`
      : `🗑️ *Goal Deleted*\n\nGoal "${title}" has been successfully deleted.`;

    await ctx.editMessageText(text, {
      reply_markup: getGoalsMenu(lang),
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery({ text: lang === 'ru' ? 'Удалено' : 'Deleted' });
  });
}