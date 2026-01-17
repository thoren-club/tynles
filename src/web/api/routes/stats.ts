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
      });
    }

    res.json({
      level: stats.level,
      totalXp: stats.totalXp,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.currentSpaceId) {
      return res.status(404).json({ error: 'No current space' });
    }

    const stats = await prisma.userSpaceStats.findMany({
      where: { spaceId: authReq.currentSpaceId },
      include: { user: true },
      orderBy: { totalXp: 'desc' },
      take: 50, // Берем больше для лиг (нужно до 50 позиций)
    });

    // Добавляем информацию о лигах для каждого пользователя
    const leaderboardWithLeagues = await Promise.all(
      stats.map(async (s, index) => {
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
