import { prisma } from '../db';
import { getXpForNextLevel } from '../types';

const MAX_LEVEL = 80;

export async function getLevelRequirementsForSpace(spaceId: bigint): Promise<Map<number, number>> {
  const requirements = await prisma.levelRequirement.findMany({
    where: { spaceId },
  });
  const map = new Map<number, number>();
  for (const req of requirements) {
    map.set(req.level, req.xpRequired);
  }
  return map;
}

export function getXpForNextLevelFromMap(level: number, map: Map<number, number>): number {
  if (level >= MAX_LEVEL) return 0;
  return map.get(level) ?? getXpForNextLevel(level);
}

export function getTotalXpForLevelFromMap(targetLevel: number, map: Map<number, number>): number {
  if (targetLevel <= 1) return 0;
  let totalXp = 0;
  for (let level = 1; level < targetLevel; level++) {
    totalXp += getXpForNextLevelFromMap(level, map);
  }
  return totalXp;
}

export function calculateLevelFromMap(totalXp: number, map: Map<number, number>): number {
  if (totalXp <= 0) return 1;
  let level = 1;
  let xpRequired = getXpForNextLevelFromMap(level, map);
  let currentXp = totalXp;

  while (currentXp >= xpRequired && level < MAX_LEVEL) {
    currentXp -= xpRequired;
    level++;
    xpRequired = getXpForNextLevelFromMap(level, map);
  }

  return Math.min(level, MAX_LEVEL);
}

export async function calculateLevelForSpace(spaceId: bigint, totalXp: number): Promise<number> {
  const map = await getLevelRequirementsForSpace(spaceId);
  return calculateLevelFromMap(totalXp, map);
}

export async function getTotalXpForLevelForSpace(spaceId: bigint, targetLevel: number): Promise<number> {
  const map = await getLevelRequirementsForSpace(spaceId);
  return getTotalXpForLevelFromMap(targetLevel, map);
}

export async function getXpForNextLevelForSpace(spaceId: bigint, level: number): Promise<number> {
  const map = await getLevelRequirementsForSpace(spaceId);
  return getXpForNextLevelFromMap(level, map);
}

export async function getXpProgressForSpace(spaceId: bigint, totalXp: number): Promise<{ current: number; next: number; progress: number }> {
  const map = await getLevelRequirementsForSpace(spaceId);
  const currentLevel = calculateLevelFromMap(totalXp, map);
  const totalXpForCurrentLevel = getTotalXpForLevelFromMap(currentLevel, map);
  const xpInCurrentLevel = totalXp - totalXpForCurrentLevel;
  const xpForNextLevel = getXpForNextLevelFromMap(currentLevel, map);
  const progress = xpForNextLevel > 0 ? (xpInCurrentLevel / xpForNextLevel) * 100 : 100;

  return {
    current: Math.max(0, xpInCurrentLevel),
    next: xpForNextLevel,
    progress: Math.max(0, Math.min(100, Math.round(progress))),
  };
}
