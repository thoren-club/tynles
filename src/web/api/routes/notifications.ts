import { Router, Request, Response } from 'express';
import { prisma } from '../../../db';
import { AuthRequest } from '../middleware/auth';
import { sendTaskReminders } from '../../../notifications';

const router = Router();

// Get notification settings
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.id;

    let settings = await prisma.userNotificationSettings.findUnique({
      where: { userId },
    });

    // Если настроек нет, создаем с дефолтными значениями
    if (!settings) {
      settings = await prisma.userNotificationSettings.create({
        data: {
          userId,
          taskRemindersEnabled: true,
          reminderHoursBefore: 2,
          reminderTime: '18:00',
          pokeEnabled: true,
        },
      });
    }

    res.json({
      taskRemindersEnabled: settings.taskRemindersEnabled,
      reminderHoursBefore: settings.reminderHoursBefore,
      reminderTime: settings.reminderTime,
      pokeEnabled: settings.pokeEnabled,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notification settings' });
  }
});

// Update notification settings
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.id;

    const { taskRemindersEnabled, reminderHoursBefore, reminderTime, pokeEnabled } = req.body;

    const settings = await prisma.userNotificationSettings.upsert({
      where: { userId },
      create: {
        userId,
        taskRemindersEnabled: taskRemindersEnabled !== undefined ? taskRemindersEnabled : true,
        reminderHoursBefore: reminderHoursBefore !== undefined ? reminderHoursBefore : 2,
        reminderTime: typeof reminderTime === 'string' ? reminderTime : '18:00',
        pokeEnabled: pokeEnabled !== undefined ? pokeEnabled : true,
      },
      update: {
        ...(taskRemindersEnabled !== undefined && { taskRemindersEnabled }),
        ...(reminderHoursBefore !== undefined && { reminderHoursBefore }),
        ...(reminderTime !== undefined && { reminderTime }),
        ...(pokeEnabled !== undefined && { pokeEnabled }),
      },
    });

    res.json({
      taskRemindersEnabled: settings.taskRemindersEnabled,
      reminderHoursBefore: settings.reminderHoursBefore,
      reminderTime: settings.reminderTime,
      pokeEnabled: settings.pokeEnabled,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// Send task reminders (this should be called by a cron job)
// Endpoint для ручного запуска (для тестирования или как fallback)
// Проверяет ВСЕ пространства всех пользователей
router.post('/reminders/send', async (req: Request, res: Response) => {
  try {
    const result = await sendTaskReminders();

    res.json({
      success: true,
      remindersSent: result.remindersSent,
      message: `Sent ${result.remindersSent} reminders`,
      consideredTasks: result.consideredTasks,
      horizonHours: result.horizonHours,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

export { router as notificationsRouter };
