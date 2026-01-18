import { prisma } from '../db';
import { logger } from '../logger';
import { generateTaskReminderMessage } from '../utils/telegram';
import { TelegramTransport } from './telegram-transport';

export type TaskReminderRunResult = {
  remindersSent: number;
  consideredTasks: number;
  horizonHours: number;
};

function getAssigneeUserIdFromPayload(payload: any): bigint | null {
  const raw = payload?.assigneeUserId;
  if (!raw) return null;
  try {
    return BigInt(String(raw));
  } catch {
    return null;
  }
}

/**
 * Sends task reminders using user settings and assignee logic.
 *
 * - Recipient: task assignee (from recurrencePayload.assigneeUserId) OR task creator
 * - Respects userNotificationSettings.taskRemindersEnabled and reminderHoursBefore
 * - Idempotency: task.reminderSent flag
 *
 * Designed to be safe to run frequently (e.g. every minute).
 */
export async function sendTaskReminders(transport: TelegramTransport): Promise<TaskReminderRunResult> {
  logger.info('Starting task reminders check');

  const now = new Date();
  const defaultReminderHoursBefore = 2;

  // We need tgId + notification settings for the recipient
  const usersWithSettings = await prisma.telegramUser.findMany({
    include: {
      notificationSettings: true,
    },
  });

  const userById = new Map<bigint, typeof usersWithSettings[number]>();
  let horizonHours = defaultReminderHoursBefore;

  for (const u of usersWithSettings) {
    userById.set(u.id, u);
    const h = u.notificationSettings?.reminderHoursBefore;
    if (typeof h === 'number' && Number.isFinite(h)) {
      horizonHours = Math.max(horizonHours, h);
    }
  }

  // Fetch only tasks that can possibly need a reminder soon.
  // Includes overdue tasks (dueAt <= now) and tasks due within the max configured horizon.
  const horizonDate = new Date(now.getTime() + horizonHours * 60 * 60 * 1000);

  const tasks = await prisma.task.findMany({
    where: {
      dueAt: { not: null, lte: horizonDate },
      isPaused: false,
      reminderSent: false,
    },
  });

  let remindersSent = 0;

  for (const task of tasks) {
    if (!task.dueAt) continue;
    if (task.reminderSent) continue;

    const dueDate = new Date(task.dueAt);
    const diffMs = dueDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const isOverdue = diffMs < 0;

    const payload = task.recurrencePayload as any;
    const assigneeUserId = getAssigneeUserIdFromPayload(payload);
    const recipientUserId: bigint = assigneeUserId ?? task.createdBy;

    const recipient = userById.get(recipientUserId);
    if (!recipient) continue;

    const settings = recipient.notificationSettings;
    if (settings && !settings.taskRemindersEnabled) continue;

    const hoursBefore = settings?.reminderHoursBefore || defaultReminderHoursBefore;

    const shouldRemind = !isOverdue && diffHours <= hoursBefore && diffHours > 0;
    if (!isOverdue && !shouldRemind) continue;

    const isRecurring = !!(task.recurrenceType && task.recurrenceType !== 'none');
    const message = generateTaskReminderMessage(task.title, isOverdue, { isRecurring });

    const sent = await transport.sendMessage(recipient.tgId, message);
    if (!sent) continue;

    await prisma.task.update({
      where: { id: task.id },
      data: { reminderSent: true },
    });
    remindersSent++;
  }

  logger.info({ remindersSent, consideredTasks: tasks.length, horizonHours }, 'Task reminders check completed');
  return { remindersSent, consideredTasks: tasks.length, horizonHours };
}

