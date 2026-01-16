import dotenv from 'dotenv';
dotenv.config();

export const config = {
  botToken: process.env.BOT_TOKEN || '',
  databaseUrl: process.env.DATABASE_URL || '',
  logLevel: process.env.LOG_LEVEL || 'info',
  webAppUrl: process.env.WEB_APP_URL || 'https://your-domain.com',
};

if (!config.botToken) {
  throw new Error('BOT_TOKEN is required');
}

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}