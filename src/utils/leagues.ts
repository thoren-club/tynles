import { prisma } from '../db';
import { logger } from '../logger';

/**
 * Система лиг (12 лиг)
 * Логика как в Duolingo:
 * - Каждые 30 дней происходит пересмотр лиг
 * - Первые 10 → вперёд (в следующую лигу)
 * - Следующие 30 остаются (в текущей лиге)
 * - Остальные 10 → назад (в предыдущую лигу)
 */

export enum League {
  BRONZE = 1,
  SILVER = 2,
  GOLD = 3,
  SAPPHIRE = 4,
  RUBY = 5,
  EMERALD = 6,
  AMETHYST = 7,
  PEARL = 8,
  OBSIDIAN = 9,
  DIAMOND = 10,
  MASTER = 11,
  LEGENDARY = 12,
}

// Названия лиг
export const LEAGUE_NAMES: Record<League, string> = {
  [League.BRONZE]: 'Бронзовая',
  [League.SILVER]: 'Серебряная',
  [League.GOLD]: 'Золотая',
  [League.SAPPHIRE]: 'Сапфировая',
  [League.RUBY]: 'Рубиновая',
  [League.EMERALD]: 'Изумрудная',
  [League.AMETHYST]: 'Аметистовая',
  [League.PEARL]: 'Жемчужная',
  [League.OBSIDIAN]: 'Обсидиановая',
  [League.DIAMOND]: 'Алмазная',
  [League.MASTER]: 'Мастер',
  [League.LEGENDARY]: 'Легендарная',
};

// Позиции для перехода между лигами
export const PROMOTION_POSITIONS = 10; // Первые 10 → вперёд
export const STAY_POSITIONS = 30; // Следующие 30 остаются
export const DEMOTION_POSITIONS = 10; // Остальные 10 → назад
export const TOTAL_POSITIONS = PROMOTION_POSITIONS + STAY_POSITIONS + DEMOTION_POSITIONS; // 50

// Длительность периода лиги в днях
export const LEAGUE_PERIOD_DAYS = 30;

/**
 * Получает имя лиги по номеру
 */
export function getLeagueName(league: number): string {
  return LEAGUE_NAMES[league as League] || `Лига ${league}`;
}

/**
 * Получает опыт пользователя за последние 30 дней
 * Опыт считается по задачам, которые были выполнены в этот период
 */
export async function getUserXpLast30Days(spaceId: bigint, userId: bigint): Promise<number> {
  // Для MVP используем общий опыт (totalXp), так как нет истории выполнения задач
  // В будущем можно добавить таблицу TaskCompletion для отслеживания выполнения
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - LEAGUE_PERIOD_DAYS);

  // Получаем статистику пользователя
  const stats = await prisma.userSpaceStats.findUnique({
    where: {
      spaceId_userId: {
        spaceId,
        userId,
      },
    },
  });

  if (!stats) {
    return 0;
  }

  // TODO: В будущем нужно отслеживать изменение totalXp во времени
  // Для MVP используем текущий totalXp как приблизительную оценку
  // Это работает, если лиги обновляются раз в 30 дней и опыт накапливается постепенно
  
  return stats.totalXp;
}

/**
 * Получает лидерборд лиги с позициями пользователей
 * Возвращает отсортированный список пользователей с их позициями
 */
export async function getLeagueLeaderboard(
  spaceId: bigint,
  league: number,
  limit: number = TOTAL_POSITIONS
): Promise<Array<{ userId: bigint; xp: number; position: number }>> {
  // Получаем всех пользователей в этой лиге (пока лига не хранится в БД, используем все)
  // TODO: Добавить поле currentLeague в UserSpaceStats после миграции
  
  // Для MVP: получаем всех пользователей пространства, сортируем по опыту за 30 дней
  const users = await prisma.userSpaceStats.findMany({
    where: { spaceId },
    include: { user: true },
    orderBy: { totalXp: 'desc' },
    take: limit,
  });

  // Рассчитываем опыт за 30 дней для каждого пользователя
  const leaderboard = await Promise.all(
    users.map(async (userStat: typeof users[0], index: number) => {
      const xp30Days = await getUserXpLast30Days(spaceId, userStat.userId);
      return {
        userId: userStat.userId,
        xp: xp30Days,
        position: index + 1,
      };
    })
  );

  // Сортируем по опыту за 30 дней (убывание)
  leaderboard.sort((a: { xp: number }, b: { xp: number }) => b.xp - a.xp);

  // Переназначаем позиции после сортировки
  return leaderboard.map((entry: typeof leaderboard[0], index: number) => ({
    ...entry,
    position: index + 1,
  }));
}

/**
 * Определяет новую лигу пользователя на основе позиции в текущей лиге
 */
export function calculateNewLeague(currentLeague: number, position: number): number {
  if (position <= PROMOTION_POSITIONS) {
    // Первые 10 → вперёд
    if (currentLeague < League.LEGENDARY) {
      return currentLeague + 1;
    }
    // Если уже в последней лиге - остаётся в ней
    return currentLeague;
  } else if (position <= PROMOTION_POSITIONS + STAY_POSITIONS) {
    // Следующие 30 остаются
    return currentLeague;
  } else {
    // Остальные 10 → назад
    if (currentLeague > League.BRONZE) {
      return currentLeague - 1;
    }
    // Если уже в первой лиге - остаётся в ней
    return currentLeague;
  }
}

/**
 * Обновляет лиги всех пользователей пространства
 * Должно вызываться каждые 30 дней
 */
export async function updateLeaguesForSpace(spaceId: bigint) {
  try {
    // TODO: После миграции добавить поля currentLeague и leaguePeriodStart в UserSpaceStats
    // Пока используем приблизительную логику:
    // - Все пользователи начинают с первой лиги (BRONZE = 1)
    // - Сортируем по опыту за 30 дней
    // - Распределяем по лигам
    
    logger.info(`Starting league update for space ${spaceId}`);
    
    // Получаем всех пользователей пространства
    const allUsers = await prisma.userSpaceStats.findMany({
      where: { spaceId },
      include: { user: true },
    });

    // Рассчитываем опыт за 30 дней для каждого пользователя
    const usersWithXp = await Promise.all(
      allUsers.map(async (userStat: typeof allUsers[0]) => {
        const xp30Days = await getUserXpLast30Days(spaceId, userStat.userId);
        return {
          userId: userStat.userId,
          xp: xp30Days,
          currentLeague: 1, // TODO: получить из userStat.currentLeague после миграции
        };
      })
    );

    // Сортируем по опыту за 30 дней (убывание)
    usersWithXp.sort((a: { xp: number }, b: { xp: number }) => b.xp - a.xp);

    // Распределяем пользователей по лигам
    // Для MVP: используем простую логику распределения
    const usersPerLeague = Math.ceil(usersWithXp.length / 12);
    let league = League.LEGENDARY; // Начинаем с самой высокой лиги
    
    for (let i = 0; i < usersWithXp.length; i++) {
      if (i > 0 && i % usersPerLeague === 0 && league > League.BRONZE) {
        league--;
      }
      
      const user = usersWithXp[i];
      const positionInLeague = (i % usersPerLeague) + 1;
      
      // Рассчитываем новую лигу на основе позиции
      const newLeague = calculateNewLeague(league, positionInLeague);
      
      // TODO: Обновить currentLeague и leaguePeriodStart в БД после миграции
      logger.info(
        `User ${user.userId}: league ${league} -> ${newLeague} (position ${positionInLeague}, XP: ${user.xp})`
      );
    }

    logger.info(`League update completed for space ${spaceId}`);
  } catch (error) {
    logger.error(error, `Failed to update leagues for space ${spaceId}`);
  }
}

/**
 * Получает текущую лигу пользователя
 * TODO: После миграции получать из UserSpaceStats.currentLeague
 */
export async function getUserCurrentLeague(
  spaceId: bigint,
  userId: bigint
): Promise<number> {
  // Для MVP возвращаем первую лигу
  // TODO: После миграции получать из UserSpaceStats.currentLeague
  return League.BRONZE;
}

/**
 * Получает позицию пользователя в его текущей лиге
 */
export async function getUserLeaguePosition(
  spaceId: bigint,
  userId: bigint,
  league: number
): Promise<number | null> {
  const leaderboard = await getLeagueLeaderboard(spaceId, league);
  const userEntry = leaderboard.find((entry) => entry.userId === userId);
  return userEntry?.position || null;
}
