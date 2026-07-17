import { Context } from 'telegraf';
import User from '../models/User';
import { bot } from './instance';

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '7346983056';
const MINI_APP_URL = process.env.MINI_APP_URL;

// Helper function to create inline keyboard with app button
const getAppKeyboard = () => ({
  inline_keyboard: [[{ text: '🚀 Open PayPlus App', url: MINI_APP_URL }]],
});

// Broadcast command (Admin only)
bot.command('broadcast', async (ctx: Context) => {
  const telegramId = ctx.from?.id?.toString();

  if (telegramId !== ADMIN_TELEGRAM_ID) {
    await ctx.reply('⛔ Only admins can use this command.');
    return;
  }

  const message = ctx.message?.text?.replace('/broadcast', '').trim();

  if (!message) {
    await ctx.reply('Usage: /broadcast <message>');
    return;
  }

  // Fetch all users
  const users = await User.find({}, { telegramId: 1 });

  if (users.length === 0) {
    await ctx.reply('No users found.');
    return;
  }

  // Rate-limited broadcast
  const RATE_LIMIT = 25; // messages per second
  const BATCH_DELAY = 1000; // ms between batches
  let successCount = 0;
  let failCount = 0;

  await ctx.reply(`📢 Broadcasting to ${users.length} users...`);

  for (let i = 0; i < users.length; i += RATE_LIMIT) {
    const batch = users.slice(i, i + RATE_LIMIT);

    const promises = batch.map(async (user) => {
      try {
        await bot.telegram.sendMessage(user.telegramId, message, {
          reply_markup: getAppKeyboard(),
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to send to ${user.telegramId}:`, error);
        failCount++;
      }
    });

    await Promise.all(promises);

    // Wait before next batch
    if (i + RATE_LIMIT < users.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
    }
  }

  await ctx.reply(
    `✅ Broadcast complete!\n\nSuccess: ${successCount}\nFailed: ${failCount}`
  );
});

// Send command (Admin only)
bot.command('send', async (ctx: Context) => {
  const telegramId = ctx.from?.id?.toString();

  if (telegramId !== ADMIN_TELEGRAM_ID) {
    await ctx.reply('⛔ Only admins can use this command.');
    return;
  }

  const args = ctx.message?.text?.split(' ').slice(1);

  if (args.length < 2) {
    await ctx.reply('Usage: /send <telegramId> <message>');
    return;
  }

  const targetId = Number(args[0]);
  const message = args.slice(1).join(' ');

  if (isNaN(targetId)) {
    await ctx.reply('Invalid Telegram ID.');
    return;
  }

  try {
    await bot.telegram.sendMessage(targetId, message, {
      reply_markup: getAppKeyboard(),
    });
    await ctx.reply(`✅ Message sent to ${targetId}`);
  } catch (error) {
    console.error('Failed to send message:', error);
    await ctx.reply('❌ Failed to send message. User may have blocked the bot.');
  }
});

// Stats command (Admin only)
bot.command('stats', async (ctx: Context) => {
  const telegramId = ctx.from?.id?.toString();

  if (telegramId !== ADMIN_TELEGRAM_ID) {
    await ctx.reply('⛔ Only admins can use this command.');
    return;
  }

  const totalUsers = await User.countDocuments();
  const totalGold = await User.aggregate([
    { $group: { _id: null, total: { $sum: '$balance' } } },
  ]);
  const totalWithdrawals = await User.aggregate([
    { $group: { _id: null, total: { $sum: '$totalEarned' } } },
  ]);

  const statsMessage = `
📊 PayPlus Statistics

👥 Total Users: ${totalUsers}
💰 Total Gold in Circulation: ${totalGold[0]?.total || 0}
💵 Total Withdrawals: ${totalWithdrawals[0]?.total || 0}
  `.trim();

  await ctx.reply(statsMessage);
});
