import { Request, Response } from 'express';
import User from '../models/User';
import Withdrawal from '../models/Withdrawal';
import axios from 'axios';

export const createWithdrawal = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { telegramId } = req.user!;
    const { paymentMethod, goldAmount, realAmount, currency, walletAddress } =
      req.body;

    if (!paymentMethod || !goldAmount || !walletAddress) {
      res.json({ success: false, error: 'Missing required fields' });
      return;
    }

    // Get user
    const user = await User.findOne({ telegramId });
    if (!user) {
      res.json({ success: false, error: 'User not found' });
      return;
    }

    // Check balance
    if (user.balance < goldAmount) {
      res.json({ success: false, error: 'Insufficient balance' });
      return;
    }

    // Deduct balance atomically
    const updatedUser = await User.findOneAndUpdate(
      { telegramId, balance: { $gte: goldAmount } },
      { $inc: { balance: -goldAmount } },
      { new: true }
    );

    if (!updatedUser) {
      res.json({ success: false, error: 'Balance deduction failed' });
      return;
    }

    // Create withdrawal record
    const withdrawal = await Withdrawal.create({
      telegramId,
      paymentMethod,
      goldAmount,
      realAmount: realAmount || goldAmount,
      currency: currency || 'VND',
      walletAddress,
      status: 'pending',
    });

    // Notify admin via bot
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const adminId = process.env.ADMIN_TELEGRAM_ID;

    if (botToken && adminId) {
      try {
        const message = `
🔔 New Withdrawal Request

User ID: ${telegramId}
Username: ${user.username || 'N/A'}
Amount: ${goldAmount} Gold (${realAmount || goldAmount} ${currency || 'VND'})
Method: ${paymentMethod}
Wallet: ${walletAddress}

Status: Pending
        `.trim();

        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: adminId,
          text: message,
          parse_mode: 'HTML',
        });
      } catch (error) {
        console.error('Failed to notify admin:', error);
      }
    }

    res.json({
      success: true,
      withdrawal: {
        id: withdrawal._id,
        goldAmount: withdrawal.goldAmount,
        realAmount: withdrawal.realAmount,
        currency: withdrawal.currency,
        status: withdrawal.status,
      },
      user: {
        balance: updatedUser.balance,
      },
    });
  } catch (error) {
    console.error('Withdrawal controller error:', error);
    res.status(500).json({ error: 'Withdrawal creation failed' });
  }
};

export const getWithdrawals = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { telegramId } = req.user!;

    const withdrawals = await Withdrawal.find({ telegramId }).sort({
      createdAt: -1,
    });

    res.json({ success: true, withdrawals });
  } catch (error) {
    console.error('Get withdrawals controller error:', error);
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
};
