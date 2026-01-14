import { Bot, InlineKeyboard } from 'grammy';
import { prisma } from '../db';
import { AuthContext, ensureUser, requireSpace, requireRole } from '../middleware/auth';
import { RecurrenceType, getXpForDifficulty } from '../types';
import { getWizardState, setWizardState, clearWizardState } from '../utils/wizard';
import { markTaskDone } from '../utils/task-scheduler';
import { calculateNextDueDate } from '../utils/recurrence';
import { getTasksMenu } from '../menu';
import { getUserLanguage } from '../utils/language';

export function setupTaskCommands(bot: Bot<AuthContext>) {
  bot.command('task_add', ensureUser, requireSpace, requireRole('Editor'), async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) return;

    setWizardState(ctx.user.id, {
      type: 'task',
      step: 0,
      data: { spaceId: ctx.currentSpaceId },
    });

    await ctx.reply('Creating a new task. Please send the task title:');
  });

  // Wizard message handler - step 0 (title) and step 3 (due date)
  bot.on('message:text', ensureUser, async (ctx) => {
    if (!ctx.user) return;

    const wizardState = getWizardState(ctx.user.id);
    if (!wizardState || wizardState.type !== 'task') return;

    const text = ctx.message.text;

    if (wizardState.step === 0) {
      // Title
      wizardState.data.title = text;
      wizardState.step = 1;

      const keyboard = new InlineKeyboard()
        .text('1', 'difficulty_1')
        .text('2', 'difficulty_2')
        .text('3', 'difficulty_3')
        .row()
        .text('4', 'difficulty_4')
        .text('5', 'difficulty_5');

      await ctx.reply('Select difficulty (1-5):', { reply_markup: keyboard });
      setWizardState(ctx.user.id, wizardState);
      return;
    }

    if (wizardState.step === 3) {
      // Due date
      const textLower = text.toLowerCase().trim();
      let dueAt: Date | null = null;

      if (textLower !== 'now') {
        try {
          dueAt = new Date(ctx.message.text);
          if (isNaN(dueAt.getTime())) {
            return ctx.reply('Invalid date format. Please use YYYY-MM-DD HH:MM or "now"');
          }
        } catch {
          return ctx.reply('Invalid date format. Please use YYYY-MM-DD HH:MM or "now"');
        }
      } else {
        dueAt = new Date();
      }

      wizardState.data.dueAt = dueAt;

      // Create task
      const task = await prisma.task.create({
        data: {
          spaceId: wizardState.data.spaceId,
          title: wizardState.data.title,
          difficulty: wizardState.data.difficulty,
          xp: wizardState.data.xp,
          recurrenceType: wizardState.data.recurrenceType,
          recurrencePayload: wizardState.data.recurrencePayload || null,
          dueAt: wizardState.data.dueAt,
          createdBy: ctx.user.id,
        },
      });

      clearWizardState(ctx.user.id);
      await ctx.reply(`Task created! ID: ${task.id}\nTitle: ${task.title}\nXP: ${task.xp}`);
    }
  });

  bot.callbackQuery(/^difficulty_(\d)$/, ensureUser, async (ctx) => {
    if (!ctx.user) return;

    const wizardState = getWizardState(ctx.user.id);
    if (!wizardState || wizardState.type !== 'task' || wizardState.step !== 1) {
      return ctx.answerCallbackQuery('Invalid state');
    }

    const difficulty = parseInt(ctx.match[1]);
    wizardState.data.difficulty = difficulty;
    wizardState.data.xp = getXpForDifficulty(difficulty);
    wizardState.step = 2;

    const keyboard = new InlineKeyboard()
      .text('None', 'recur_none')
      .text('Daily', 'recur_daily')
      .row()
      .text('Weekly', 'recur_weekly')
      .text('Monthly', 'recur_monthly');

    await ctx.editMessageText('Select recurrence type:', { reply_markup: keyboard });
    await ctx.answerCallbackQuery();
    setWizardState(ctx.user.id, wizardState);
  });

  bot.callbackQuery(/^recur_(none|daily|weekly|monthly)$/, ensureUser, async (ctx) => {
    if (!ctx.user) return;

    const wizardState = getWizardState(ctx.user.id);
    if (!wizardState || wizardState.type !== 'task' || wizardState.step !== 2) {
      return ctx.answerCallbackQuery('Invalid state');
    }

    const recurType = ctx.match[1];
    wizardState.data.recurrenceType = recurType === 'none' ? null : recurType;
    wizardState.step = 3;

    await ctx.editMessageText('Please send the due date and time (YYYY-MM-DD HH:MM) or "now" for immediate:');
    await ctx.answerCallbackQuery();
    setWizardState(ctx.user.id, wizardState);
  });

  bot.command('task_list', ensureUser, requireSpace, async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const filter = args?.[0] || 'all';

    if (!ctx.currentSpaceId) return;

    const where: any = { spaceId: ctx.currentSpaceId, isPaused: false };

    if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.dueAt = { gte: today, lt: tomorrow };
    } else if (filter === 'upcoming') {
      where.dueAt = { gte: new Date() };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { dueAt: 'asc' },
      take: 20,
    });

    if (tasks.length === 0) {
      return ctx.reply('No tasks found.');
    }

    const tasksList = tasks
      .map((t, idx) => `${idx + 1}. [${t.id}] ${t.title} (XP: ${t.xp}) - ${t.dueAt?.toLocaleString() || 'No due date'}`)
      .join('\n');

    await ctx.reply(`Tasks (${filter}):\n\n${tasksList}`);
  });

  bot.command('task_done', ensureUser, requireSpace, requireRole('Editor'), async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const taskIdStr = args?.[0];

    if (!taskIdStr || !ctx.user || !ctx.currentSpaceId) {
      return ctx.reply('Usage: /task_done <task_id>');
    }

    try {
      const taskId = BigInt(taskIdStr);
      await markTaskDone(taskId, ctx.user.id, bot);
      await ctx.reply('Task marked as done! XP added.');
    } catch (error: any) {
      await ctx.reply(`Error: ${error.message}`);
    }
  });

  bot.command('task_edit', ensureUser, requireSpace, requireRole('Editor'), async (ctx) => {
    await ctx.reply('Task editing not implemented in MVP');
  });

  bot.command('task_pause', ensureUser, requireSpace, requireRole('Editor'), async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const taskIdStr = args?.[0];

    if (!taskIdStr || !ctx.currentSpaceId) {
      return ctx.reply('Usage: /task_pause <task_id>');
    }

    await prisma.task.update({
      where: { id: BigInt(taskIdStr) },
      data: { isPaused: true },
    });

    await ctx.reply('Task paused.');
  });

  bot.command('task_resume', ensureUser, requireSpace, requireRole('Editor'), async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const taskIdStr = args?.[0];

    if (!taskIdStr || !ctx.currentSpaceId) {
      return ctx.reply('Usage: /task_resume <task_id>');
    }

    await prisma.task.update({
      where: { id: BigInt(taskIdStr) },
      data: { isPaused: false },
    });

    await ctx.reply('Task resumed.');
  });

  bot.command('task_delete', ensureUser, requireSpace, requireRole('Editor'), async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const taskIdStr = args?.[0];

    if (!taskIdStr || !ctx.currentSpaceId) {
      return ctx.reply('Usage: /task_delete <task_id>');
    }

    await prisma.task.delete({
      where: { id: BigInt(taskIdStr) },
    });

    await ctx.reply('Task deleted.');
  });

  // Helper function для показа списка задач
  const showTaskList = async (ctx: any, filter: string, edit: boolean = false) => {
    if (!ctx.user || !ctx.currentSpaceId) return;

    const lang = await getUserLanguage(ctx.user.id);
    const where: any = { spaceId: ctx.currentSpaceId, isPaused: false };

    if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      where.dueAt = { gte: today, lt: tomorrow };
    } else if (filter === 'upcoming') {
      where.dueAt = { gte: new Date() };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { dueAt: 'asc' },
      take: 20,
    });

    if (tasks.length === 0) {
      const text = lang === 'ru'
        ? `📋 *Задачи (${filter === 'today' ? 'Сегодня' : filter === 'upcoming' ? 'Предстоящие' : 'Все'})*\n\n✨ Пока нет задач! Создайте первую задачу.`
        : `📋 *Tasks (${filter})*\n\n✨ No tasks yet! Create your first task.`;
      
      if (edit) {
        await ctx.editMessageText(text, {
          reply_markup: getTasksMenu(lang),
          parse_mode: 'Markdown'
        });
      } else {
        await ctx.reply(text, {
          reply_markup: getTasksMenu(lang),
          parse_mode: 'Markdown'
        });
      }
      return;
    }

    const tasksList = tasks
      .map((t: any, idx: number) => {
        const dueDate = t.dueAt 
          ? new Date(t.dueAt).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US')
          : (lang === 'ru' ? 'Без срока' : 'No due date');
        return `\`${idx + 1}\` • *${t.title}*\n   💎 ${t.xp} XP | 📅 ${dueDate}`;
      })
      .join('\n\n');

    const title = lang === 'ru'
      ? filter === 'today' ? '📅 Сегодня' : filter === 'upcoming' ? '⏭️ Предстоящие' : '📋 Все задачи'
      : `📋 Tasks (${filter})`;

    const text = `${title}\n\n${tasksList}`;

    if (edit) {
      await ctx.editMessageText(text, {
        reply_markup: getTasksMenu(lang),
        parse_mode: 'Markdown'
      });
    } else {
      await ctx.reply(text, {
        reply_markup: getTasksMenu(lang),
        parse_mode: 'Markdown'
      });
    }
  };

  // Callback handlers для меню
  bot.callbackQuery('task:list', ensureUser, requireSpace, async (ctx) => {
    await showTaskList(ctx, 'all', true);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('task:today', ensureUser, requireSpace, async (ctx) => {
    await showTaskList(ctx, 'today', true);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('task:upcoming', ensureUser, requireSpace, async (ctx) => {
    await showTaskList(ctx, 'upcoming', true);
    await ctx.answerCallbackQuery();
  });
}