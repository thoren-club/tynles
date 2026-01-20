import { prisma } from '../db';
import { TelegramTransport } from './telegram-transport';

export async function notifyUser(
  transport: TelegramTransport,
  params: {
    userId: bigint;
    message: string;
  },
) {
  const { userId, message } = params;
  const user = await prisma.telegramUser.findUnique({ where: { id: userId } });
  if (!user) return { sent: false };
  const sent = await transport.sendMessage(user.tgId, message);
  return { sent };
}
