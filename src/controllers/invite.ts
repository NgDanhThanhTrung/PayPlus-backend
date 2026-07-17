import { Request, Response } from 'express';
import Referral from '../models/Referral';
import User from '../models/User';

export const getReferralInfo = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { telegramId } = req.user!;

    // Get referral count
    const referrals = await Referral.find({ inviterId: telegramId });
    const activeReferrals = referrals.filter((r) => r.status === 'active');

    // Calculate total earnings from referrals
    let totalReferralEarnings = 0;
    for (const referral of activeReferrals) {
      totalReferralEarnings += referral.adCount * 50; // 50 Gold per ad
    }

    res.json({
      success: true,
      referralCount: referrals.length,
      activeReferralCount: activeReferrals.length,
      totalReferralEarnings,
      referralCode: telegramId.toString(),
    });
  } catch (error) {
    console.error('Get referral info controller error:', error);
    res.status(500).json({ error: 'Failed to fetch referral info' });
  }
};

export const getReferrals = async (req: Request, res: Response): Promise<void> => {
  try {
    const { telegramId } = req.user!;

    const referrals = await Referral.find({ inviterId: telegramId })
      .populate('inviteeId')
      .sort({ createdAt: -1 });

    const referralDetails = await Promise.all(
      referrals.map(async (referral) => {
        const invitee = await User.findOne({ telegramId: referral.inviteeId });
        return {
          inviteeId: referral.inviteeId,
          username: invitee?.username,
          firstName: invitee?.firstName,
          status: referral.status,
          adCount: referral.adCount,
          createdAt: referral.createdAt,
        };
      })
    );

    res.json({ success: true, referrals: referralDetails });
  } catch (error) {
    console.error('Get referrals controller error:', error);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
};
