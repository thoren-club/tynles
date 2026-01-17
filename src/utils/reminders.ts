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

    // Получаем всех пользователей с включенными напоминаниями
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

    let remindersSent = 0;
    const processedTasks = new Set<string>();

    for (const user of usersWithSettings) {
      try {
        const settings = user.notificationSettings;
        
        // Пропускаем если напоминания выключены
        if (settings && !settings.taskRemindersEnabled) {
          continue;
        }

        const hoursBefore = settings?.reminderHoursBefore || defaultReminderHoursBefore;
        
        // Получаем задачи пользователя во ВСЕХ его пространствах
        const userSpaces = user.spaceMembers.map(m => m.spaceId);
        
        if (userSpaces.length === 0) continue;

        const tasks = await prisma.task.findMany({
          where: {
            spaceId: { in: userSpaces },
            createdBy: user.id,
            dueAt: { not: null },
            isPaused: false,
          },
        });

        for (const task of tasks) {
          if (!task.dueAt || processedTasks.has(task.id.toString())) continue;

          const dueDate = new Date(task.dueAt);
          const diffMs = dueDate.getTime() - now.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          // Проверяем, нужно ли отправлять напоминание
          const isOverdue = diffMs < 0;
          const shouldRemind = !isOverdue && diffHours <= hoursBefore && diffHours > 0;

          if ((isOverdue || shouldRemind) && !task.reminderSent) {
            const message = generateTaskReminderMessage(task.title, isOverdue);
            
            const sent = await sendTelegramMessage(user.tgId, message);
            
            if (sent) {
              // Отмечаем, что напоминание отправлено
              await prisma.task.update({
                where: { id: task.id },
                data: { reminderSent: true },
              });
              
              processedTasks.add(task.id.toString());
              remindersSent++;
              
              logger.info({
                userId: user.id.toString(),
                taskId: task.id.toString(),
                taskTitle: task.title,
                isOverdue,
              }, 'Task reminder sent');
            }
          }
        }
      } catch (error) {
        logger.error({ error, userId: user.id.toString() }, 'Error processing reminders for user');
      }
    }

    logger.info({ remindersSent }, 'Task reminders check completed');
    return remindersSent;
  } catch (error) {
    logger.error({ error }, 'Error in sendTaskReminders');
    throw error;
  }
}
