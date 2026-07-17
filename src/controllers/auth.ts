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
      let isChanged = false;
      if (username !== user.username) { user.username = username; isChanged = true; }
      if (firstName !== user.firstName) { user.firstName = firstName; isChanged = true; }
      if (lastName !== user.lastName) { user.lastName = lastName; isChanged = true; }
      if (photoUrl !== user.photoUrl) { user.photoUrl = photoUrl; isChanged = true; }
      
      if (isChanged) {
        await user.save();
      }
    }

    // Trả về trọn vẹn document của MongoDB dưới dạng object thuần (gồm cả _id, id,...)
    res.json({
      success: true,
      user: user.toObject(),
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
