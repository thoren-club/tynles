import { Context } from 'grammy';
import { prisma } from '../db';
import { AuthContext, ensureUser, requireSpace, requireRole } from '../middleware/auth';
import { Bot } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { setCurrentSpace, getCurrentSpace } from '../utils/session';
import { getSpacesMenu } from '../menu';
import { getUserLanguage } from '../utils/language';
import { t } from '../i18n';

export function setupSpaceCommands(bot: Bot<AuthContext>) {
  bot.command('space_create', ensureUser, async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const name = args?.join(' ') || 'My Space';

    if (!ctx.user) return;

    const space = await prisma.space.create({
      data: {
        name,
        ownerUserId: ctx.user.id,
        timezone: 'Europe/Berlin',
      },
    });

    await prisma.spaceMember.create({
      data: {
        spaceId: space.id,
        userId: ctx.user.id,
        role: 'Admin',
      },
    });

    await prisma.userSpaceStats.create({
      data: {
        spaceId: space.id,
        userId: ctx.user.id,
        totalXp: 0,
        level: 1,
      },
    });

    setCurrentSpace(ctx.user.id, space.id);

    await ctx.reply(`Space "${name}" created! ID: ${space.id}`);
  });

  bot.command('space_list', ensureUser, async (ctx) => {
    if (!ctx.user) return;

    const members = await prisma.spaceMember.findMany({
      where: { userId: ctx.user.id },
      include: { space: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (members.length === 0) {
      return ctx.reply('You are not a member of any space. Use /space_create to create one.');
    }

    const spacesList = members
      .map((m, idx) => `${idx + 1}. ${m.space.name} (ID: ${m.space.id}) - ${m.role}`)
      .join('\n');

    await ctx.reply(`Your spaces:\n\n${spacesList}\n\nUse /space_switch <id> to switch`);
  });

  bot.command('space_switch', ensureUser, async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const spaceIdStr = args?.[0];

    if (!spaceIdStr || !ctx.user) {
      return ctx.reply('Usage: /space_switch <space_id>');
    }

    const spaceId = BigInt(spaceIdStr);

    const member = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId: ctx.user.id,
        },
      },
      include: { space: true },
    });

    if (!member) {
      return ctx.reply('You are not a member of this space.');
    }

    setCurrentSpace(ctx.user.id, spaceId);
    ctx.currentSpaceId = spaceId;
    ctx.userRole = member.role;

    await ctx.reply(`Switched to space: ${member.space.name}`);
  });

  bot.command('space_info', ensureUser, requireSpace, async (ctx) => {
    if (!ctx.currentSpaceId || !ctx.user) return;

    const space = await prisma.space.findUnique({
      where: { id: ctx.currentSpaceId },
      include: {
        members: {
          include: { user: true },
        },
        _count: {
          select: {
            tasks: true,
            goals: true,
          },
        },
      },
    });

    if (!space) return;

    const member = space.members.find((m) => m.userId === ctx.user!.id);
    const stats = await prisma.userSpaceStats.findUnique({
      where: {
        spaceId_userId: {
          spaceId: ctx.currentSpaceId,
          userId: ctx.user.id,
        },
      },
    });

    const info = `
Space: ${space.name}
ID: ${space.id}
Timezone: ${space.timezone}
Your role: ${member?.role || 'Unknown'}
Your level: ${stats?.level || 1}
Your XP: ${stats?.totalXp || 0}
Tasks: ${space._count.tasks}
Goals: ${space._count.goals}
Members: ${space.members.length}
`;

    await ctx.reply(info.trim());
  });

  // Callback handlers для меню
  bot.callbackQuery('space:list', ensureUser, async (ctx) => {
    try {
      if (!ctx.user) {
        await ctx.answerCallbackQuery({ text: 'Error' });
        return;
      }

      const lang = await getUserLanguage(ctx.user.id);
      const members = await prisma.spaceMember.findMany({
        where: { userId: ctx.user.id },
        include: { space: true },
        orderBy: { joinedAt: 'asc' },
      });

      if (members.length === 0) {
        const text = lang === 'ru'
          ? '🌟 *Ваши пространства*\n\nУ вас пока нет пространств. Создайте первое!'
          : '🌟 *Your Spaces*\n\nYou don\'t have any spaces yet. Create your first one!';
        await ctx.editMessageText(text, {
          reply_markup: getSpacesMenu(lang),
          parse_mode: 'Markdown'
        });
        await ctx.answerCallbackQuery();
        return;
      }

      const spacesList = members
        .map((m, idx) => {
          const emoji = m.role === 'Admin' ? '👑' : m.role === 'Editor' ? '✏️' : '👁️';
          return `${emoji} *${m.space.name}*\n   ID: \`${m.space.id}\` | ${m.role}`;
        })
        .join('\n\n');

      const text = lang === 'ru'
        ? `🌟 *Ваши пространства*\n\n${spacesList}`
        : `🌟 *Your Spaces*\n\n${spacesList}`;

      await ctx.editMessageText(text, {
        reply_markup: getSpacesMenu(lang),
        parse_mode: 'Markdown'
      });
      await ctx.answerCallbackQuery();
    } catch (error) {
      await ctx.answerCallbackQuery({ text: 'Error loading spaces' });
    }
  });

  // Callback для переключения пространства
  bot.callbackQuery('space:switch', ensureUser, async (ctx) => {
    try {
      if (!ctx.user) {
        await ctx.answerCallbackQuery({ text: 'Error' });
        return;
      }

      const lang = await getUserLanguage(ctx.user.id);
      const members = await prisma.spaceMember.findMany({
        where: { userId: ctx.user.id },
        include: { space: true },
        orderBy: { joinedAt: 'asc' },
      });

      if (members.length === 0) {
        const text = lang === 'ru'
          ? '🔄 *Переключение пространства*\n\nУ вас нет пространств для переключения.'
          : '🔄 *Switch Space*\n\nYou don\'t have any spaces to switch to.';
        await ctx.editMessageText(text, {
          reply_markup: getSpacesMenu(lang),
          parse_mode: 'Markdown'
        });
        await ctx.answerCallbackQuery();
        return;
      }

      const currentSpaceId = getCurrentSpace(ctx.user.id);
      const text = lang === 'ru'
        ? '🔄 *Выберите пространство для переключения:*'
        : '🔄 *Select space to switch to:*';

      const keyboard = new InlineKeyboard();
      members.forEach((m) => {
        const emoji = m.role === 'Admin' ? '👑' : m.role === 'Editor' ? '✏️' : '👁️';
        const currentMarker = currentSpaceId === m.space.id ? ' ✓' : '';
        keyboard.text(`${emoji} ${m.space.name}${currentMarker}`, `space:switch_to:${m.space.id}`).row();
      });
      keyboard.text(lang === 'ru' ? '◀️ Назад' : '◀️ Back', 'menu:spaces');

      await ctx.editMessageText(text, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
      await ctx.answerCallbackQuery();
    } catch (error) {
      await ctx.answerCallbackQuery({ text: 'Error' });
    }
  });

  // Callback для фактического переключения
  bot.callbackQuery(/^space:switch_to:(.+)$/, ensureUser, async (ctx) => {
    try {
      if (!ctx.user) {
        await ctx.answerCallbackQuery({ text: 'Error' });
        return;
      }

      const spaceId = BigInt(ctx.match[1]);
      const lang = await getUserLanguage(ctx.user.id);

      const member = await prisma.spaceMember.findUnique({
        where: {
          spaceId_userId: {
            spaceId,
            userId: ctx.user.id,
          },
        },
        include: { space: true },
      });

      if (!member) {
        await ctx.answerCallbackQuery({ text: lang === 'ru' ? 'Пространство не найдено' : 'Space not found' });
        return;
      }

      setCurrentSpace(ctx.user.id, spaceId);
      const text = lang === 'ru'
        ? `🚀 *Переключено!*\n\nВы переключились на пространство: *${member.space.name}*`
        : `🚀 *Switched!*\n\nYou switched to space: *${member.space.name}*`;

      await ctx.editMessageText(text, {
        reply_markup: getSpacesMenu(lang),
        parse_mode: 'Markdown'
      });
      await ctx.answerCallbackQuery({ text: lang === 'ru' ? 'Переключено' : 'Switched' });
    } catch (error) {
      await ctx.answerCallbackQuery({ text: 'Error' });
    }
  });

  bot.callbackQuery('space:info', ensureUser, requireSpace, async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) {
      await ctx.answerCallbackQuery({ text: 'Error' });
      return;
    }

    const userId = ctx.user.id;
    const lang = await getUserLanguage(userId);
    const space = await prisma.space.findUnique({
      where: { id: ctx.currentSpaceId },
      include: {
        members: { include: { user: true } },
        _count: { select: { tasks: true, goals: true } },
      },
    });

    if (!space) {
      await ctx.answerCallbackQuery({ text: 'Space not found' });
      return;
    }

    const member = space.members.find((m) => m.userId === userId);
    const stats = await prisma.userSpaceStats.findUnique({
      where: {
        spaceId_userId: {
          spaceId: ctx.currentSpaceId,
          userId: userId,
        },
      },
    });

    const roleEmoji = member?.role === 'Admin' ? '👑' : member?.role === 'Editor' ? '✏️' : '👁️';
    
    const text = lang === 'ru'
      ? `📊 *Информация о пространстве*\n\n` +
        `🏷️ *${space.name}*\n\n` +
        `📝 ID: \`${space.id}\`\n` +
        `🌍 Часовой пояс: ${space.timezone}\n` +
        `${roleEmoji} Ваша роль: *${member?.role || 'Unknown'}*\n` +
        `⭐ Ваш уровень: *${stats?.level || 1}*\n` +
        `💎 Ваш XP: *${stats?.totalXp || 0}*\n\n` +
        `📈 *Статистика:*\n` +
        `✅ Задач: ${space._count.tasks}\n` +
        `🎯 Целей: ${space._count.goals}\n` +
        `👥 Участников: ${space.members.length}`
      : `📊 *Space Information*\n\n` +
        `🏷️ *${space.name}*\n\n` +
        `📝 ID: \`${space.id}\`\n` +
        `🌍 Timezone: ${space.timezone}\n` +
        `${roleEmoji} Your role: *${member?.role || 'Unknown'}*\n` +
        `⭐ Your level: *${stats?.level || 1}*\n` +
        `💎 Your XP: *${stats?.totalXp || 0}*\n\n` +
        `📈 *Statistics:*\n` +
        `✅ Tasks: ${space._count.tasks}\n` +
        `🎯 Goals: ${space._count.goals}\n` +
        `👥 Members: ${space.members.length}`;

    await ctx.editMessageText(text, {
      reply_markup: getSpacesMenu(lang),
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });

  // Команда удаления пространства (через команду)
  bot.command('space_delete', ensureUser, requireSpace, requireRole('Admin'), async (ctx) => {
    if (!ctx.currentSpaceId || !ctx.user) return;

    const space = await prisma.space.findUnique({
      where: { id: ctx.currentSpaceId },
      include: {
        owner: true,
      },
    });

    if (!space) {
      return ctx.reply('Space not found.');
    }

    // Проверяем, что пользователь - владелец пространства
    if (space.ownerUserId !== ctx.user.id) {
      return ctx.reply('Only the space owner can delete the space.');
    }

    // Удаляем пространство (каскадное удаление настроено в схеме)
    await prisma.space.delete({
      where: { id: ctx.currentSpaceId },
    });

    const lang = await getUserLanguage(ctx.user.id);
    const text = lang === 'ru'
      ? `🗑️ *Пространство удалено*\n\nПространство "${space.name}" было успешно удалено со всеми связанными данными.`
      : `🗑️ *Space Deleted*\n\nSpace "${space.name}" has been successfully deleted along with all related data.`;

    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  // Callback для подтверждения удаления пространства
  bot.callbackQuery('space:delete_confirm', ensureUser, requireSpace, requireRole('Admin'), async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) {
      await ctx.answerCallbackQuery({ text: 'Error' });
      return;
    }

    const lang = await getUserLanguage(ctx.user.id);
    const space = await prisma.space.findUnique({
      where: { id: ctx.currentSpaceId },
    });

    if (!space) {
      await ctx.answerCallbackQuery({ text: 'Space not found' });
      return;
    }

    // Проверяем, что пользователь - владелец
    if (space.ownerUserId !== ctx.user.id) {
      await ctx.answerCallbackQuery({ text: lang === 'ru' ? 'Только владелец может удалить' : 'Only owner can delete' });
      return;
    }

    const confirmText = lang === 'ru'
      ? `⚠️ *Подтверждение удаления*\n\nВы уверены, что хотите удалить пространство "${space.name}"?\n\n❗ *Внимание:* Это действие необратимо! Будут удалены все задачи, цели, участники и статистика.`
      : `⚠️ *Delete Confirmation*\n\nAre you sure you want to delete space "${space.name}"?\n\n❗ *Warning:* This action is irreversible! All tasks, goals, members and statistics will be deleted.`;

    const confirmKeyboard = new InlineKeyboard()
      .text(lang === 'ru' ? '✅ Да, удалить' : '✅ Yes, delete', `space:delete_yes:${ctx.currentSpaceId}`)
      .text(lang === 'ru' ? '❌ Отмена' : '❌ Cancel', 'space:info').row();

    await ctx.editMessageText(confirmText, {
      reply_markup: confirmKeyboard,
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });

  // Callback для фактического удаления пространства
  bot.callbackQuery(/^space:delete_yes:(.+)$/, ensureUser, async (ctx) => {
    if (!ctx.user) {
      await ctx.answerCallbackQuery({ text: 'Error' });
      return;
    }

    const spaceId = BigInt(ctx.match[1]);
    const lang = await getUserLanguage(ctx.user.id);

    const space = await prisma.space.findUnique({
      where: { id: spaceId },
    });

    if (!space) {
      await ctx.answerCallbackQuery({ text: 'Space not found' });
      return;
    }

    // Проверяем, что пользователь - владелец
    if (space.ownerUserId !== ctx.user.id) {
      await ctx.answerCallbackQuery({ text: lang === 'ru' ? 'Доступ запрещен' : 'Access denied' });
      return;
    }

    // Удаляем пространство
    await prisma.space.delete({
      where: { id: spaceId },
    });

    const text = lang === 'ru'
      ? `🗑️ *Пространство удалено*\n\nПространство "${space.name}" было успешно удалено со всеми связанными данными.`
      : `🗑️ *Space Deleted*\n\nSpace "${space.name}" has been successfully deleted along with all related data.`;

    await ctx.editMessageText(text, { parse_mode: 'Markdown' });
    await ctx.answerCallbackQuery({ text: lang === 'ru' ? 'Удалено' : 'Deleted' });
  });
}