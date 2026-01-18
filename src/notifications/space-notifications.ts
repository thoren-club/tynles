import { prisma } from '../db';
import { TelegramTransport } from './telegram-transport';

export async function notifySpaceMembers(
  transport: TelegramTransport,
  spaceId: bigint,
  message: string,
) {
  const members = await prisma.spaceMember.findMany({
    where: { spaceId },
    include: { user: true },
  });

  await Promise.all(
    members.map((m) => transport.sendMessage(m.user.tgId, message)),
  );
}

