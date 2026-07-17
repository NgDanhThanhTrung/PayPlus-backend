import { Request, Response } from 'express';
import User from '../models/User';
import AdView from '../models/AdView';
import Referral from '../models/Referral';

const DAILY_AD_LIMIT = 15;
const BASE_REWARD = 100;
const REFERRAL_BONUS = 50;

export const watchAd = async (req: Request, res: Response): Promise<void> => {
  try {
    const { telegramId } = req.user!;

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAds = await AdView.countDocuments({
      telegramId,
      createdAt: { $gte: today },
    });

    if (todayAds >= DAILY_AD_LIMIT) {
      res.json({ success: false, error: 'Daily limit reached' });
      return;
    }

    // Calculate reward
    let reward = BASE_REWARD;

    // Check referral bonus
    const referral = await Referral.findOne({ inviteeId: telegramId });
    if (referral && referral.status === 'active') {
      reward += REFERRAL_BONUS;
      referral.adCount += 1;
      await referral.save();
    }

    // Create ad view record
    await AdView.create({
      telegramId,
      reward,
    });

    // Update user balance
    await User.findOneAndUpdate(
      { telegramId },
      {
        $inc: {
          balance: reward,
          totalEarned: reward,
          totalAdsWatched: 1,
        },
      }
    );

    // Get updated user
    const user = await User.findOne({ telegramId });

    res.json({
      success: true,
      reward,
      remainingAds: DAILY_AD_LIMIT - (todayAds + 1),
      user: {
        balance: user?.balance,
        totalEarned: user?.totalEarned,
        totalAdsWatched: user?.totalAdsWatched,
      },
    });
  } catch (error) {
    console.error('Ads controller error:', error);
    res.status(500).json({ error: 'Ad watching failed' });
  }
};

export const getAdStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { telegramId } = req.user!;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAds = await AdView.countDocuments({
      telegramId,
      createdAt: { $gte: today },
    });

    const referral = await Referral.findOne({ inviteeId: telegramId });

    res.json({
      success: true,
      remainingAds: DAILY_AD_LIMIT - todayAds,
      referralBonus: referral?.status === 'active' ? REFERRAL_BONUS : 0,
    });
  } catch (error) {
    console.error('Ad status controller error:', error);
    res.status(500).json({ error: 'Failed to get ad status' });
  }
};
