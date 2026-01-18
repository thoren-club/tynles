import { sendTaskReminders as sendTaskRemindersNew } from '../notifications';

/**
 * Legacy wrapper (kept for backwards compatibility).
 *
 * Prefer importing from `src/notifications` instead.
 */
export async function sendTaskReminders() {
  const result = await sendTaskRemindersNew();
  return result.remindersSent;
}
