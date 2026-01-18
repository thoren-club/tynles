import { telegramTransport } from './telegram-transport';
import { sendTaskReminders as sendTaskRemindersImpl } from './task-reminders';
import { notifySpaceMembers as notifySpaceMembersImpl } from './space-notifications';
import { notifyTaskAssigneeChanged as notifyTaskAssigneeChangedImpl } from './task-assignment-notifications';
import { sendPokeNotification as sendPokeNotificationImpl } from './poke-notifications';

export { telegramTransport };
export type { TelegramTransport } from './telegram-transport';
export type { TaskReminderRunResult } from './task-reminders';

/**
 * Canonical reminders runner.
 *
 * Prefer using this instead of legacy reminder code in utils.
 */
export async function sendTaskReminders() {
  return sendTaskRemindersImpl(telegramTransport);
}

export async function notifySpaceMembers(spaceId: bigint, message: string) {
  return notifySpaceMembersImpl(telegramTransport, spaceId, message);
}

export async function notifyTaskAssigneeChanged(params: {
  prevAssigneeId: bigint | null;
  nextAssigneeId: bigint | null;
  taskTitle: string;
  spaceName: string;
  actorName: string;
}) {
  return notifyTaskAssigneeChangedImpl(telegramTransport, params);
}

export async function sendPokeNotification(params: {
  fromUserId: bigint;
  toUserId: bigint;
  toTgId: bigint;
}) {
  return sendPokeNotificationImpl(telegramTransport, params);
}

