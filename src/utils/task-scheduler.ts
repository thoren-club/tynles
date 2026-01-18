import { prisma } from '../db';
import { Bot } from 'grammy';
import { AuthContext } from '../middleware/auth';
import { addXp } from './xp';
import { calculateNextDueDate } from './recurrence';

export async function sendReminders(bot: Bot<AuthContext>) {
  // Legacy: kept for backward compatibility. Prefer `src/notifications/sendTaskReminders`.
  const now = new Date();
  const tasks = await prisma.task.findMany({
    where: {
      dueAt: {
        lte: now,
      },
      reminderSent: false,
      isPaused: false,
    },
    include: {
      space: {
        include: {
          members: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  for (const task of tasks) {
    try {
      // Send reminder to space members (or task creator)
      // For MVP, send to creator only
      const creator = await prisma.telegramUser.findUnique({
        where: { id: task.createdBy },
      });

      if (creator) {
        await bot.api.sendMessage(Number(creator.tgId), `📋 Reminder: ${task.title}`);
      }

      await prisma.task.update({
        where: { id: task.id },
        data: { reminderSent: true },
      });
    } catch (error) {
      console.error(`Failed to send reminder for task ${task.id}:`, error);
    }
  }
}

export async function markTaskDone(taskId: bigint, userId: bigint, bot: Bot<AuthContext>) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { space: true },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  // Add XP
  const xpResult = await addXp(task.spaceId, userId, task.xp);

  // Handle recurrence
  if (task.recurrenceType && task.recurrenceType !== 'none') {
    const nextDueAt = calculateNextDueDate(
      task.recurrenceType,
      task.recurrencePayload as any,
      new Date(),
    );

    await prisma.task.update({
      where: { id: task.id },
      data: {
        dueAt: nextDueAt,
        reminderSent: false,
      },
    });
  } else {
    // Non-recurring task - mark as done by deleting or keeping for history
    // For MVP, we'll delete it
    await prisma.task.delete({
      where: { id: task.id },
    });
  }

  // Check for level up and rewards
  if (xpResult.levelUp) {
    const reward = await prisma.reward.findUnique({
      where: {
        spaceId_level: {
          spaceId: task.spaceId,
          level: xpResult.newLevel,
        },
      },
    });

    const user = await prisma.telegramUser.findUnique({
      where: { id: userId },
    });

    if (user) {
      let message = `🎉 Level up! You reached level ${xpResult.newLevel}!`;
      if (reward) {
        message += `\n\n🎁 Reward: ${reward.text}`;
      }

      try {
        await bot.api.sendMessage(Number(user.tgId), message);
      } catch (error) {
        console.error('Failed to send level up message:', error);
      }
    }
  }

  return xpResult;
}