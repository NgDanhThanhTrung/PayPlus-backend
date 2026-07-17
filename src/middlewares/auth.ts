import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import User from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: {
        telegramId: number;
        username?: string;
        firstName?: string;
        lastName?: string;
        photoUrl?: string;
      };
    }
  }
}

export const validateTelegramInitData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const initData = req.headers['x-telegram-init-data'] as string;

    if (!initData) {
      res.status(401).json({ error: 'Missing initData' });
      return;
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    // Parse initData
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    // Create data check string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Calculate HMAC-SHA256
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const signature = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (signature !== hash) {
      res.status(401).json({ error: 'Invalid initData signature' });
      return;
    }

    // Extract user data
    const userStr = urlParams.get('user');
    if (!userStr) {
      res.status(401).json({ error: 'Missing user data' });
      return;
    }

    const userData = JSON.parse(decodeURIComponent(userStr));
    const telegramId = userData.id;

    if (!telegramId) {
      res.status(401).json({ error: 'Invalid user data' });
      return;
    }

    // Attach user to request
    req.user = {
      telegramId,
      username: userData.username,
      firstName: userData.first_name,
      lastName: userData.last_name,
      photoUrl: userData.photo_url,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};
