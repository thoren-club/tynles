import { prisma } from '../db';
import { calculateLevel, XP_PER_LEVEL } from '../types';

export async function addXp(spaceId: bigint, userId: bigint, xp: number) {
  const existing = await prisma.userSpaceStats.findUnique({
    where: {
      spaceId_userId: {
        spaceId,
        userId,
      },
    },
  });

  const oldLevel = existing?.level || 1;
  const oldTotalXp = existing?.totalXp || 0;
  const newTotalXp = oldTotalXp + xp;
  const newLevel = calculateLevel(newTotalXp);

  await prisma.userSpaceStats.upsert({
    where: {
      spaceId_userId: {
        spaceId,
        userId,
      },
    },
    create: {
      spaceId,
      userId,
      totalXp: newTotalXp,
      level: newLevel,
    },
    update: {
      totalXp: newTotalXp,
      level: newLevel,
    },
  });

  return {
    oldLevel,
    newLevel,
    newTotalXp,
    levelUp: newLevel > oldLevel,
  };
}

export function getXpProgress(totalXp: number): { current: number; next: number; progress: number } {
  const currentLevel = calculateLevel(totalXp);
  const xpInCurrentLevel = totalXp % XP_PER_LEVEL;
  const xpForNextLevel = XP_PER_LEVEL - xpInCurrentLevel;
  const progress = (xpInCurrentLevel / XP_PER_LEVEL) * 100;

  return {
    current: xpInCurrentLevel,
    next: xpForNextLevel,
    progress: Math.round(progress),
  };
}