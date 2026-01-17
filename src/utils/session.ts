// Simple in-memory session storage for MVP
// In production, use a proper session storage (Redis, database, etc.)

const currentSpaces = new Map<number, bigint>(); // userId -> spaceId

export function setCurrentSpace(userId: bigint, spaceId: bigint | undefined) {
  if (spaceId === undefined) {
    currentSpaces.delete(Number(userId));
  } else {
    currentSpaces.set(Number(userId), spaceId);
  }
}

export function getCurrentSpace(userId: bigint): bigint | undefined {
  return currentSpaces.get(Number(userId));
}