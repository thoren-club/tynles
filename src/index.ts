import { Bot } from 'grammy';
import { config } from './config';
import { logger } from './logger';
import { prisma } from './db';
import { AuthContext, ensureUser } from './middleware/auth';
import { sendReminders } from './utils/task-scheduler';
import { generateWeeklyStories } from './utils/story-generator';
import { processExpiredRecurringTasks } from './utils/task-expiration';
import { getUserLanguage } from './utils/language';
import { InlineKeyboard } from 'grammy';

const bot = new Bot<AuthContext>(config.botToken);

function getOpenAppKeyboard(lang: 'ru' | 'en') {
  return new InlineKeyboard().webApp(
    lang === 'ru' ? '🚀 Открыть приложение' : '🚀 Open app',
    config.webAppUrl,
  );
}

// Start command (register first)
bot.command('start', ensureUser, async (ctx) => {
  try {
    if (!ctx.user) {
      return ctx.reply('User not found');
    }
    
    const lang = await getUserLanguage(ctx.user.id);
    const firstName = ctx.from?.first_name || '';
    
    const welcomeText =
      lang === 'ru'
        ? `👋 Привет${firstName ? `, ${firstName}` : ''}!\n\n` +
          `Нажмите **«Открыть приложение»**.\n` +
          `Дальше: выберите/создайте пространство → добавьте цели и задачи → выполняйте их, чтобы получать XP, уровни и место в лидерборде.\n\n` +
          `Если что-то непонятно — напишите /help.`
        : `👋 Hi${firstName ? `, ${firstName}` : ''}!\n\n` +
          `Tap **“Open app”**.\n` +
          `Then: pick/create a space → add goals & tasks → complete them to earn XP, levels and leaderboard position.\n\n` +
          `If you need help — send /help.`;

    await ctx.reply(welcomeText, {
      reply_markup: getOpenAppKeyboard(lang),
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
    
    const helpText =
      lang === 'ru'
        ? `❓ *Помощь*\n\n` +
          `Это приложение — **таск-менеджер с геймификацией** внутри Telegram Mini App.\n\n` +
          `*Что внутри:*\n` +
          `- **Пространства**: личное или командное (семья/друзья/работа)\n` +
          `- **Задачи** и **цели**\n` +
          `- **XP и уровни** за выполнение\n` +
          `- **Лидерборд** по пространству и глобальный\n` +
          `- **Напоминания** и **истории** прогресса\n\n` +
          `*Как пользоваться:*\n` +
          `1) Откройте приложение\n` +
          `2) Выберите/создайте пространство\n` +
          `3) Добавьте задачи/цели и выполняйте их\n\n` +
          `Команды бота сейчас: /start и /help.`
        : `❓ *Help*\n\n` +
          `This is a **gamified task & goal manager** inside a Telegram Mini App.\n\n` +
          `*What you get:*\n` +
          `- **Spaces**: personal or team (family/friends/work)\n` +
          `- **Tasks** and **goals**\n` +
          `- **XP & levels** for completing\n` +
          `- **Leaderboards** (space + global)\n` +
          `- **Reminders** and weekly **stories**\n\n` +
          `*How to use:*\n` +
          `1) Open the app\n` +
          `2) Pick/create a space\n` +
          `3) Add tasks/goals and complete them\n\n` +
          `Bot commands for now: /start and /help.`;

    await ctx.reply(helpText, {
      reply_markup: getOpenAppKeyboard(lang),
      parse_mode: 'Markdown',
    });
  } catch (error) {
    logger.error(error, 'Error in /help command');
    await ctx.reply('An error occurred. Please try again later.');
  }
});

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

// Weekly stories generator - run every hour and check if it's start of week
let lastStoryGenerationDay: number | null = null;
setInterval(async () => {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    const hour = now.getHours();

    // Generate stories on Monday morning (1:00 AM) or Sunday night (23:00)
    // Also check that we haven't generated stories for this week yet
    const shouldGenerate = 
      (dayOfWeek === 1 && hour === 1) || // Monday 1 AM
      (dayOfWeek === 0 && hour === 23); // Sunday 11 PM

    if (shouldGenerate && lastStoryGenerationDay !== dayOfWeek) {
      logger.info('Starting weekly stories generation...');
      await generateWeeklyStories();
      lastStoryGenerationDay = dayOfWeek;
      logger.info('Weekly stories generation completed');
    }
  } catch (error) {
    logger.error(error, 'Weekly stories generation error');
  }
}, 3600000); // Check every hour

// Task expiration checker - check for expired recurring tasks every hour
// Process at midnight (00:00) to check tasks that expired during the day
setInterval(async () => {
  try {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Проверяем сгоревшие задачи каждый час в начале часа (00 минут)
    if (minute === 0) {
      logger.info('Checking for expired recurring tasks...');
      const result = await processExpiredRecurringTasks();
      if (result.expired > 0) {
        logger.info(`Processed ${result.expired} expired tasks, updated ${result.processed} tasks`);
      }
    }
  } catch (error) {
    logger.error(error, 'Task expiration check error');
  }
}, 60000); // Check every minute (to catch the start of the hour)

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