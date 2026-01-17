import { prisma } from '../db';
import { calculateLevel, getXpForNextLevel } from '../types';

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
  const xpForCurrentLevel = getXpForNextLevel(currentLevel - 1); // Опыт, нужный для текущего уровня
  const totalXpForCurrentLevel = currentLevel > 1 
    ? Array.from({ length: currentLevel - 1 }, (_, i) => getXpForNextLevel(i + 1)).reduce((a, b) => a + b, 0)
    : 0;
  const xpInCurrentLevel = totalXp - totalXpForCurrentLevel;
  const xpForNextLevel = getXpForNextLevel(currentLevel);
  const progress = (xpInCurrentLevel / xpForNextLevel) * 100;

  return {
    current: Math.max(0, xpInCurrentLevel),
    next: xpForNextLevel,
    progress: Math.max(0, Math.min(100, Math.round(progress))),
  };
}

export function getProgressBar(progress: number, length: number = 10): string {
  const filled = Math.round((progress / 100) * length);
  return '▓'.repeat(filled) + '░'.repeat(length - filled);
}