import { Bot } from 'grammy';
import { config } from './config';
import { logger } from './logger';
import { prisma } from './db';
import { AuthContext } from './middleware/auth';
import { setupSpaceCommands } from './commands/space';
import { setupMemberCommands } from './commands/members';
import { setupTaskCommands } from './commands/tasks';
import { setupGoalCommands } from './commands/goals';
import { setupLevelCommands } from './commands/levels';
import { setupRewardCommands } from './commands/rewards';
import { sendReminders } from './utils/task-scheduler';

const bot = new Bot<AuthContext>(config.botToken);

// Setup commands
setupSpaceCommands(bot);
setupMemberCommands(bot);
setupTaskCommands(bot);
setupGoalCommands(bot);
setupLevelCommands(bot);
setupRewardCommands(bot);

// Start command
bot.command('start', async (ctx) => {
  await ctx.reply(
    `Welcome! I'm a task and goal management bot with gamification.\n\n` +
      `Use /space_create to create a space or /space_list to see your spaces.\n\n` +
      `Available commands:\n` +
      `/space_create, /space_list, /space_switch, /space_info\n` +
      `/task_add, /task_list, /task_done, /task_pause, /task_resume, /task_delete\n` +
      `/goal_add, /goal_list, /goal_done, /goal_delete\n` +
      `/me, /leaderboard\n` +
      `/invite_create, /invite_use, /members, /member_role, /member_kick\n` +
      `/reward_set, /reward_list, /reward_delete`
  );
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