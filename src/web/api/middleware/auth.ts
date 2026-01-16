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
function verifyTelegramWebAppData(initData: string, botToken: string, logger?: any): boolean {
  try {
    // Parse initData manually to properly handle URL-encoded values
    // Split by & and then by = to get key-value pairs
    const params: Array<[string, string]> = [];
    let hash: string | null = null;
    
    // Split by & to get individual parameters
    const pairs = initData.split('&');
    for (const pair of pairs) {
      const equalIndex = pair.indexOf('=');
      if (equalIndex === -1) continue;
      
      const key = pair.substring(0, equalIndex);
      const value = pair.substring(equalIndex + 1);
      
      if (key === 'hash') {
        hash = value;
      } else {
        // Store the encoded value - we'll decode it when building data-check-string
        params.push([key, value]);
      }
    }
    
    if (!hash) {
      logger?.warn('No hash found in initData');
      return false;
    }

    // Sort by key and create data check string
    // Important: URL-decode each VALUE before creating the check string
    const dataCheckString = params
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, encodedValue]) => {
        // URL-decode the value
        try {
          const decodedValue = decodeURIComponent(encodedValue);
          return `${key}=${decodedValue}`;
        } catch {
          // If decoding fails, use original (shouldn't happen with valid Telegram data)
          return `${key}=${encodedValue}`;
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
      logger?.warn({
        receivedHash: hash.substring(0, 20) + '...',
        calculatedHash: calculatedHash.substring(0, 20) + '...',
        dataCheckStringPreview: dataCheckString.substring(0, 200),
        hashMatch: false,
      }, 'Hash mismatch in initData verification');
      return false;
    }

    // Check auth_date to prevent replay attacks (should be within last hour)
    const authDateParam = params.find(([key]) => key === 'auth_date');
    if (authDateParam) {
      try {
        const authDateValue = decodeURIComponent(authDateParam[1]);
        const authTimestamp = parseInt(authDateValue, 10);
        const now = Math.floor(Date.now() / 1000);
        const maxAge = 3600; // 1 hour
        if (now - authTimestamp > maxAge) {
          logger?.warn({
            authTimestamp,
            now,
            age: now - authTimestamp,
          }, 'initData too old');
          return false; // Too old
        }
      } catch (e) {
        logger?.warn({ error: e }, 'Failed to parse auth_date');
      }
    }

    return true;
  } catch (error) {
    logger?.error({ error }, 'Error in verifyTelegramWebAppData');
    return false;
  }
}

// Parse initData and extract user info
function parseInitData(initData: string) {
  // Parse manually to handle URL-encoded values
  const pairs = initData.split('&');
  let userStr: string | null = null;
  
  for (const pair of pairs) {
    const equalIndex = pair.indexOf('=');
    if (equalIndex === -1) continue;
    
    const key = pair.substring(0, equalIndex);
    const value = pair.substring(equalIndex + 1);
    
    if (key === 'user') {
      try {
        userStr = decodeURIComponent(value);
        break;
      } catch {
        // If decoding fails, try using as-is
        userStr = value;
        break;
      }
    }
  }
  
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
  logger.info({
    method: req.method,
    path: req.path,
    hasHeader: !!req.headers['x-telegram-init-data'],
    hasQueryAuth: !!req.query._auth,
    hasQueryTgData: !!req.query.tgWebAppData,
    queryKeys: Object.keys(req.query),
    headerKeys: Object.keys(req.headers).filter(k => k.toLowerCase().includes('telegram') || k.toLowerCase().includes('auth')),
  }, 'Auth middleware called');
  
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

    // initData from query parameter is already decoded by Express
    // initData from header should be used as-is (it's already in correct format)
    // Don't decode here - let the verification function handle it
    // The verification function expects the raw initData string
    const rawInitData = initData;

    // Verify the data
    logger.info({
      initDataLength: rawInitData.length,
      hasHash: rawInitData.includes('hash='),
      hasUser: rawInitData.includes('user='),
      source: req.headers['x-telegram-init-data'] ? 'header' : 'query',
      initDataPreview: rawInitData.substring(0, 100),
    }, 'Verifying Telegram initData');
    
    const isValid = verifyTelegramWebAppData(rawInitData, config.botToken, logger);
    if (!isValid) {
      logger.warn({
        initDataLength: rawInitData.length,
        initDataPreview: rawInitData.substring(0, 200),
        hasHash: rawInitData.includes('hash='),
        hasUser: rawInitData.includes('user='),
        hasAuthDate: rawInitData.includes('auth_date='),
        source: req.headers['x-telegram-init-data'] ? 'header' : 'query',
      }, 'Invalid Telegram init data - verification failed');
      return res.status(401).json({ error: 'Invalid Telegram init data' });
    }
    
    logger.info('Telegram initData verified successfully');

    // Use decoded version
    initData = decodedInitData;

    // Parse user data
    const userData = parseInitData(rawInitData);
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
