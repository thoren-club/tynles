import { Bot } from 'grammy';
import { AuthContext, ensureUser, requireSpace } from '../middleware/auth';
import { prisma } from '../db';
import { 
  getMainMenu, 
  getSpacesMenu, 
  getTasksMenu, 
  getGoalsMenu, 
  getStatsMenu, 
  getMembersMenu, 
  getSettingsMenu,
  getHelpMenu 
} from '../menu';
import { getUserLanguage } from '../utils/language';
import { t } from '../i18n';
import { setupSpaceCommands } from './space';
import { setupTaskCommands } from './tasks';
import { setupGoalCommands } from './goals';
import { setupLevelCommands } from './levels';
import { setupMemberCommands } from './members';
import { setupRewardCommands } from './rewards';

export function setupMenuCommands(bot: Bot<AuthContext>) {
  // Главное меню
  bot.callbackQuery('menu:main', ensureUser, async (ctx) => {
    const lang = await getUserLanguage(ctx.user!.id);
    const text = lang === 'ru' 
      ? '📱 *Главное меню*\n\nВыберите раздел:'
      : '📱 *Main Menu*\n\nChoose a section:';
    
    await ctx.editMessageText(text, { 
      reply_markup: getMainMenu(lang),
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });

  // Меню пространств
  bot.callbackQuery('menu:spaces', ensureUser, async (ctx) => {
    const lang = await getUserLanguage(ctx.user!.id);
    const text = lang === 'ru'
      ? '📁 *Пространства*\n\nУправление пространствами'
      : '📁 *Spaces*\n\nManage your spaces';
    
    await ctx.editMessageText(text, {
      reply_markup: getSpacesMenu(lang),
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });

  // Меню задач
  bot.callbackQuery('menu:tasks', ensureUser, requireSpace, async (ctx) => {
    const lang = await getUserLanguage(ctx.user!.id);
    const text = lang === 'ru'
      ? '✅ *Задачи*\n\nУправление задачами'
      : '✅ *Tasks*\n\nManage your tasks';
    
    await ctx.editMessageText(text, {
      reply_markup: getTasksMenu(lang),
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });

  // Меню целей
  bot.callbackQuery('menu:goals', ensureUser, requireSpace, async (ctx) => {
    const lang = await getUserLanguage(ctx.user!.id);
    const text = lang === 'ru'
      ? '🎯 *Цели*\n\nУправление целями'
      : '🎯 *Goals*\n\nManage your goals';
    
    await ctx.editMessageText(text, {
      reply_markup: getGoalsMenu(lang),
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });

  // Меню статистики
  bot.callbackQuery('menu:stats', ensureUser, requireSpace, async (ctx) => {
    const lang = await getUserLanguage(ctx.user!.id);
    const text = lang === 'ru'
      ? '📊 *Статистика*\n\nВаш прогресс и достижения'
      : '📊 *Statistics*\n\nYour progress and achievements';
    
    await ctx.editMessageText(text, {
      reply_markup: getStatsMenu(lang),
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });

  // Меню участников
  bot.callbackQuery('menu:members', ensureUser, requireSpace, async (ctx) => {
    const lang = await getUserLanguage(ctx.user!.id);
    const text = lang === 'ru'
      ? '👥 *Участники*\n\nУправление участниками пространства'
      : '👥 *Members*\n\nManage space members';
    
    await ctx.editMessageText(text, {
      reply_markup: getMembersMenu(lang),
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });

  // Меню настроек
  bot.callbackQuery('menu:settings', ensureUser, async (ctx) => {
    const lang = await getUserLanguage(ctx.user!.id);
    const text = lang === 'ru'
      ? '⚙️ *Настройки*\n\nНастройки бота'
      : '⚙️ *Settings*\n\nBot settings';
    
    await ctx.editMessageText(text, {
      reply_markup: getSettingsMenu(lang),
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });

  // Меню помощи
  bot.callbackQuery('menu:help', ensureUser, async (ctx) => {
    const lang = await getUserLanguage(ctx.user!.id);
    const text = lang === 'ru'
      ? '❓ *Помощь*\n\nВыберите раздел помощи'
      : '❓ *Help*\n\nChoose a help section';
    
    await ctx.editMessageText(text, {
      reply_markup: getHelpMenu(lang),
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });

  // Help handlers
  bot.callbackQuery('help:commands', ensureUser, async (ctx) => {
    const lang = await getUserLanguage(ctx.user!.id);
    
    const helpText = lang === 'ru'
      ? `📖 *Команды*\n\n` +
        `*Основные команды:*\n\n` +
        `📁 *Пространства:*\n` +
        `/space_create - создать пространство\n` +
        `/space_list - список пространств\n` +
        `/space_switch - переключить пространство\n` +
        `/space_info - информация о пространстве\n\n` +
        `✅ *Задачи:*\n` +
        `/task_add - добавить задачу\n` +
        `/task_list - список задач\n` +
        `/task_done - отметить выполненной\n\n` +
        `🎯 *Цели:*\n` +
        `/goal_add - добавить цель\n` +
        `/goal_list - список целей\n` +
        `/goal_done - отметить выполненной\n\n` +
        `📊 *Статистика:*\n` +
        `/me - ваша статистика\n` +
        `/leaderboard - таблица лидеров\n\n` +
        `⚙️ *Настройки:*\n` +
        `/language - изменить язык`
      : `📖 *Commands*\n\n` +
        `*Main commands:*\n\n` +
        `📁 *Spaces:*\n` +
        `/space_create - create space\n` +
        `/space_list - list spaces\n` +
        `/space_switch - switch space\n` +
        `/space_info - space info\n\n` +
        `✅ *Tasks:*\n` +
        `/task_add - add task\n` +
        `/task_list - list tasks\n` +
        `/task_done - mark done\n\n` +
        `🎯 *Goals:*\n` +
        `/goal_add - add goal\n` +
        `/goal_list - list goals\n` +
        `/goal_done - mark done\n\n` +
        `📊 *Statistics:*\n` +
        `/me - your stats\n` +
        `/leaderboard - leaderboard\n\n` +
        `⚙️ *Settings:*\n` +
        `/language - change language`;

    await ctx.editMessageText(helpText, {
      reply_markup: getHelpMenu(lang),
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('help:faq', ensureUser, async (ctx) => {
    const lang = await getUserLanguage(ctx.user!.id);
    
    const faqText = lang === 'ru'
      ? `❓ *Часто задаваемые вопросы*\n\n` +
        `*Как создать пространство?*\n` +
        `Используйте /space_create или меню "Пространства" → "Создать"\n\n` +
        `*Как добавить задачу?*\n` +
        `Используйте /task_add или меню "Задачи" → "Добавить"\n\n` +
        `*Как работает система XP?*\n` +
        `За выполнение задач и целей начисляется XP. Каждые 100 XP = новый уровень!\n\n` +
        `*Как пригласить друзей?*\n` +
        `Администратор может создать invite код через меню "Участники" → "Пригласить"\n\n` +
        `*Что такое награды?*\n` +
        `Администратор может настроить награды за достижение определённых уровней!`
      : `❓ *Frequently Asked Questions*\n\n` +
        `*How to create a space?*\n` +
        `Use /space_create or menu "Spaces" → "Create"\n\n` +
        `*How to add a task?*\n` +
        `Use /task_add or menu "Tasks" → "Add"\n\n` +
        `*How does XP system work?*\n` +
        `Completing tasks and goals gives XP. Every 100 XP = new level!\n\n` +
        `*How to invite friends?*\n` +
        `Admin can create invite code via menu "Members" → "Invite"\n\n` +
        `*What are rewards?*\n` +
        `Admin can set rewards for reaching certain levels!`;

    await ctx.editMessageText(faqText, {
      reply_markup: getHelpMenu(lang),
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });
}
