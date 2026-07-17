import { Request, Response } from 'express';
import User from '../models/User';
import AdView from '../models/AdView';
import Referral from '../models/Referral';

const DAILY_AD_LIMIT = 15;
const BASE_REWARD = 100;
const REFERRAL_BONUS = 50;

// ==========================================
// ADSGRAM WEBHOOK RECEIVER
// ==========================================
export const handleAdsgramWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userid } = req.query;

    if (!userid) {
      res.status(400).send('Missing userid');
      return;
    }

    const telegramId = Number(userid);
    if (isNaN(telegramId)) {
      res.status(400).send('Invalid userid');
      return;
    }

    // 1. Kiểm tra sự tồn tại của User
    const userExists = await User.exists({ telegramId });
    if (!userExists) {
      res.status(404).send('User not found');
      return;
    }

    // 2. Kiểm tra giới hạn quảng cáo trong ngày
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAds = await AdView.countDocuments({
      telegramId,
      createdAt: { $gte: today },
    });

    if (todayAds >= DAILY_AD_LIMIT) {
      res.status(200).send('Daily limit reached'); // Vẫn phản hồi 200 để Adsgram không thử lại liên tục
      return;
    }

    // 3. Tính toán phần thưởng
    let reward = BASE_REWARD;

    // 4. Xử lý cộng thưởng thêm từ Referral
    const referral = await Referral.findOne({ inviteeId: telegramId });
    if (referral && referral.status === 'active') {
      reward += REFERRAL_BONUS;
      referral.adCount += 1;
      await referral.save();
    }

    // 5. Tạo bản ghi lịch sử xem quảng cáo
    await AdView.create({
      telegramId,
      reward,
    });

    // 6. Cập nhật số dư tài khoản của User
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

    console.log(`[Adsgram Webhook] Successfully processed reward ${reward} Gold for user ${telegramId}`);
    
    // Phản hồi chuỗi "OK" theo tiêu chuẩn của Adsgram
    res.status(200).send('OK');
  } catch (error) {
    console.error('Adsgram webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
};

// ==========================================
// CLIENT APP ENDPOINTS
// ==========================================
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
