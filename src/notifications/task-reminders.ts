import { prisma } from '../db';
import { logger } from '../logger';
import { generateTaskReminderMessage } from '../utils/telegram';
import { TelegramTransport } from './telegram-transport';

export type TaskReminderRunResult = {
  remindersSent: number;
  consideredTasks: number;
  horizonHours: number;
};

function getAssigneeScopeFromPayload(payload: any): 'user' | 'space' {
  return payload?.assigneeScope === 'space' ? 'space' : 'user';
}

function getAssigneeUserIdFromPayload(payload: any): bigint | null {
  if (getAssigneeScopeFromPayload(payload) === 'space') {
    return null;
  }
  const raw = payload?.assigneeUserId;
  if (!raw) return null;
  try {
    return BigInt(String(raw));
  } catch {
    return null;
  }
}

function parseReminderTime(value?: string, fallback: string = '18:00') {
  const raw = value || fallback;
  const [h, m] = raw.split(':');
  const hours = Number(h);
  const minutes = Number(m);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return { hours: 18, minutes: 0 };
  }
  return {
    hours: Math.max(0, Math.min(23, Math.floor(hours))),
    minutes: Math.max(0, Math.min(59, Math.floor(minutes))),
  };
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
  const defaultReminderTime = '18:00';

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
  horizonHours = Math.max(horizonHours, 48);

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
    const isNoTime = isRecurring ? !payload?.timeOfDay : task.dueHasTime === false;
    const assigneeScope = getAssigneeScopeFromPayload(payload);
    const isRecurring = !!(task.recurrenceType && task.recurrenceType !== 'none');

    if (assigneeScope === 'space') {
      const members = await prisma.spaceMember.findMany({
        where: { spaceId: task.spaceId },
        select: { userId: true },
      });
      let sentToAny = false;

      for (const member of members) {
        const recipient = userById.get(member.userId);
        if (!recipient) continue;

        const settings = recipient.notificationSettings;
        if (settings && !settings.taskRemindersEnabled) continue;

        let shouldRemind = false;
        let isDayBefore = false;
        if (!isOverdue && isNoTime) {
          const reminderTime = parseReminderTime(settings?.reminderTime, defaultReminderTime);
          const reminderAt = new Date(dueDate);
          reminderAt.setDate(reminderAt.getDate() - 1);
          reminderAt.setHours(reminderTime.hours, reminderTime.minutes, 0, 0);
          shouldRemind = now >= reminderAt && now < dueDate;
          isDayBefore = true;
        } else {
          const hoursBefore = settings?.reminderHoursBefore || defaultReminderHoursBefore;
          shouldRemind = !isOverdue && diffHours <= hoursBefore && diffHours > 0;
        }

        if (!isOverdue && !shouldRemind) continue;

        const recipientName = recipient.firstName || recipient.username || undefined;
        const message = generateTaskReminderMessage(task.title, isOverdue, {
          isRecurring,
          recipientName,
          isDayBefore,
        });

        const sent = await transport.sendMessage(recipient.tgId, message);
        if (sent) {
          sentToAny = true;
        }
      }

      if (!sentToAny) continue;

      await prisma.task.update({
        where: { id: task.id },
        data: { reminderSent: true },
      });
      remindersSent++;
    } else {
      const assigneeUserId = getAssigneeUserIdFromPayload(payload);
      const recipientUserId: bigint = assigneeUserId ?? task.createdBy;

      const recipient = userById.get(recipientUserId);
      if (!recipient) continue;

      const settings = recipient.notificationSettings;
      if (settings && !settings.taskRemindersEnabled) continue;

      let shouldRemind = false;
      let isDayBefore = false;
      if (!isOverdue && isNoTime) {
        const reminderTime = parseReminderTime(settings?.reminderTime, defaultReminderTime);
        const reminderAt = new Date(dueDate);
        reminderAt.setDate(reminderAt.getDate() - 1);
        reminderAt.setHours(reminderTime.hours, reminderTime.minutes, 0, 0);
        shouldRemind = now >= reminderAt && now < dueDate;
        isDayBefore = true;
      } else {
        const hoursBefore = settings?.reminderHoursBefore || defaultReminderHoursBefore;
        shouldRemind = !isOverdue && diffHours <= hoursBefore && diffHours > 0;
      }

      if (!isOverdue && !shouldRemind) continue;

      const recipientName = recipient.firstName || recipient.username || undefined;
      const message = generateTaskReminderMessage(task.title, isOverdue, {
        isRecurring,
        recipientName,
        isDayBefore,
      });

      const sent = await transport.sendMessage(recipient.tgId, message);
      if (!sent) continue;

      await prisma.task.update({
        where: { id: task.id },
        data: { reminderSent: true },
      });
      remindersSent++;
    }
  }

  logger.info({ remindersSent, consideredTasks: tasks.length, horizonHours }, 'Task reminders check completed');
  return { remindersSent, consideredTasks: tasks.length, horizonHours };
}

