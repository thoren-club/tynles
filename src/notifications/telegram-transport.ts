import { sendTelegramMessage } from '../utils/telegram';

export interface TelegramTransport {
  sendMessage(tgUserId: bigint, message: string): Promise<boolean>;
}

/**
 * Default transport for sending Telegram notifications via Bot API.
 *
 * Note: we keep transport tiny and side-effect free besides sending.
 */
export const telegramTransport: TelegramTransport = {
  sendMessage: sendTelegramMessage,
};

