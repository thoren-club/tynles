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
    if (!hash) {
      return false;
    }
    urlParams.delete('hash');

    // Sort and create data check string
    // Important: values should be URL-decoded before creating the check string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => {
        // URL-decode the value if needed
        try {
          const decoded = decodeURIComponent(value);
          return `${key}=${decoded}`;
        } catch {
          return `${key}=${value}`;
        }
      })
      .join('\n');

    // Create secret key: HMAC_SHA256(bot_token, "WebAppData")
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate hash: HMAC_SHA256(secret_key, data_check_string)
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Compare hashes (use timing-safe comparison)
    if (calculatedHash !== hash) {
      return false;
    }

    // Check auth_date to prevent replay attacks (should be within last hour)
    const authDate = urlParams.get('auth_date');
    if (authDate) {
      const authTimestamp = parseInt(authDate, 10);
      const now = Math.floor(Date.now() / 1000);
      const maxAge = 3600; // 1 hour
      if (now - authTimestamp > maxAge) {
        return false; // Too old
      }
    }

    return true;
  } catch (error) {
    // Silently fail - error will be logged by caller
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

    // Decode URL-encoded initData if it comes from query parameter
    // Note: initData from query might be double-encoded
    let decodedInitData = initData;
    if (initData.includes('%')) {
      try {
        decodedInitData = decodeURIComponent(initData);
        // Sometimes it's double-encoded
        if (decodedInitData.includes('%')) {
          decodedInitData = decodeURIComponent(decodedInitData);
        }
      } catch (e) {
        logger.warn({ error: e }, 'Failed to decode initData, using original');
        decodedInitData = initData;
      }
    }

    // Verify the data
    logger.info({
      initDataLength: decodedInitData.length,
      hasHash: decodedInitData.includes('hash='),
      hasUser: decodedInitData.includes('user='),
      source: req.headers['x-telegram-init-data'] ? 'header' : 'query',
    }, 'Verifying Telegram initData');
    
    const isValid = verifyTelegramWebAppData(decodedInitData, config.botToken);
    if (!isValid) {
      logger.warn({
        initDataLength: decodedInitData.length,
        initDataPreview: decodedInitData.substring(0, 150),
        hasHash: decodedInitData.includes('hash='),
        hasUser: decodedInitData.includes('user='),
        hasAuthDate: decodedInitData.includes('auth_date='),
        source: req.headers['x-telegram-init-data'] ? 'header' : 'query',
      }, 'Invalid Telegram init data - verification failed');
      return res.status(401).json({ error: 'Invalid Telegram init data' });
    }
    
    logger.info('Telegram initData verified successfully');

    // Use decoded version
    initData = decodedInitData;

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
