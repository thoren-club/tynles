import { prisma } from '../db';
import { logger } from '../logger';
import { calculateNextDueDate } from './recurrence';

/**
 * Проверяет и обрабатывает сгоревшие повторяющиеся задачи
 * Сгоревшая задача - это повторяющаяся задача, у которой прошел dueAt, но она не была выполнена
 * Штраф: снимается половина опыта, который давала бы задача
 */
export async function processExpiredRecurringTasks() {
  try {
    const now = new Date();
    
    // Находим все повторяющиеся задачи, у которых прошел срок выполнения
    const expiredTasks = await prisma.task.findMany({
      where: {
        recurrenceType: {
          not: null,
        },
        dueAt: {
          lt: now, // Срок выполнения прошел
        },
        isPaused: false,
      },
      include: {
        space: true,
      },
    });

    if (expiredTasks.length === 0) {
      return { processed: 0, expired: 0 };
    }

    let expiredCount = 0;
    let processedCount = 0;

    for (const task of expiredTasks) {
      try {
        // Снимаем половину опыта у создателя задачи
        const penaltyXp = Math.floor(task.xp / 2);
        
        if (penaltyXp > 0) {
          // Получаем статистику пользователя
          const stats = await prisma.userSpaceStats.findUnique({
            where: {
              spaceId_userId: {
                spaceId: task.spaceId,
                userId: task.createdBy,
              },
            },
          });

          if (stats) {
            // Снимаем половину опыта (но не ниже 0)
            const newTotalXp = Math.max(0, stats.totalXp - penaltyXp);
            
            // Пересчитываем уровень на основе нового опыта
            const newLevel = Math.floor(newTotalXp / 100) + 1;
            
            await prisma.userSpaceStats.update({
              where: {
                spaceId_userId: {
                  spaceId: task.spaceId,
                  userId: task.createdBy,
                },
              },
              data: {
                totalXp: newTotalXp,
                level: newLevel,
              },
            });

            logger.info(
              `Task ${task.id} expired. Penalty: -${penaltyXp} XP for user ${task.createdBy} in space ${task.spaceId}`
            );
            expiredCount++;
          }
        }

        // Обновляем задачу на следующий период или удаляем (зависит от типа)
        if (task.recurrenceType && task.recurrenceType !== 'none') {
          // Преобразуем тип для calculateNextDueDate
          // В БД у нас 'daily' для задач с daysOfWeek, но это на самом деле еженедельные
          let recurrenceType = task.recurrenceType;
          const payload = task.recurrencePayload as { daysOfWeek?: number[] } | null;
          
          // Если есть daysOfWeek - это еженедельная задача, независимо от типа
          if (payload?.daysOfWeek && payload.daysOfWeek.length > 0) {
            recurrenceType = 'weekly';
          }
          
          const nextDueAt = calculateNextDueDate(
            recurrenceType,
            payload as any,
            now,
          );

          if (nextDueAt) {
            // Обновляем задачу на следующий период
            await prisma.task.update({
              where: { id: task.id },
              data: {
                dueAt: nextDueAt,
                reminderSent: false, // Сбрасываем флаг напоминания
              },
            });
            processedCount++;
          } else {
            // Если нет следующей даты - удаляем задачу
            await prisma.task.delete({
              where: { id: task.id },
            });
            logger.info(`Task ${task.id} deleted (no next date)`);
          }
        } else {
          // Не должно произойти, так как мы фильтруем только повторяющиеся
          // Но на всякий случай удаляем
          await prisma.task.delete({
            where: { id: task.id },
          });
        }
      } catch (error) {
        logger.error(error, `Failed to process expired task ${task.id}`);
      }
    }

    return { processed: processedCount, expired: expiredCount };
  } catch (error) {
    logger.error(error, 'Failed to process expired recurring tasks');
    return { processed: 0, expired: 0 };
  }
}
