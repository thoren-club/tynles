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
export function generateTaskReminderMessage(
  taskTitle: string,
  isOverdue: boolean,
  opts?: { isRecurring?: boolean; recipientName?: string; isDayBefore?: boolean }
): string {
  const namePrefix = opts?.recipientName ? `${opts.recipientName}! ` : '';
  const recurringSuffix = opts?.isRecurring ? ' (повторяется)' : '';
  const dayBeforePrefix = opts?.isDayBefore ? 'Завтра у тебя ' : 'У тебя ';

  const messages = isOverdue
    ? [
        `${namePrefix}ну ты где? Задача <b>${taskTitle}</b> уже просрочена 😬${recurringSuffix}`,
        `${namePrefix}напоминаю по‑дружески: <b>${taskTitle}</b> уже просрочена. Давай закроем?`,
        `${namePrefix}эй! <b>${taskTitle}</b> уже просрочена. Не тяни 🙏`,
      ]
    : [
        `${namePrefix}${dayBeforePrefix}<b>${taskTitle}</b>. Не забудь 💛${recurringSuffix}`,
        `${namePrefix}маленький пинг: <b>${taskTitle}</b> ждёт тебя ⏰${recurringSuffix}`,
        `${namePrefix}напоминалка: <b>${taskTitle}</b> скоро дедлайн. Давай без стресса ✨`,
      ];

  return messages[Math.floor(Math.random() * messages.length)];
}
