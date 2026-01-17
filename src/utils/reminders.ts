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

        // Получаем задачи пользователя - включаем задачи с дедлайном и без него
        const tasksWithDueDate = await prisma.task.findMany({
          where: {
            spaceId: { in: userSpaces },
            createdBy: user.id,
            dueAt: { not: null },
            isPaused: false,
          },
        });

        // Задачи без дедлайна (повторяющиеся задачи без установленного dueAt или одноразовые)
        const tasksWithoutDueDate = await prisma.task.findMany({
          where: {
            spaceId: { in: userSpaces },
            createdBy: user.id,
            dueAt: null,
            isPaused: false,
          },
        });

        // Обрабатываем задачи с дедлайном
        for (const task of tasksWithDueDate) {
          if (!task.dueAt || processedTasks.has(task.id.toString())) continue;

          const dueDate = new Date(task.dueAt);
          const diffMs = dueDate.getTime() - now.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          // Проверяем, нужно ли отправлять напоминание
          const isOverdue = diffMs < 0;
          const shouldRemind = !isOverdue && diffHours <= hoursBefore && diffHours > 0;

          // Проверяем, не отправляли ли уже напоминание
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

        // Обрабатываем задачи без дедлайна (напоминания для повторяющихся задач, которые не выполнялись долго)
        for (const task of tasksWithoutDueDate) {
          if (processedTasks.has(task.id.toString())) continue;

          // Для повторяющихся задач без дедлайна: напоминаем, если не выполнялись более 24 часов
          const isRecurring = task.recurrenceType && task.recurrenceType !== 'none';
          
          if (isRecurring && task.updatedAt) {
            const lastCompleted = new Date(task.updatedAt);
            const hoursSinceCompletion = (now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60);
            
            // Напоминаем о ежедневной задаче, если не выполнялась более 24 часов
            if (task.recurrenceType === 'daily' && hoursSinceCompletion >= 24 && !task.reminderSent) {
              const message = generateTaskReminderMessage(task.title, false);
              
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
                  hoursSinceCompletion,
                }, 'Task reminder sent (no due date)');
              }
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
