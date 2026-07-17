import { Request, Response } from 'express';
import axios from 'axios';
import Task from '../models/Task';
import TaskCompletion from '../models/TaskCompletion';
import User from '../models/User';

export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const tasks = await Task.find({ isActive: true });

    res.json({ success: true, tasks });
  } catch (error) {
    console.error('Get tasks controller error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

export const checkTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { telegramId } = req.user!;
    const { taskId } = req.body;

    if (!taskId) {
      res.json({ success: false, error: 'Task ID required' });
      return;
    }

    // Check if task already completed
    const existingCompletion = await TaskCompletion.findOne({
      telegramId,
      taskId,
    });

    if (existingCompletion) {
      res.json({ success: false, error: 'Task already completed' });
      return;
    }

    // Get task details
    const task = await Task.findById(taskId);
    if (!task || !task.isActive) {
      res.json({ success: false, error: 'Task not found or inactive' });
      return;
    }

    // Verify via Telegram Bot API
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    let isMember = false;

    if (task.chatId) {
      try {
        const response = await axios.get(
          `https://api.telegram.org/bot${botToken}/getChatMember`,
          {
            params: {
              chat_id: task.chatId,
              user_id: telegramId,
            },
          }
        );

        const memberStatus = response.data.result?.status;
        isMember = ['member', 'administrator', 'creator'].includes(memberStatus);
      } catch (error) {
        console.error('Telegram API error:', error);
        res.json({ success: false, error: 'Failed to verify task' });
        return;
      }
    } else {
      // For URL-based tasks, assume completion (client-side verification)
      isMember = true;
    }

    if (!isMember) {
      res.json({ success: false, error: 'Task requirements not met' });
      return;
    }

    // Mark task as completed
    await TaskCompletion.create({
      telegramId,
      taskId,
    });

    // Award reward
    await User.findOneAndUpdate(
      { telegramId },
      {
        $inc: {
          balance: task.reward,
          totalEarned: task.reward,
        },
      }
    );

    // Get updated user
    const user = await User.findOne({ telegramId });

    res.json({
      success: true,
      reward: task.reward,
      user: {
        balance: user?.balance,
        totalEarned: user?.totalEarned,
      },
    });
  } catch (error) {
    console.error('Check task controller error:', error);
    res.status(500).json({ error: 'Task verification failed' });
  }
};

export const getCompletedTasks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { telegramId } = req.user!;

    const completions = await TaskCompletion.find({ telegramId }).select('taskId');

    const completedTaskIds = completions.map((c) => c.taskId);

    res.json({ success: true, completedTaskIds });
  } catch (error) {
    console.error('Get completed tasks controller error:', error);
    res.status(500).json({ error: 'Failed to fetch completed tasks' });
  }
};
