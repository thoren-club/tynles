import { prisma } from '../db';
import { Bot } from 'grammy';
import { AuthContext } from '../middleware/auth';
import { addXp } from './xp';
import { calculateNextDueDate } from './recurrence';

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getAssigneeScopeFromPayload(payload: any): 'user' | 'space' {
  return payload?.assigneeScope === 'space' ? 'space' : 'user';
}

function getAssigneeUserIdFromPayload(payload: any): bigint | null {
  if (getAssigneeScopeFromPayload(payload) === 'space') {
    return null;
  }
  const raw = payload?.assigneeUserId;
  if (!raw) return null;
  try {
    return BigInt(String(raw));
  } catch {
    return null;
  }
}

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

  const payload = task.recurrencePayload as any;
  const assigneeScope = getAssigneeScopeFromPayload(payload);
  const assigneeUserId = getAssigneeUserIdFromPayload(payload) ?? task.createdBy ?? userId;
  let requesterResult: { levelUp: boolean; newLevel: number } | null = null;

  const handleUserCompletion = async (targetUserId: bigint) => {
    const xpResult = await addXp(task.spaceId, targetUserId, task.xp);

    await prisma.taskCompletion.create({
      data: {
        taskId: task.id,
        spaceId: task.spaceId,
        userId: targetUserId,
        xp: task.xp,
      },
    });

    const user = await prisma.telegramUser.findUnique({
      where: { id: targetUserId },
    });

    if (user) {
      try {
        await bot.api.sendMessage(
          Number(user.tgId),
          `✅ Задача выполнена: ${task.title}\n+${task.xp} XP`,
        );
      } catch (error) {
        console.error('Failed to send task completion message:', error);
      }
    }

    if (xpResult.levelUp && user) {
      const reward = await prisma.reward.findUnique({
        where: {
          spaceId_level: {
            spaceId: task.spaceId,
            level: xpResult.newLevel,
          },
        },
      });

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

    return xpResult;
  };

  if (assigneeScope === 'space') {
    const members = await prisma.spaceMember.findMany({
      where: { spaceId: task.spaceId },
      select: { userId: true },
    });

    if (members.length === 0) {
      requesterResult = await handleUserCompletion(userId);
    } else {
      for (const member of members) {
        const xpResult = await handleUserCompletion(member.userId);
        if (member.userId === userId) {
          requesterResult = xpResult;
        }
      }
    }
  } else {
    requesterResult = await handleUserCompletion(assigneeUserId);
  }

  // Handle recurrence
  if (task.recurrenceType && task.recurrenceType !== 'none') {
    const nextDueAt = calculateNextDueDate(
      task.recurrenceType,
      task.recurrencePayload as any,
      new Date(),
    );
    const payload = task.recurrencePayload as any;
    const nextDueWithTime = payload?.timeOfDay ? nextDueAt : endOfDay(nextDueAt);

    await prisma.task.update({
      where: { id: task.id },
      data: {
        dueAt: nextDueWithTime,
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

  return requesterResult ?? { levelUp: false, newLevel: 0 };
}