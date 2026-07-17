import { Request, Response } from 'express';

export const getConfig = (req: Request, res: Response): void => {
  try {
    const config = {
      adsgramBlockId: process.env.ADSGRAM_BLOCK_ID || '0',
      supportTelegramLink: process.env.SUPPORT_TELEGRAM_LINK || '',
      telegramChannelUsername: process.env.TELEGRAM_CHANNEL_USERNAME || '',
    };

    res.json(config);
  } catch (error) {
    console.error('Config controller error:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
};
