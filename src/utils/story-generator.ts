import { prisma } from '../db';
import { logger } from '../logger';

/**
 * Получает начало текущей недели (понедельник)
 */
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Получает начало предыдущей недели
 */
function getPreviousWeekStart(date: Date = new Date()): Date {
  const currentWeekStart = getWeekStart(date);
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  return previousWeekStart;
}

/**
 * Получает позицию пользователя в лидерборде пространства
 */
async function getUserLeaderboardPosition(
  spaceId: bigint,
  userId: bigint
): Promise<number> {
  const allStats = await prisma.userSpaceStats.findMany({
    where: { spaceId },
    orderBy: { totalXp: 'desc' },
  });

  const position = allStats.findIndex((s) => s.userId === userId);
  return position >= 0 ? position + 1 : allStats.length + 1;
}

/**
 * Генерирует недельную историю для пользователя в пространстве
 */
export async function generateStoryForUser(
  spaceId: bigint,
  userId: bigint,
  weekStart: Date
): Promise<void> {
  try {
    // Проверяем, не создана ли уже история за эту неделю
    const existingStory = await prisma.story.findFirst({
      where: {
        spaceId,
        userId,
        type: 'Weekly',
        weekStartDate: weekStart,
      },
    });

    if (existingStory) {
      logger.info(`Story already exists for user ${userId} in space ${spaceId} for week ${weekStart.toISOString()}`);
      return;
    }

    // Получаем текущую статистику пользователя
    const currentStats = await prisma.userSpaceStats.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId,
        },
      },
    });

    if (!currentStats) {
      logger.info(`No stats found for user ${userId} in space ${spaceId}`);
      return;
    }

    const currentLevel = currentStats.level;
    const currentXp = currentStats.totalXp;
    const currentPosition = await getUserLeaderboardPosition(spaceId, userId);

    // Получаем статистику предыдущей недели (из последней истории Weekly)
    const previousWeekStart = getPreviousWeekStart(weekStart);
    const previousStory = await prisma.story.findFirst({
      where: {
        spaceId,
        userId,
        type: 'Weekly',
        weekStartDate: previousWeekStart,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Вычисляем изменения
    let previousLevel = currentLevel;
    let previousXp = currentXp;
    let previousPosition = currentPosition;

    if (previousStory && previousStory.data) {
      const prevData = previousStory.data as any;
      
      // Используем сохраненные базовые значения из предыдущей истории (если есть)
      if (prevData.baseLevel !== undefined) {
        previousLevel = prevData.baseLevel + (prevData.levelsGained || 0);
        previousXp = prevData.baseXp || 0;
      } else if (prevData.levelsGained !== undefined) {
        // Fallback: вычисляем обратным путем
        previousLevel = Math.max(1, currentLevel - prevData.levelsGained);
        previousXp = (previousLevel - 1) * 100;
      }
      
      // Получаем позицию из предыдущей истории
      if (prevData.leaderboardPosition !== undefined) {
        previousPosition = prevData.leaderboardPosition;
      }
    } else {
      // Если нет предыдущей истории (первый запуск), считаем что все текущие значения = базовые
      // Изменения будут = 0
      previousLevel = currentLevel;
      previousXp = currentXp;
      previousPosition = currentPosition;
    }

    // Считаем изменения
    const levelsGained = Math.max(0, currentLevel - previousLevel);
    
    // Приблизительное количество выполненных задач через разницу XP
    // Предполагаем средний XP за задачу = 50 (можно улучшить)
    const avgXpPerTask = 50;
    const xpGained = Math.max(0, currentXp - previousXp);
    const estimatedTasksCompleted = Math.round(xpGained / avgXpPerTask);

    // Изменение позиции в лидерборде (положительное = поднялись, отрицательное = опустились)
    const leaderboardChange = previousPosition - currentPosition;

    // Создаём историю
    // В leaderboardPosition сохраняем текущую позицию для сравнения на следующей неделе
    const storyData = {
      tasksCompleted: estimatedTasksCompleted,
      levelsGained,
      leaderboardChange,
      leaderboardPosition: currentPosition, // Сохраняем текущую позицию для следующей недели
      // Также сохраняем базовые значения для более точного расчета на следующей неделе
      baseLevel: previousLevel, // Базовый уровень начала недели
      baseXp: previousXp, // Базовый XP начала недели
    };

    await prisma.story.create({
      data: {
        spaceId,
        userId,
        type: 'Weekly',
        data: storyData,
        weekStartDate: weekStart,
      },
    });

    logger.info(
      `Generated story for user ${userId} in space ${spaceId}: ` +
      `${estimatedTasksCompleted} tasks, +${levelsGained} levels, ` +
      `leaderboard change: ${leaderboardChange}`
    );
  } catch (error) {
    logger.error(error, `Failed to generate story for user ${userId} in space ${spaceId}`);
  }
}

/**
 * Генерирует недельные истории для всех пользователей во всех пространствах
 * Вызывается в конце недели (например, в воскресенье вечером или понедельник утром)
 */
export async function generateWeeklyStories(): Promise<void> {
  try {
    logger.info('Starting weekly stories generation...');
    
    const weekStart = getWeekStart();
    
    // Получаем все пространства
    const spaces = await prisma.space.findMany({
      include: {
        members: true,
      },
    });

    let storiesGenerated = 0;

    for (const space of spaces) {
      for (const member of space.members) {
        await generateStoryForUser(space.id, member.userId, weekStart);
        storiesGenerated++;
      }
    }

    logger.info(`Weekly stories generation completed. Generated ${storiesGenerated} stories.`);
  } catch (error) {
    logger.error(error, 'Failed to generate weekly stories');
    throw error;
  }
}

/**
 * Генерирует истории для конкретной недели (для тестирования или ручного запуска)
 */
export async function generateStoriesForWeek(weekStart: Date): Promise<void> {
  try {
    logger.info(`Generating stories for week starting ${weekStart.toISOString()}...`);
    
    const spaces = await prisma.space.findMany({
      include: {
        members: true,
      },
    });

    let storiesGenerated = 0;

    for (const space of spaces) {
      for (const member of space.members) {
        await generateStoryForUser(space.id, member.userId, weekStart);
        storiesGenerated++;
      }
    }

    logger.info(`Stories generation completed. Generated ${storiesGenerated} stories.`);
  } catch (error) {
    logger.error(error, 'Failed to generate stories for week');
    throw error;
  }
}
