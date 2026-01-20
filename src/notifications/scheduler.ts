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

  const tick = async () => {
    if (stopped) return;
    if (inFlight) return;
    inFlight = true;

    try {
      await sendTaskReminders(telegramTransport);
      const now = Date.now();
      if (now - lastEngagementRun > 6 * 60 * 60 * 1000) {
        await sendEngagementNotifications(telegramTransport);
        lastEngagementRun = now;
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

