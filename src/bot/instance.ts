import { Telegraf, Context } from 'telegraf';
import User from '../models/User';
import Referral from '../models/Referral';
// XÓA DÒNG IMPORT GÂY LỖI VÒNG LẶP: import { setupBotCommands } from './commands';

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = process.env.MINI_APP_URL;

if (!botToken) {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is not defined');
}

if (!miniAppUrl) {
  throw new Error('MINI_APP_URL environment variable is not defined');
}

export const bot = new Telegraf(botToken);

// Helper function to create inline keyboard with app button
const getAppKeyboard = () => ({
  inline_keyboard: [[{ text: '🚀 Open PayPlus App', url: miniAppUrl }]],
});

// Start command
bot.start(async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  
  // Khắc phục lỗi TS2339: Ép kiểu sang any để lấy trường payload từ deep-link /start
  const startParam = (ctx as any).payload;

  if (!telegramId) {
    return;
  }

  // Find or create user
  let user = await User.findOne({ telegramId });

  if (!user) {
    user = await User.create({
      telegramId,
      username: ctx.from?.username,
      firstName: ctx.from?.first_name,
      lastName: ctx.from?.last_name,
      // Khắc phục lỗi TS2339: Đối tượng gốc từ Telegram API sử dụng photo_url cần qua any
      photoUrl: (ctx.from as any)?.photo_url,
      balance: 0,
      totalEarned: 0,
      totalAdsWatched: 0,
    });
  }

  // Process referral if startParam exists
  if (startParam && !isNaN(Number(startParam))) {
    const inviterId = Number(startParam);
    if (inviterId !== telegramId) {
      const existingReferral = await Referral.findOne({ inviteeId: telegramId });
      if (!existingReferral) {
        await Referral.create({
          inviterId,
          inviteeId: telegramId,
          status: 'pending',
          adCount: 0,
        });
      }
    }
  }

  // Welcome message (bilingual)
  const welcomeMessage = `
🎉 Welcome to PayPlus!

Earn Gold by watching ads, completing tasks, and inviting friends.

📊 Your Balance: ${user.balance} Gold
🔗 Invite friends to earn more!

Start earning now! 👇
  `.trim();

  await ctx.reply(welcomeMessage, {
    reply_markup: getAppKeyboard(),
  });
});

// Help command
bot.help(async (ctx: Context) => {
  const helpMessage = `
📖 PayPlus Help

🎮 How to Earn:
• Watch ads (up to 15/day)
• Complete social tasks
• Invite friends

💰 Withdraw:
• USDT (TRC20)
• PayPal
• Mobile top-up

Need help? Contact support via the app.
  `.trim();

  await ctx.reply(helpMessage, {
    reply_markup: getAppKeyboard(),
  });
});

// XÓA BỎ HOÀN TOÀN KHỐI GỌI HÀM SETUPBOTCOMMANDS() Ở ĐÂY

export default bot;
