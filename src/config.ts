import dotenv from 'dotenv';
dotenv.config();

export const config = {
  botToken: process.env.BOT_TOKEN || '',
  databaseUrl: process.env.DATABASE_URL || '',
  logLevel: process.env.LOG_LEVEL || 'info',
};

if (!config.botToken) {
  throw new Error('BOT_TOKEN is required');
}

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}