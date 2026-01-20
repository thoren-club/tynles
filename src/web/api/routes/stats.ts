import { Router, Request, Response } from 'express';
import { prisma } from '../../../db';
import { AuthRequest } from '../middleware/auth';
import { 
  League, 
  getLeagueName, 
  getUserCurrentLeague, 
  getUserLeaguePosition,
  LEAGUE_PERIOD_DAYS 
} from '../../../utils/leagues';
import { getXpForNextLevelForSpace, getTotalXpForLevelForSpace } from '../../../utils/leveling';
import { sendPokeNotification } from '../../../notifications';

const router = Router();

// Get user stats
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId) {
      return res.status(404).json({ error: 'No current space' });
    }

    const stats = await prisma.userSpaceStats.findUnique({
      where: {
        spaceId_userId: {
          spaceId: authReq.currentSpaceId,
          userId: authReq.user!.id,
        },
      },
    });

    if (!stats) {
      return res.json({
        level: 1,
        totalXp: 0,
        currentLevelXp: 0,
        xpToNextLevel: await getXpForNextLevelForSpace(authReq.currentSpaceId, 1),
      });
    }

    const level = stats.level;
    const totalXp = stats.totalXp;
    const totalXpForCurrentLevel = await getTotalXpForLevelForSpace(authReq.currentSpaceId, level);
    const currentLevelXp = totalXp - totalXpForCurrentLevel;
    const xpToNextLevel = await getXpForNextLevelForSpace(authReq.currentSpaceId, level);

    res.json({
      level,
      totalXp,
      currentLevelXp,
      xpToNextLevel,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Weekly XP (last 7 days, current space)
router.get('/weekly-xp', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId) {
      return res.status(404).json({ error: 'No current space' });
    }

    const space = await prisma.space.findUnique({
      where: { id: authReq.currentSpaceId },
      select: { timezone: true },
    });
    const timeZone = space?.timezone || 'UTC';

    const formatDateKey = (date: Date) => {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date);
      const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
      return `${get('year')}-${get('month')}-${get('day')}`;
    };

    const getTimeZoneOffsetMinutes = (date: Date) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).formatToParts(date);
      const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
      const asUTC = Date.UTC(
        Number(get('year')),
        Number(get('month')) - 1,
        Number(get('day')),
        Number(get('hour')),
        Number(get('minute')),
        Number(get('second')),
      );
      return (asUTC - date.getTime()) / 60000;
    };

    const getStartOfDayInTimeZone = (date: Date) => {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date);
      const get = (type: string) => parts.find((p) => p.type === type)?.value || '01';
      const utcMidnight = new Date(Date.UTC(
        Number(get('year')),
        Number(get('month')) - 1,
        Number(get('day')),
        0,
        0,
        0,
      ));
      const offsetMinutes = getTimeZoneOffsetMinutes(utcMidnight);
      return new Date(utcMidnight.getTime() - offsetMinutes * 60000);
    };

    const today = new Date();
    const startDate = getStartOfDayInTimeZone(today);
    startDate.setDate(startDate.getDate() - 6);

    const completions = await prisma.taskCompletion.findMany({
      where: {
        spaceId: authReq.currentSpaceId,
        userId: authReq.user!.id,
        completedAt: { gte: startDate },
      },
      select: {
        completedAt: true,
        xp: true,
      },
    });

    const xpByDate = new Map<string, number>();
    for (const row of completions) {
      const date = new Date(row.completedAt);
      if (Number.isNaN(date.getTime())) continue;
      const key = formatDateKey(date);
      xpByDate.set(key, (xpByDate.get(key) || 0) + (row.xp || 0));
    }

    const days = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      const key = formatDateKey(day);
      return { date: key, xp: xpByDate.get(key) || 0 };
    });

    res.json({ days });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get weekly xp' });
  }
});

/**
 * Простой детерминированный генератор случайных чисел на основе seed
 */
function seededRandom(seed: number): () => number {
  let value = seed;
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

/**
 * Перемешивает массив детерминированно на основе seed (Fisher-Yates shuffle)
 */
function shuffleArray<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  const random = seededRandom(seed);
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Получает номер текущего раунда на основе даты
 * Раунды начинаются с фиксированной даты (1 января 2024 года) и длятся 30 дней
 */
function getCurrentRoundNumber(): number {
  const roundStartDate = new Date(2024, 0, 1); // 1 января 2024
  const now = new Date();
  const daysSinceStart = Math.floor((now.getTime() - roundStartDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(daysSinceStart / LEAGUE_PERIOD_DAYS);
}

/**
 * Получает дату начала текущего раунда
 */
function getCurrentRoundStartDate(): Date {
  const roundStartDate = new Date(2024, 0, 1); // 1 января 2024
  const now = new Date();
  const daysSinceStart = Math.floor((now.getTime() - roundStartDate.getTime()) / (1000 * 60 * 60 * 24));
  const roundNumber = Math.floor(daysSinceStart / LEAGUE_PERIOD_DAYS);
  const roundStart = new Date(roundStartDate);
  roundStart.setDate(roundStart.getDate() + roundNumber * LEAGUE_PERIOD_DAYS);
  return roundStart;
}

// Get global leaderboard (all users across all spaces)
router.get('/leaderboard/global', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const chunkNumber = parseInt(req.query.page as string) || 1; // page теперь означает номер чанка
    const chunkSize = 50;

    // Получаем всех пользователей, которые имеют хотя бы один Space
    // Для глобального лидерборда берем максимальный totalXp пользователя среди всех его Space
    const allUserStats = await prisma.userSpaceStats.findMany({
      include: { user: true },
      orderBy: { totalXp: 'desc' },
    });

    // Группируем по пользователям и берем СУММУ totalXp по всем пространствам (глобальный XP)
    const userStatsMap = new Map<bigint, { totalXp: number; level: number; userId: bigint; user: any }>();
    
    for (const stat of allUserStats) {
      const existing = userStatsMap.get(stat.userId);
      if (!existing) {
        userStatsMap.set(stat.userId, {
          totalXp: stat.totalXp,
          level: stat.level,
          userId: stat.userId,
          user: stat.user,
        });
        continue;
      }

      existing.totalXp += stat.totalXp;
      // level для глобального отображения сейчас вторичен (UI показывает только XP),
      // но оставим максимальный уровень как ориентир.
      if (stat.level > existing.level) {
        existing.level = stat.level;
      }
    }

    // Преобразуем в массив и сортируем по totalXp
    const allUsers = Array.from(userStatsMap.values()).sort((a, b) => b.totalXp - a.totalXp);
    
    // Получаем номер текущего раунда для детерминированного перемешивания
    const currentRoundNumber = getCurrentRoundNumber();
    
    // Создаем seed на основе номера раунда и количества пользователей
    // Это гарантирует, что каждый раунд пользователи перемешиваются по-разному
    const seed = currentRoundNumber * 1000000 + allUsers.length;
    
    // Перемешиваем пользователей детерминированно на основе seed
    const shuffledUsers = shuffleArray(allUsers, seed);
    
    // Разделяем на чанки по 50 пользователей
    const totalChunks = Math.ceil(shuffledUsers.length / chunkSize);
    
    // Получаем нужный чанк
    const chunkStart = (chunkNumber - 1) * chunkSize;
    const chunkEnd = chunkStart + chunkSize;
    const chunkUsers = shuffledUsers.slice(chunkStart, chunkEnd);

    // Добавляем информацию о лигах для каждого пользователя
    // Для глобального лидерборда используем первую лигу (MVP)
    const leaderboardWithLeagues = chunkUsers.map((userStat, index) => {
      // Для MVP все пользователи в первой лиге
      const currentLeague = 1; // TODO: После миграции использовать реальную лигу
      
      return {
        userId: userStat.userId.toString(),
        username: userStat.user.username,
        firstName: userStat.user.firstName,
        photoUrl: userStat.user.photoUrl,
        level: userStat.level,
        totalXp: userStat.totalXp,
        league: currentLeague,
        leagueName: getLeagueName(currentLeague),
        leaguePosition: chunkStart + index + 1, // Позиция в общем списке
        chunkPosition: index + 1, // Позиция внутри чанка
      };
    });

    // Рассчитываем время до конца раунда (30 дней)
    const roundStartDate = getCurrentRoundStartDate();
    const roundEndDate = new Date(roundStartDate);
    roundEndDate.setDate(roundStartDate.getDate() + LEAGUE_PERIOD_DAYS);
    
    const now = new Date();
    const periodDaysRemaining = Math.ceil((roundEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const periodDaysRemainingClamped = Math.max(0, periodDaysRemaining);

    res.json({
      leaderboard: leaderboardWithLeagues,
      pagination: {
        page: chunkNumber, // Номер чанка
        limit: chunkSize, // Добавляем limit для совместимости
        chunkSize,
        total: shuffledUsers.length,
        totalPages: totalChunks, // Добавляем totalPages для совместимости
        totalChunks,
        hasNextPage: chunkNumber < totalChunks,
        hasPrevPage: chunkNumber > 1,
        currentRound: currentRoundNumber + 1, // Показываем раунд начиная с 1
      },
      periodDays: LEAGUE_PERIOD_DAYS,
      periodDaysRemaining: periodDaysRemainingClamped,
      periodEndDate: roundEndDate.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get global leaderboard' });
  }
});

// Get leaderboard (space-specific)
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId) {
      return res.status(404).json({ error: 'No current space' });
    }

    // Получаем ВСЕХ пользователей пространства, не только с опытом
    // Создаем записи для пользователей, у которых нет статистики
    const allMembers = await prisma.spaceMember.findMany({
      where: { spaceId: authReq.currentSpaceId },
      include: { user: true },
    });

    // Получаем статистику для всех участников
    const statsMap = new Map<bigint, { level: number; totalXp: number }>();
    const existingStats = await prisma.userSpaceStats.findMany({
      where: { spaceId: authReq.currentSpaceId },
    });

    for (const stat of existingStats) {
      statsMap.set(stat.userId, { level: stat.level, totalXp: stat.totalXp });
    }

    // Создаем записи для участников без статистики
    const allStats = allMembers.map((member) => {
      const existing = statsMap.get(member.userId) || { level: 1, totalXp: 0 };
      return {
        userId: member.userId,
        user: member.user,
        level: existing.level,
        totalXp: existing.totalXp,
      };
    });

    // Сортируем по totalXp
    allStats.sort((a, b) => b.totalXp - a.totalXp);

    // Проверяем, кого уже пнули сегодня
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayPokes = await prisma.poke.findMany({
      where: {
        fromUserId: authReq.user!.id,
        spaceId: authReq.currentSpaceId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    const pokedUserIds = new Set(todayPokes.map(p => p.toUserId.toString()));

    // Добавляем информацию о лигах и статусе пинка для каждого пользователя
    const leaderboardWithLeagues = await Promise.all(
      allStats.map(async (s, index) => {
        // TODO: После миграции получать из s.currentLeague
        const currentLeague = await getUserCurrentLeague(authReq.currentSpaceId!, s.userId);
        const leaguePosition = await getUserLeaguePosition(authReq.currentSpaceId!, s.userId, currentLeague);

        return {
          userId: s.userId.toString(),
          username: s.user.username,
          firstName: s.user.firstName,
          photoUrl: s.user.photoUrl,
          level: s.level,
          totalXp: s.totalXp,
          league: currentLeague,
          leagueName: getLeagueName(currentLeague),
          leaguePosition: leaguePosition || index + 1,
          canPoke: s.userId !== authReq.user!.id && !pokedUserIds.has(s.userId.toString()), // Нельзя пнуть самого себя
          isPokedToday: pokedUserIds.has(s.userId.toString()),
        };
      })
    );

    res.json({
      leaderboard: leaderboardWithLeagues,
      periodDays: LEAGUE_PERIOD_DAYS,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Poke user (space leaderboard only)
router.post('/leaderboard/:userId/poke', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId) {
      return res.status(404).json({ error: 'No current space' });
    }

    const toUserId = BigInt(req.params.userId);

    // Нельзя пнуть самого себя
    if (toUserId === authReq.user!.id) {
      return res.status(400).json({ error: 'Cannot poke yourself' });
    }

    // Проверяем, что целевой пользователь является участником того же пространства
    const toUserMember = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: authReq.currentSpaceId,
          userId: toUserId,
        },
      },
      include: { user: true },
    });

    if (!toUserMember) {
      return res.status(404).json({ error: 'User not found in this space' });
    }

    // Проверяем, не пнули ли мы этого пользователя сегодня
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existingPoke = await prisma.poke.findFirst({
      where: {
        fromUserId: authReq.user!.id,
        toUserId: toUserId,
        spaceId: authReq.currentSpaceId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (existingPoke) {
      return res.status(400).json({ error: 'Already poked this user today' });
    }

    // Создаем запись о пинке
    await prisma.poke.create({
      data: {
        fromUserId: authReq.user!.id,
        toUserId: toUserId,
        spaceId: authReq.currentSpaceId,
      },
    });

    const pokeResult = await sendPokeNotification({
      fromUserId: authReq.user!.id,
      toUserId,
      toTgId: toUserMember.user.tgId,
    });

    if (pokeResult.reason === 'disabled') {
      return res.status(403).json({ error: 'User has disabled poke notifications' });
    }

    res.json({
      success: true,
      message: 'Poke sent successfully',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to poke user' });
  }
});

export { router as statsRouter };
