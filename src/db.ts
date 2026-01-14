import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

prisma.$on('error' as never, (e: any) => {
  logger.error(e, 'Prisma error');
});

prisma.$on('warn' as never, (e: any) => {
  logger.warn(e, 'Prisma warn');
});