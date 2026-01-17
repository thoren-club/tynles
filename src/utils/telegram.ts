import { config } from '../config';
import { logger } from '../logger';

/**
 * Отправляет сообщение пользователю через Telegram Bot API
 */
export async function sendTelegramMessage(
  tgUserId: bigint,
  message: string
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: Number(tgUserId),
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.warn(
        {
          tgUserId: tgUserId.toString(),
          status: response.status,
          error: errorData,
        },
        'Failed to send Telegram message'
      );
      return false;
    }

    logger.info({ tgUserId: tgUserId.toString() }, 'Telegram message sent successfully');
    return true;
  } catch (error) {
    logger.error({ error, tgUserId: tgUserId.toString() }, 'Error sending Telegram message');
    return false;
  }
}

/**
 * Генерирует эмоциональные тексты для напоминаний о задачах
 */
export function generateTaskReminderMessage(taskTitle: string, isOverdue: boolean): string {
  const messages = isOverdue
    ? [
        `Вы опять расстроили меня 😢 - у вас есть просроченная задача: <b>${taskTitle}</b>`,
        `Ваша задача <b>${taskTitle}</b> уже просрочена! Поторопитесь! ⚡`,
        `Не забудьте про просроченную задачу: <b>${taskTitle}</b> 😢`,
      ]
    : [
        `Не забудьте про задачу: <b>${taskTitle}</b> - она уже ждет вас! ⏰`,
        `Ваша задача <b>${taskTitle}</b> скоро истечет! Поторопитесь! ⚡`,
        `Напоминание: у вас есть задача <b>${taskTitle}</b>, которая скоро истечет! ⏰`,
      ];

  return messages[Math.floor(Math.random() * messages.length)];
}
