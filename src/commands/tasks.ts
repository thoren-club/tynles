import { Bot, InlineKeyboard } from 'grammy';
import { prisma } from '../db';
import { AuthContext, ensureUser, requireSpace, requireRole } from '../middleware/auth';
import { RecurrenceType, getXpForDifficulty } from '../types';
import { getWizardState, setWizardState, clearWizardState } from '../utils/wizard';
import { markTaskDone } from '../utils/task-scheduler';
import { calculateNextDueDate } from '../utils/recurrence';
import { getTasksMenu } from '../menu';
import { getUserLanguage } from '../utils/language';
import { t } from '../i18n';
import { getXpProgress, getProgressBar } from '../utils/xp';
import { escapeMarkdown } from '../utils/markdown';

export function setupTaskCommands(bot: Bot<AuthContext>) {
  // Упрощенное создание задач - только название
  bot.command('task_add', ensureUser, requireSpace, requireRole('Editor'), async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) return;

    const lang = await getUserLanguage(ctx.user.id);
    setWizardState(ctx.user.id, {
      type: 'task',
      step: 0,
      data: { spaceId: ctx.currentSpaceId },
    });

    const text = lang === 'ru'
      ? '✏️ *Создание задачи*\n\nОтправьте название задачи:'
      : '✏️ *Create Task*\n\nSend the task title:';

    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  // Обработчик кнопки task:add
  bot.callbackQuery('task:add', ensureUser, requireSpace, requireRole('Editor'), async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) {
      await ctx.answerCallbackQuery({ text: 'Error' });
      return;
    }

    const lang = await getUserLanguage(ctx.user.id);
    setWizardState(ctx.user.id, {
      type: 'task',
      step: 0,
      data: { spaceId: ctx.currentSpaceId },
    });

    const text = lang === 'ru'
      ? '✏️ *Создание задачи*\n\nОтправьте название задачи:'
      : '✏️ *Create Task*\n\nSend the task title:';

    await ctx.editMessageText(text, { parse_mode: 'Markdown' });
    await ctx.answerCallbackQuery();
  });

  // Упрощенный wizard - только название, остальное по умолчанию
  bot.on('message:text', ensureUser, async (ctx) => {
    if (!ctx.user) return;

    const wizardState = getWizardState(ctx.user.id);
    if (!wizardState || wizardState.type !== 'task' || wizardState.step !== 0) return;

    const title = ctx.message.text.trim();
    if (!title) return;

    const lang = await getUserLanguage(ctx.user.id);

    // Дефолтные значения: сложность 3, без повторяемости, дата "now"
    const difficulty = 3;
    const xp = getXpForDifficulty(difficulty);
    const dueAt = new Date();

    try {
      const task = await prisma.task.create({
        data: {
          spaceId: wizardState.data.spaceId,
          title,
          difficulty,
          xp,
          recurrenceType: null,
          dueAt,
          createdBy: ctx.user.id,
        },
      });

      clearWizardState(ctx.user.id);

      const escapedTitle = escapeMarkdown(task.title);
      const successText = lang === 'ru'
        ? `✅ *Задача создана!*\n\n📋 *${escapedTitle}*\n💎 ${task.xp} XP`
        : `✅ *Task Created!*\n\n📋 *${escapedTitle}*\n💎 ${task.xp} XP`;

      await ctx.reply(successText, { parse_mode: 'Markdown' });
    } catch (error) {
      clearWizardState(ctx.user.id);
      const errorText = lang === 'ru' ? '❌ Ошибка при создании задачи' : '❌ Error creating task';
      await ctx.reply(errorText);
    }
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

    // Создаем клавиатуру с кнопками "Done" для каждой задачи + меню внизу
    const keyboard = new InlineKeyboard();
    tasks.forEach((t: any) => {
      keyboard.text('✅ Done', `task:done:${t.id}`).row();
    });
    keyboard.text(lang === 'ru' ? '◀️ Назад' : '◀️ Back', 'menu:tasks');

    if (edit) {
      await ctx.editMessageText(text, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } else {
      await ctx.reply(text, {
        reply_markup: keyboard,
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

  // Callback для списка задач на удаление
  bot.callbackQuery('task:delete_list', ensureUser, requireSpace, requireRole('Editor'), async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) {
      await ctx.answerCallbackQuery({ text: 'Error' });
      return;
    }

    const lang = await getUserLanguage(ctx.user.id);
    const tasks = await prisma.task.findMany({
      where: { spaceId: ctx.currentSpaceId, isPaused: false },
      orderBy: { dueAt: 'asc' },
      take: 10,
    });

    if (tasks.length === 0) {
      const text = lang === 'ru'
        ? '🗑️ *Удаление задач*\n\n✨ Нет задач для удаления.'
        : '🗑️ *Delete Tasks*\n\n✨ No tasks to delete.';
      
      await ctx.editMessageText(text, {
        reply_markup: getTasksMenu(lang),
        parse_mode: 'Markdown'
      });
      await ctx.answerCallbackQuery();
      return;
    }

    const tasksList = tasks
      .map((t: any, idx: number) => {
        const dueDate = t.dueAt 
          ? new Date(t.dueAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US')
          : (lang === 'ru' ? 'Без срока' : 'No due date');
        return `${idx + 1}. *${t.title}* (${dueDate})`;
      })
      .join('\n');

    const text = lang === 'ru'
      ? `🗑️ *Выберите задачу для удаления*\n\n${tasksList}`
      : `🗑️ *Select task to delete*\n\n${tasksList}`;

    const keyboard = new InlineKeyboard();
    tasks.forEach((t: any, idx: number) => {
      const title = escapeMarkdown(t.title);
      keyboard.text(`${idx + 1}. ${title.substring(0, 20)}${title.length > 20 ? '...' : ''}`, `task:delete_confirm:${t.id}`).row();
    });
    keyboard.text(lang === 'ru' ? '◀️ Назад' : '◀️ Back', 'menu:tasks');

    await ctx.editMessageText(text, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });

  // Callback для подтверждения удаления задачи
  bot.callbackQuery(/^task:delete_confirm:(.+)$/, ensureUser, requireSpace, requireRole('Editor'), async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) {
      await ctx.answerCallbackQuery({ text: 'Error' });
      return;
    }

    const taskId = BigInt(ctx.match[1]);
    const lang = await getUserLanguage(ctx.user.id);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.spaceId !== ctx.currentSpaceId) {
      await ctx.answerCallbackQuery({ text: 'Task not found' });
      return;
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    const title = escapeMarkdown(task.title);
    const text = lang === 'ru'
      ? `🗑️ *Задача удалена*\n\nЗадача "${title}" была успешно удалена.`
      : `🗑️ *Task Deleted*\n\nTask "${title}" has been successfully deleted.`;

    await ctx.editMessageText(text, {
      reply_markup: getTasksMenu(lang),
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery({ text: lang === 'ru' ? 'Удалено' : 'Deleted' });
  });

  // Callback для выполнения задачи через кнопку
  bot.callbackQuery(/^task:done:(.+)$/, ensureUser, requireSpace, requireRole('Editor'), async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) {
      await ctx.answerCallbackQuery({ text: 'Error' });
      return;
    }

    const taskId = BigInt(ctx.match[1]);
    const lang = await getUserLanguage(ctx.user.id);

    try {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { space: true },
      });

      if (!task || task.spaceId !== ctx.currentSpaceId) {
        await ctx.answerCallbackQuery({ text: lang === 'ru' ? 'Задача не найдена' : 'Task not found' });
        return;
      }

      // Выполняем задачу
      const xpResult = await markTaskDone(taskId, ctx.user.id, bot);

      // Получаем статистику для показа прогресса
      const stats = await prisma.userSpaceStats.findUnique({
        where: {
          spaceId_userId: {
            spaceId: ctx.currentSpaceId,
            userId: ctx.user.id,
          },
        },
      });

      const progress = stats ? getXpProgress(stats.totalXp) : { current: 0, next: 100, progress: 0 };

      // Создаем прогресс-бар
      const progressBar = getProgressBar(progress.progress);
      const title = escapeMarkdown(task.title);

      let successText = lang === 'ru'
        ? `✅ *Задача выполнена!*\n\n📋 *${title}*\n💎 +${task.xp} XP\n\n📊 Прогресс: ${progressBar} ${progress.progress}%\n🎯 До следующего уровня: ${progress.next} XP`
        : `✅ *Task Completed!*\n\n📋 *${title}*\n💎 +${task.xp} XP\n\n📊 Progress: ${progressBar} ${progress.progress}%\n🎯 To next level: ${progress.next} XP`;

      const keyboard = new InlineKeyboard()
        .text(lang === 'ru' ? '◀️ Назад к задачам' : '◀️ Back to tasks', 'task:list');

      await ctx.editMessageText(successText, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
      await ctx.answerCallbackQuery({ text: lang === 'ru' ? 'Выполнено!' : 'Done!' });
    } catch (error: any) {
      await ctx.answerCallbackQuery({ text: lang === 'ru' ? 'Ошибка' : 'Error' });
    }
  });
}