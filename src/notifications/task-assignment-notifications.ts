import { prisma } from '../db';
import { TelegramTransport } from './telegram-transport';

export async function notifyTaskAssigneeChanged(
  transport: TelegramTransport,
  params: {
    prevAssigneeId: bigint | null;
    nextAssigneeId: bigint | null;
    taskTitle: string;
    spaceName: string;
    actorName: string;
  },
) {
  const { prevAssigneeId, nextAssigneeId, taskTitle, spaceName, actorName } = params;

  // notify previous assignee if removed/reassigned
  if (prevAssigneeId && (!nextAssigneeId || prevAssigneeId !== nextAssigneeId)) {
    const prevUser = await prisma.telegramUser.findUnique({ where: { id: prevAssigneeId } });
    if (prevUser) {
      await transport.sendMessage(
        prevUser.tgId,
        `Вас открепили от задачи <b>${taskTitle}</b> в пространстве <b>${spaceName}</b>.\nИнициатор: <b>${actorName}</b>`,
      );
    }
  }

  // notify new assignee
  if (nextAssigneeId && (!prevAssigneeId || prevAssigneeId !== nextAssigneeId)) {
    const nextUser = await prisma.telegramUser.findUnique({ where: { id: nextAssigneeId } });
    if (nextUser) {
      await transport.sendMessage(
        nextUser.tgId,
        `Вас назначили исполнителем задачи <b>${taskTitle}</b> в пространстве <b>${spaceName}</b>.\nИнициатор: <b>${actorName}</b>`,
      );
    }
  }
}

