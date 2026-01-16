import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../db';
import crypto from 'crypto';

export interface AuthRequest extends Request {
  user?: {
    id: bigint;
    tgId: bigint;
    username?: string | null;
    firstName?: string | null;
    language?: string;
  };
  currentSpaceId?: bigint;
}

// Verify Telegram WebApp initData
function verifyTelegramWebAppData(initData: string, botToken: string): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    // Sort and create data check string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return calculatedHash === hash;
  } catch (error) {
    return false;
  }
}

// Parse initData and extract user info
function parseInitData(initData: string) {
  const urlParams = new URLSearchParams(initData);
  const userStr = urlParams.get('user');
  if (!userStr) return null;

  try {
    const user = JSON.parse(userStr);
    return {
      id: BigInt(user.id),
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      languageCode: user.language_code,
    };
  } catch {
    return null;
  }
}

import { config } from '../../../config';
import { logger } from '../../../logger';

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Try to get initData from header first (for API calls), then from query (for direct web access)
    let initData = (req.headers['x-telegram-init-data'] as string) || 
                   (req.query._auth as string) ||
                   (req.query.tgWebAppData as string);

    // Also check in request body (some clients send it there)
    if (!initData && req.body && typeof req.body === 'object') {
      initData = req.body.initData || req.body.tgWebAppData;
    }

    if (!initData || initData === '') {
      logger.warn({
        headers: Object.keys(req.headers),
        query: Object.keys(req.query),
      }, 'Missing Telegram init data');
      return res.status(401).json({ error: 'Missing Telegram init data' });
    }

    // Verify the data
    if (!verifyTelegramWebAppData(initData, config.botToken)) {
      return res.status(401).json({ error: 'Invalid Telegram init data' });
    }

    // Parse user data
    const userData = parseInitData(initData);
    if (!userData) {
      return res.status(401).json({ error: 'Invalid user data' });
    }

    // Get or create user
    let user = await prisma.telegramUser.findUnique({
      where: { tgId: userData.id },
    });

    if (!user) {
      user = await prisma.telegramUser.create({
        data: {
          tgId: userData.id,
          username: userData.username || null,
          firstName: userData.firstName || null,
          language: userData.languageCode?.split('-')[0] || 'en',
        },
      });
    } else {
      // Update user info
      user = await prisma.telegramUser.update({
        where: { id: user.id },
        data: {
          username: userData.username || null,
          firstName: userData.firstName || null,
        },
      });
    }

    req.user = {
      id: user.id,
      tgId: user.tgId,
      username: user.username,
      firstName: user.firstName,
      language: user.language,
    };

    // Get current space from session or first space
    const spaceMember = await prisma.spaceMember.findFirst({
      where: { userId: user.id },
      orderBy: { joinedAt: 'asc' },
    });

    if (spaceMember) {
      req.currentSpaceId = spaceMember.spaceId;
    }

    next();
  } catch (error) {
    logger.error(error, 'Auth middleware error');
    res.status(500).json({ error: 'Authentication failed' });
  }
}
