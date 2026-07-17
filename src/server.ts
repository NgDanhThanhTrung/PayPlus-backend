import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import routes from './routes';
import bot from './bot/instance';
import { setupBotCommands } from './bot/commands'; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// Start server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Start bot polling
    console.log('Starting Telegram bot polling...');
    await bot.launch();
    
    // ĐÃ SỬA: Truyền trực tiếp đối tượng `bot` đã khởi tạo vào hàm setup để kích hoạt toàn bộ menu lệnh
    await setupBotCommands(bot);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  bot.stop();
  process.exit(0);
});

startServer();
