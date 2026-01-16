import { Bot } from 'grammy';
import { config } from './config';
import { logger } from './logger';
import { prisma } from './db';
import { AuthContext, ensureUser } from './middleware/auth';
import { setupSpaceCommands } from './commands/space';
import { setupMemberCommands } from './commands/members';
import { setupTaskCommands } from './commands/tasks';
import { setupGoalCommands } from './commands/goals';
import { setupLevelCommands } from './commands/levels';
import { setupRewardCommands } from './commands/rewards';
import { setupMenuCommands } from './commands/menu';
import { sendReminders } from './utils/task-scheduler';
import { getMainMenu } from './menu';
import { getUserLanguage } from './utils/language';
import { t } from './i18n';
import { InlineKeyboard } from 'grammy';

const bot = new Bot<AuthContext>(config.botToken);

// Start command (register first)
bot.command('start', ensureUser, async (ctx) => {
  try {
    if (!ctx.user) {
      return ctx.reply('User not found');
    }
    
    const lang = await getUserLanguage(ctx.user.id);
    const firstName = ctx.from?.first_name || '';
    
    const welcomeText = lang === 'ru'
      ? `👋 Добро пожаловать${firstName ? `, ${firstName}` : ''}!\n\n` +
        `Я бот для управления задачами и целями с геймификацией.\n\n` +
        `✨ *Возможности:*\n` +
        `📁 Пространства для организации\n` +
        `✅ Задачи с напоминаниями\n` +
        `🎯 Цели и достижения\n` +
        `📊 Статистика и уровни\n` +
        `🏆 Таблица лидеров\n\n` +
        `Используйте меню для навигации:`
      : `👋 Welcome${firstName ? `, ${firstName}` : ''}!\n\n` +
        `I'm a task and goal management bot with gamification.\n\n` +
        `✨ *Features:*\n` +
        `📁 Spaces for organization\n` +
        `✅ Tasks with reminders\n` +
        `🎯 Goals and achievements\n` +
        `📊 Statistics and levels\n` +
        `🏆 Leaderboard\n\n` +
        `Use the menu to navigate:`;

    // Create keyboard with Mini App button
    const keyboard = getMainMenu(lang);
    
    // Add Mini App button
    keyboard.webApp(
      lang === 'ru' ? '🚀 Открыть приложение' : '🚀 Open App',
      config.webAppUrl
    ).row();

    await ctx.reply(welcomeText, {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    });
  } catch (error) {
    logger.error(error, 'Error in /start command');
    await ctx.reply('An error occurred. Please try again later.');
  }
});

// Help command (register early)
bot.command('help', ensureUser, async (ctx) => {
  try {
    if (!ctx.user) {
      return ctx.reply('User not found');
    }
    
    const lang = await getUserLanguage(ctx.user.id);
    
    const helpText = lang === 'ru'
      ? `❓ *Помощь*\n\n` +
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
        `/language - изменить язык\n\n` +
        `Используйте меню для удобной навигации!`
      : `❓ *Help*\n\n` +
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
        `/language - change language\n\n` +
        `Use the menu for convenient navigation!`;

    await ctx.reply(helpText, {
      reply_markup: getMainMenu(lang),
      parse_mode: 'Markdown',
    });
  } catch (error) {
    logger.error(error, 'Error in /help command');
    await ctx.reply('An error occurred. Please try again later.');
  }
});

// Setup commands (register after start and help)
setupSpaceCommands(bot);
setupMemberCommands(bot);
setupTaskCommands(bot);
setupGoalCommands(bot);
setupLevelCommands(bot);
setupRewardCommands(bot);
setupMenuCommands(bot);

// Error handling
bot.catch((err) => {
  logger.error(err, 'Bot error');
});

// Start scheduler for reminders (every minute)
setInterval(async () => {
  try {
    await sendReminders(bot);
  } catch (error) {
    logger.error(error, 'Scheduler error');
  }
}, 60000); // 1 minute

// Start web server (if not in bot-only mode)
if (process.env.BOT_ONLY !== 'true') {
  import('./web/index').catch((error) => {
    logger.error(error, 'Failed to start web server');
  });
}

// Start bot
async function main() {
  try {
    await bot.start();
    logger.info('Bot started');
  } catch (error) {
    logger.error(error, 'Failed to start bot');
    process.exit(1);
  }
}

main();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await bot.stop();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await bot.stop();
  await prisma.$disconnect();
  process.exit(0);
});