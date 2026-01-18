import { prisma } from '../db';
import { TelegramTransport } from './telegram-transport';

export async function sendPokeNotification(
  transport: TelegramTransport,
  params: {
    fromUserId: bigint;
    toUserId: bigint;
    toTgId: bigint;
  },
) {
  const { fromUserId, toUserId, toTgId } = params;

  const notificationSettings = await prisma.userNotificationSettings.findUnique({
    where: { userId: toUserId },
  });
  if (notificationSettings && !notificationSettings.pokeEnabled) {
    return { sent: false, reason: 'disabled' as const };
  }

  const fromUser = await prisma.telegramUser.findUnique({
    where: { id: fromUserId },
  });

  const fromUserName = fromUser?.firstName || fromUser?.username || 'Кто-то';
  const message = `Вас пнул <b>${fromUserName}</b>! Не забудьте выполнить задачи! 💪`;

  const sent = await transport.sendMessage(toTgId, message);
  return { sent, reason: sent ? ('sent' as const) : ('failed' as const) };
}

