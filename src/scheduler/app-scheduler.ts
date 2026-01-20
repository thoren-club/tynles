import { logger } from '../logger';
import { startNotificationsScheduler } from '../notifications/scheduler';
import { generateWeeklyStories } from '../utils/story-generator';
import { processExpiredRecurringTasks } from '../utils/task-expiration';

export type AppScheduler = {
  stop: () => void;
};

export type AppSchedulerOptions = {
  /**
   * Start notifications scheduler (task reminders).
   * Default: true
   */
  notifications?: boolean;

  /**
   * Start weekly stories generator.
   * Default: true
   */
  weeklyStories?: boolean;

  /**
   * Start recurring task expiration checker.
   * Default: true
   */
  taskExpiration?: boolean;
};

/**
 * Starts all background jobs for the app in one place.
 *
 * Each job is protected from concurrent execution (in-flight guard).
 */
export function startAppScheduler(opts: AppSchedulerOptions = {}): AppScheduler {
  const notifications = opts.notifications ?? true;
  const weeklyStories = opts.weeklyStories ?? true;
  const taskExpiration = opts.taskExpiration ?? true;

  const stopFns: Array<() => void> = [];

  if (notifications) {
    const notif = startNotificationsScheduler();
    stopFns.push(() => notif.stop());
  }

  // Weekly stories generator - run every hour and check if it's start of week
  if (weeklyStories) {
    let lastStoryGenerationDay: number | null = null;
    let inFlight = false;

    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
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
      } finally {
        inFlight = false;
      }
    };

    const timer = setInterval(() => void tick(), 3_600_000);
    timer.unref?.();
    stopFns.push(() => clearInterval(timer));
  }

  // Task expiration checker - check for expired recurring tasks every hour
  // Process at midnight (00:00) to check tasks that expired during the day
  if (taskExpiration) {
    let inFlight = false;
    let lastRunAt = 0;

    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const now = new Date();
        const shouldRun = now.getTime() - lastRunAt >= 60 * 60 * 1000;
        if (!shouldRun) return;

        logger.info('Checking for expired recurring tasks...');
        const result = await processExpiredRecurringTasks();
        lastRunAt = now.getTime();
        if (result.expired > 0) {
          logger.info(`Processed ${result.expired} expired tasks, updated ${result.processed} tasks`);
        }
      } catch (error) {
        logger.error(error, 'Task expiration check error');
      } finally {
        inFlight = false;
      }
    };

    const timer = setInterval(() => void tick(), 60_000);
    timer.unref?.();
    stopFns.push(() => clearInterval(timer));
  }

  return {
    stop: () => {
      for (const stop of stopFns) stop();
    },
  };
}

