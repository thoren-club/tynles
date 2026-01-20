import { prisma } from '../db';
import { getXpProgressForSpace, calculateLevelForSpace } from './leveling';

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
  const newLevel = await calculateLevelForSpace(spaceId, newTotalXp);

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

export async function getXpProgress(spaceId: bigint, totalXp: number): Promise<{ current: number; next: number; progress: number }> {
  return getXpProgressForSpace(spaceId, totalXp);
}

export function getProgressBar(progress: number, length: number = 10): string {
  const filled = Math.round((progress / 100) * length);
  return '▓'.repeat(filled) + '░'.repeat(length - filled);
}