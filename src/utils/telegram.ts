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
  opts?: { isRecurring?: boolean; recipientName?: string; isDayBefore?: boolean; timeLeft?: string }
): string {
  const namePrefix = opts?.recipientName ? `${opts.recipientName}, ` : '';
  const recurringSuffix = opts?.isRecurring ? ' (повторяется)' : '';
  const timeLeftSuffix = opts?.timeLeft && !isOverdue && !opts?.isDayBefore
    ? `\n⏳ Осталось ${opts.timeLeft}`
    : '';

  const pick = (variants: string[]) => variants[Math.floor(Math.random() * variants.length)];

  const overdueVariants = [
    `${namePrefix}ну всё, время пошло мимо. <b>${taskTitle}</b> уже просрочена 😈${recurringSuffix}`,
    `${namePrefix}эй, чемпион, просрочка — это не стиль. <b>${taskTitle}</b> ждёт тебя.`,
    `${namePrefix}ты можешь лучше, чем это. <b>${taskTitle}</b> уже просрочена. Давай соберёмся.`,
    `${namePrefix}не прячься! <b>${taskTitle}</b> просрочена. Жми и закрывай.`,
  ];

  const dayBeforeVariants = [
    `${namePrefix}завтра дедлайн по <b>${taskTitle}</b>. Спокойно и уверенно — ты справишься${recurringSuffix}.`,
    `${namePrefix}напоминалка: завтра <b>${taskTitle}</b>. Давай без паники, ты умеешь${recurringSuffix}.`,
    `${namePrefix}завтра важный день для <b>${taskTitle}</b>. Подготовься красиво ✨${recurringSuffix}`,
    `${namePrefix}<b>${taskTitle}</b> завтра. Я верю в тебя, не подведи${recurringSuffix}.`,
  ];

  const soonVariants = [
    `${namePrefix}маленький пинг: <b>${taskTitle}</b> скоро. Двигаем?${recurringSuffix}${timeLeftSuffix}`,
    `${namePrefix}<b>${taskTitle}</b> уже на горизонте. Я бы не откладывал${recurringSuffix}${timeLeftSuffix}.`,
    `${namePrefix}ты классный, давай добьём <b>${taskTitle}</b> вовремя.${recurringSuffix}${timeLeftSuffix}`,
    `${namePrefix}<b>${taskTitle}</b> ждёт твоего решения. Пора сиять 🌟${recurringSuffix}${timeLeftSuffix}`,
  ];

  if (isOverdue) return pick(overdueVariants);
  if (opts?.isDayBefore) return pick(dayBeforeVariants);
  return pick(soonVariants);
}
