import { prisma } from '../db';
import { addXp } from '../utils/xp';
import { notifyUser } from './user-notifications';
import { TelegramTransport } from './telegram-transport';

const HOURS = 60 * 60 * 1000;

export type EngagementRunResult = {
  nudgesSent: number;
  begsSent: number;
  successSent: number;
  rewardsSent: number;
};

export async function sendEngagementNotifications(
  transport: TelegramTransport,
): Promise<EngagementRunResult> {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * HOURS);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * HOURS);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * HOURS);
  const last24h = new Date(now.getTime() - 24 * HOURS);

  const settings = await prisma.userNotificationSettings.findMany();
  const settingsByUser = new Map(settings.map((s) => [s.userId, s]));

  const lastCompletions = await prisma.taskCompletion.groupBy({
    by: ['spaceId', 'userId'],
    _max: { completedAt: true },
  });
  const lastCompletionMap = new Map(
    lastCompletions.map((row) => [`${row.spaceId}-${row.userId}`, row._max.completedAt]),
  );

  const recentCounts = await prisma.taskCompletion.groupBy({
    by: ['spaceId', 'userId'],
    where: { completedAt: { gte: last24h } },
    _count: { _all: true },
  });
  const recentCountMap = new Map(
    recentCounts.map((row) => [`${row.spaceId}-${row.userId}`, row._count._all]),
  );

  const states = await prisma.userEngagementState.findMany();
  const stateMap = new Map(states.map((s) => [`${s.spaceId}-${s.userId}`, s]));

  const stats = await prisma.userSpaceStats.findMany();

  let nudgesSent = 0;
  let begsSent = 0;
  let successSent = 0;
  let rewardsSent = 0;

  for (const stat of stats) {
    const key = `${stat.spaceId}-${stat.userId}`;
    const lastCompletion = lastCompletionMap.get(key) || stat.updatedAt;
    const userSettings = settingsByUser.get(stat.userId);
    if (userSettings && !userSettings.taskRemindersEnabled) {
      continue;
    }

    const state = stateMap.get(key);

    const canSend = (lastSent: Date | null | undefined, cooldownDays: number) => {
      if (!lastSent) return true;
      return now.getTime() - lastSent.getTime() > cooldownDays * 24 * HOURS;
    };

    if (lastCompletion <= fourteenDaysAgo) {
      if (canSend(state?.lastSuccessAt, 7)) {
        await notifyUser(transport, {
          userId: stat.userId,
          message: '🚀 Напоминание: регулярные задачи формируют успех. Начни с одной сегодня!',
        });
        await prisma.userEngagementState.upsert({
          where: { spaceId_userId: { spaceId: stat.spaceId, userId: stat.userId } },
          create: { spaceId: stat.spaceId, userId: stat.userId, lastSuccessAt: now },
          update: { lastSuccessAt: now },
        });
        successSent++;
      }
      continue;
    }

    if (lastCompletion <= sevenDaysAgo) {
      if (canSend(state?.lastBegAt, 3)) {
        await notifyUser(transport, {
          userId: stat.userId,
          message: '🥺 Очень скучаю по твоим задачам. Давай сделаем хотя бы одну?',
        });
        await prisma.userEngagementState.upsert({
          where: { spaceId_userId: { spaceId: stat.spaceId, userId: stat.userId } },
          create: { spaceId: stat.spaceId, userId: stat.userId, lastBegAt: now },
          update: { lastBegAt: now },
        });
        begsSent++;
      }
      continue;
    }

    if (lastCompletion <= threeDaysAgo) {
      if (canSend(state?.lastInactiveAt, 1)) {
        await notifyUser(transport, {
          userId: stat.userId,
          message: '⏰ Ты давно не делал задачи. Маленький шаг сегодня — и прогресс вернётся.',
        });
        await prisma.userEngagementState.upsert({
          where: { spaceId_userId: { spaceId: stat.spaceId, userId: stat.userId } },
          create: { spaceId: stat.spaceId, userId: stat.userId, lastInactiveAt: now },
          update: { lastInactiveAt: now },
        });
        nudgesSent++;
      }
    }
  }

  for (const stat of stats) {
    const key = `${stat.spaceId}-${stat.userId}`;
    const count = recentCountMap.get(key) || 0;
    if (count < 5) continue;
    const userSettings = settingsByUser.get(stat.userId);
    if (userSettings && !userSettings.taskRemindersEnabled) {
      continue;
    }

    const state = stateMap.get(key);
    const lastReward = state?.lastRewardAt;
    if (lastReward && now.getTime() - lastReward.getTime() < 24 * HOURS) {
      continue;
    }

    const rewardXp = 5;
    const result = await addXp(stat.spaceId, stat.userId, rewardXp);
    await notifyUser(transport, {
      userId: stat.userId,
      message: `🔥 Ты очень активно выполняешь задачи! +${rewardXp} XP в награду.`,
    });
    if (result.levelUp) {
      await notifyUser(transport, {
        userId: stat.userId,
        message: `🎉 Поздравляем! Ты достиг уровня ${result.newLevel}.`,
      });
    }

    await prisma.userEngagementState.upsert({
      where: { spaceId_userId: { spaceId: stat.spaceId, userId: stat.userId } },
      create: { spaceId: stat.spaceId, userId: stat.userId, lastRewardAt: now },
      update: { lastRewardAt: now },
    });
    rewardsSent++;
  }

  return { nudgesSent, begsSent, successSent, rewardsSent };
}
