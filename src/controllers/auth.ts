import { Request, Response } from 'express';
import User from '../models/User';
import Referral from '../models/Referral';

export const authenticate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { telegramId, username, firstName, lastName, photoUrl } = req.user!;

    // Find or create user
    let user = await User.findOne({ telegramId });

    if (!user) {
      user = await User.create({
        telegramId,
        username,
        firstName,
        lastName,
        photoUrl,
        balance: 0,
        totalEarned: 0,
        totalAdsWatched: 0,
      });
    } else {
      // Update user info if changed
      if (username !== user.username) user.username = username;
      if (firstName !== user.firstName) user.firstName = firstName;
      if (lastName !== user.lastName) user.lastName = lastName;
      if (photoUrl !== user.photoUrl) user.photoUrl = photoUrl;
      await user.save();
    }

    res.json({
      success: true,
      user: {
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        photoUrl: user.photoUrl,
        balance: user.balance,
        totalEarned: user.totalEarned,
        totalAdsWatched: user.totalAdsWatched,
      },
    });
  } catch (error) {
    console.error('Auth controller error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const processReferral = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { telegramId } = req.user!;
    const { inviterId } = req.body;

    if (!inviterId || inviterId === telegramId) {
      res.json({ success: false, error: 'Invalid referral' });
      return;
    }

    // Check if referral already exists
    const existingReferral = await Referral.findOne({ inviteeId: telegramId });
    if (existingReferral) {
      res.json({ success: false, error: 'Already referred' });
      return;
    }

    // Create referral
    await Referral.create({
      inviterId: Number(inviterId),
      inviteeId: telegramId,
      status: 'pending',
      adCount: 0,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Referral controller error:', error);
    res.status(500).json({ error: 'Referral processing failed' });
  }
};
