import { Context } from 'telegraf';
import User from '../models/User';
// ĐÃ XÓA dòng import gây lỗi: import { bot } from './instance';

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '7346983056';
const MINI_APP_URL = process.env.MINI_APP_URL;

// Helper function to create inline keyboard with web_app button
const getAppKeyboard = () => ({
  inline_keyboard: [
    [
      { 
        text: '🚀 Open PayPlus App', 
        web_app: { url: MINI_APP_URL || 'https://pay-plus-frontend.vercel.app/' } 
      }
    ]
  ],
});

// ==========================================
// THIẾT LẬP MENU VÀ ĐĂNG KÝ COMMANDS
// ==========================================
export const setupBotCommands = async (bot: any) => {
  try {
    // 1. Xóa sạch hoàn toàn các dòng inline commands đã đăng ký trước đó
    await bot.telegram.setMyCommands([]);

    // 2. Đăng ký tập hợp 3 lệnh inline mới cho người dùng
    const newCommands = [
      { command: 'spin', description: '🌀 Vòng quay may mắn trúng vàng' },
      { command: 'checkin', description: '📅 Điểm danh nhận thưởng hằng ngày' },
      { command: 'myid', description: '🆔 Xem Telegram ID của bản thân' }
    ];

    await bot.telegram.setMyCommands(newCommands);
    console.log('--- [Bot] Đã làm sạch menu cũ và cập nhật bộ lệnh inline thành công ---');
  } catch (error) {
    console.error('Lỗi khi cập nhật danh sách lệnh Bot:', error);
  }

  // ==========================================
  // CÁC LỆNH MỚI CHO USER (BÊN TRONG HÀM SETUP)
  // ==========================================

  // Lệnh /myid: Xem ID cá nhân
  bot.command('myid', async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    await ctx.reply(`🆔 ID Telegram của bạn là: \`${telegramId}\``, { parse_mode: 'MarkdownV2' });
  });

  // Lệnh /checkin: Điểm danh nhận thưởng
  bot.command('checkin', async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        await ctx.reply('❌ Bạn cần khởi chạy ứng dụng (Mini App) trước để khởi tạo tài khoản!', {
          reply_markup: getAppKeyboard()
        });
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Kiểm tra thời gian điểm danh cuối cùng
      const lastCheckIn = (user as any).lastCheckIn ? new Date((user as any).lastCheckIn) : null;
      if (lastCheckIn && lastCheckIn >= today) {
        await ctx.reply('📅 Hôm nay bạn đã điểm danh rồi! Hãy quay lại vào ngày mai nhé.');
        return;
      }

      const DAILY_CHECKIN_REWARD = 200; // Số vàng thưởng
      user.balance += DAILY_CHECKIN_REWARD;
      (user as any).lastCheckIn = new Date(); // Cập nhật ngày điểm danh mới nhất
      await user.save();

      await ctx.reply(`🎉 Điểm danh thành công!\n💰 Bạn nhận được: +${DAILY_CHECKIN_REWARD} Vàng\n💵 Số dư hiện tại: ${user.balance} Vàng.`);
    } catch (err) {
      console.error('Checkin command error:', err);
      await ctx.reply('⚠️ Có lỗi xảy ra khi xử lý điểm danh.');
    }
  });

  // Lệnh /spin: Vòng quay may mắn
  bot.command('spin', async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        await ctx.reply('❌ Bạn cần mở Mini App trước để tạo ví tài khoản.', {
          reply_markup: getAppKeyboard()
        });
        return;
      }

      const rewards = [20, 50, 100, 200, 500];
      const randomReward = rewards[Math.floor(Math.random() * rewards.length)];

      user.balance += randomReward;
      await user.save();

      // Gửi hiệu ứng slot machine sinh động từ hệ thống Telegram
      await ctx.replyWithDice({ emoji: '🎰' });
      
      setTimeout(async () => {
        await ctx.reply(`🌀 Vòng quay dừng lại!\n🎁 Bạn trúng được: +${randomReward} Vàng\n💰 Số dư hiện tại: ${user.balance} Vàng.`);
      }, 2000);

    } catch (err) {
      console.error('Spin command error:', err);
      await ctx.reply('⚠️ Máy chủ bận, không thể quay thưởng lúc này.');
    }
  });

  // ==========================================
  // CÁC LỆNH ADMIN SẴN CÓ
  // ==========================================

  // Broadcast command (Admin only)
  bot.command('broadcast', async (ctx: Context) => {
    const telegramId = ctx.from?.id?.toString();

    if (telegramId !== ADMIN_TELEGRAM_ID) {
      await ctx.reply('⛔ Only admins can use this command.');
      return;
    }

    const message = (ctx.message as any)?.text?.replace('/broadcast', '').trim();

    if (!message) {
      await ctx.reply('Usage: /broadcast <message>');
      return;
    }

    const users = await User.find({}, { telegramId: 1 });

    if (users.length === 0) {
      await ctx.reply('No users found.');
      return;
    }

    const RATE_LIMIT = 25;
    const BATCH_DELAY = 1000;
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

    const messageText = (ctx.message as any)?.text || '';
    const args = messageText.split(' ').slice(1);

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
};
