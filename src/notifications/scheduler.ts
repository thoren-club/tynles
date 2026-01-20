import { logger } from '../logger';
import { telegramTransport } from './telegram-transport';
import { sendTaskReminders } from './task-reminders';
import { sendEngagementNotifications } from './engagement-notifications';

export type NotificationsScheduler = {
  stop: () => void;
};

export type NotificationsSchedulerOptions = {
  /**
   * How often to run reminders. Default: 60 seconds.
   */
  intervalMs?: number;

  /**
   * Run one tick immediately on startup. Default: true.
   */
  runOnStart?: boolean;
};

/**
 * Starts notification background jobs (currently: task reminders).
 *
 * - Has an in-flight guard (won't run two ticks concurrently).
 * - Logs errors but keeps the interval alive.
 */
export function startNotificationsScheduler(
  opts: NotificationsSchedulerOptions = {},
): NotificationsScheduler {
  const intervalMs = opts.intervalMs ?? 60_000;
  const runOnStart = opts.runOnStart ?? true;

  let stopped = false;
  let inFlight = false;
  let lastEngagementRun = 0;

  const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string) => {
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const tick = async () => {
    if (stopped) return;
    if (inFlight) return;
    inFlight = true;

    try {
      try {
        await withTimeout(sendTaskReminders(telegramTransport), 25_000, 'sendTaskReminders');
      } catch (error) {
        logger.error(error, 'Task reminders failed');
      }

      const now = Date.now();
      if (now - lastEngagementRun > 6 * 60 * 60 * 1000) {
        try {
          await withTimeout(sendEngagementNotifications(telegramTransport), 25_000, 'sendEngagementNotifications');
          lastEngagementRun = now;
        } catch (error) {
          logger.error(error, 'Engagement notifications failed');
        }
      }
    } catch (error) {
      logger.error(error, 'Notifications scheduler error');
    } finally {
      inFlight = false;
    }
  };

  if (runOnStart) {
    void tick();
  }

  const timer = setInterval(() => {
    void tick();
  }, intervalMs);

  // Don't keep the process alive only because of this interval.
  timer.unref?.();

  return {
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
  };
}

