import { prisma } from '../db';
import { logger } from '../logger';
import { sendTelegramMessage, generateTaskReminderMessage } from './telegram';

/**
 * Отправляет напоминания о задачах всем пользователям
 * Должна вызываться cron job'ом периодически (например, каждый час)
 */
export async function sendTaskReminders() {
  try {
    logger.info('Starting task reminders check');
    
    const now = new Date();
    const defaultReminderHoursBefore = 2;

    // Получаем всех пользователей с настройками (нужны tgId + настройки)
    const usersWithSettings = await prisma.telegramUser.findMany({
      include: {
        notificationSettings: true,
        spaceMembers: {
          include: {
            space: true,
          },
        },
      },
    });

    const userById = new Map<bigint, typeof usersWithSettings[number]>();
    for (const u of usersWithSettings) userById.set(u.id, u);

    // Берём все задачи с дедлайном и без паузы, и отправляем напоминание ТОЛЬКО назначенному (или создателю, если не назначено)
    const tasksWithDueDate = await prisma.task.findMany({
      where: {
        dueAt: { not: null },
        isPaused: false,
      },
    });

    let remindersSent = 0;

    for (const task of tasksWithDueDate) {
      if (!task.dueAt) continue;
      if (task.reminderSent) continue;

      const dueDate = new Date(task.dueAt);
      const diffMs = dueDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      const isOverdue = diffMs < 0;

      // определяем получателя: assigneeUserId из recurrencePayload или createdBy
      const payload = task.recurrencePayload as any;
      let recipientUserId: bigint = task.createdBy;
      if (payload?.assigneeUserId) {
        try {
          recipientUserId = BigInt(String(payload.assigneeUserId));
        } catch {
          recipientUserId = task.createdBy;
        }
      }

      const recipient = userById.get(recipientUserId);
      if (!recipient) continue;

      const settings = recipient.notificationSettings;
      if (settings && !settings.taskRemindersEnabled) continue;
      const hoursBefore = settings?.reminderHoursBefore || defaultReminderHoursBefore;

      const shouldRemind = !isOverdue && diffHours <= hoursBefore && diffHours > 0;
      if (!isOverdue && !shouldRemind) continue;

      const isRecurring = !!(task.recurrenceType && task.recurrenceType !== 'none');
      const message = generateTaskReminderMessage(task.title, isOverdue, { isRecurring });

      const sent = await sendTelegramMessage(recipient.tgId, message);
      if (!sent) continue;

      await prisma.task.update({
        where: { id: task.id },
        data: { reminderSent: true },
      });
      remindersSent++;
    }

    logger.info({ remindersSent }, 'Task reminders check completed');
    return remindersSent;
  } catch (error) {
    logger.error({ error }, 'Error in sendTaskReminders');
    throw error;
  }
}
