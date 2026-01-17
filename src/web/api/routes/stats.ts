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
import { getXpForNextLevel, getTotalXpForLevel } from '../../../types';

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
        xpToNextLevel: getXpForNextLevel(1),
      });
    }

    const level = stats.level;
    const totalXp = stats.totalXp;
    const totalXpForCurrentLevel = getTotalXpForLevel(level);
    const currentLevelXp = totalXp - totalXpForCurrentLevel;
    const xpToNextLevel = getXpForNextLevel(level);

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

// Get global leaderboard (all users across all spaces)
router.get('/leaderboard/global', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    // Получаем всех пользователей, которые имеют хотя бы один Space
    // Для глобального лидерборда берем максимальный totalXp пользователя среди всех его Space
    const allUserStats = await prisma.userSpaceStats.findMany({
      include: { user: true },
      orderBy: { totalXp: 'desc' },
    });

    // Группируем по пользователям и берем максимальный totalXp
    const userStatsMap = new Map<bigint, { totalXp: number; level: number; userId: bigint; user: any }>();
    
    for (const stat of allUserStats) {
      const existing = userStatsMap.get(stat.userId);
      if (!existing || stat.totalXp > existing.totalXp) {
        userStatsMap.set(stat.userId, {
          totalXp: stat.totalXp,
          level: stat.level,
          userId: stat.userId,
          user: stat.user,
        });
      }
    }

    // Преобразуем в массив и сортируем по totalXp
    const allUsers = Array.from(userStatsMap.values()).sort((a, b) => b.totalXp - a.totalXp);
    
    // Применяем пагинацию
    const paginatedUsers = allUsers.slice(offset, offset + limit);
    const totalUsers = allUsers.length;
    const totalPages = Math.ceil(totalUsers / limit);

    // Добавляем информацию о лигах для каждого пользователя
    // Для глобального лидерборда используем первую лигу (MVP)
    const leaderboardWithLeagues = paginatedUsers.map((userStat, index) => {
      // Для MVP все пользователи в первой лиге
      const currentLeague = 1; // TODO: После миграции использовать реальную лигу
      
      return {
        userId: userStat.userId.toString(),
        username: userStat.user.username,
        firstName: userStat.user.firstName,
        level: userStat.level,
        totalXp: userStat.totalXp,
        league: currentLeague,
        leagueName: getLeagueName(currentLeague),
        leaguePosition: offset + index + 1,
      };
    });

    // Рассчитываем время до конца раунда (30 дней)
    // Для MVP используем фиксированную дату начала раунда (1 января текущего года)
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const daysSinceStart = Math.floor((now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
    const periodDaysElapsed = daysSinceStart % LEAGUE_PERIOD_DAYS;
    const periodDaysRemaining = LEAGUE_PERIOD_DAYS - periodDaysElapsed;
    
    // Дата окончания текущего раунда
    const periodEndDate = new Date(yearStart);
    periodEndDate.setDate(yearStart.getDate() + Math.floor(daysSinceStart / LEAGUE_PERIOD_DAYS) * LEAGUE_PERIOD_DAYS + LEAGUE_PERIOD_DAYS);

    res.json({
      leaderboard: leaderboardWithLeagues,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      periodDays: LEAGUE_PERIOD_DAYS,
      periodDaysRemaining,
      periodEndDate: periodEndDate.toISOString(),
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

    // Добавляем информацию о лигах для каждого пользователя
    const leaderboardWithLeagues = await Promise.all(
      allStats.map(async (s, index) => {
        // TODO: После миграции получать из s.currentLeague
        const currentLeague = await getUserCurrentLeague(authReq.currentSpaceId!, s.userId);
        const leaguePosition = await getUserLeaguePosition(authReq.currentSpaceId!, s.userId, currentLeague);

        return {
          userId: s.userId.toString(),
          username: s.user.username,
          firstName: s.user.firstName,
          level: s.level,
          totalXp: s.totalXp,
          league: currentLeague,
          leagueName: getLeagueName(currentLeague),
          leaguePosition: leaguePosition || index + 1,
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

export { router as statsRouter };
