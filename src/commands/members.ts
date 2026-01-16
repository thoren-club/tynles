import { Context } from 'grammy';
import { prisma } from '../db';
import { AuthContext, ensureUser, requireSpace, requireRole } from '../middleware/auth';
import { Bot, InlineKeyboard } from 'grammy';
import { Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import { setCurrentSpace } from '../utils/session';
import { getMembersMenu } from '../menu';
import { getUserLanguage } from '../utils/language';
import { t } from '../i18n';

export function setupMemberCommands(bot: Bot<AuthContext>) {
  bot.command('invite_create', ensureUser, requireSpace, requireRole('Admin'), async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const roleStr = args?.[0]?.toLowerCase();

    if (!roleStr || !ctx.currentSpaceId || !ctx.user) {
      return ctx.reply('Usage: /invite_create <role> (Admin/Editor/Viewer)');
    }

    let role: Role;
    if (roleStr === 'admin') role = 'Admin';
    else if (roleStr === 'editor') role = 'Editor';
    else if (roleStr === 'viewer') role = 'Viewer';
    else {
      return ctx.reply('Invalid role. Use: Admin, Editor, or Viewer');
    }

    const code = randomBytes(8).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await prisma.invite.create({
      data: {
        spaceId: ctx.currentSpaceId,
        role,
        code,
        expiresAt,
        createdBy: ctx.user.id,
      },
    });

    await ctx.reply(`Invite code created!\n\nCode: ${code}\nRole: ${role}\nExpires: ${expiresAt.toLocaleString()}`);
  });

  bot.command('invite_use', ensureUser, async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const code = args?.[0];

    if (!code || !ctx.user) {
      const lang = await getUserLanguage(ctx.user?.id || BigInt(0));
      const text = lang === 'ru'
        ? 'Использование: /invite_use <код>'
        : 'Usage: /invite_use <code>';
      return ctx.reply(text);
    }

    const lang = await getUserLanguage(ctx.user.id);
    const invite = await prisma.invite.findUnique({
      where: { code },
      include: { space: true },
    });

    if (!invite) {
      const text = lang === 'ru'
        ? '❌ Неверный код приглашения.'
        : '❌ Invalid invite code.';
      return ctx.reply(text);
    }

    if (invite.expiresAt < new Date()) {
      const text = lang === 'ru'
        ? '⏰ Этот код приглашения истёк.'
        : '⏰ This invite code has expired.';
      return ctx.reply(text);
    }

    const existingMember = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: invite.spaceId,
          userId: ctx.user.id,
        },
      },
    });

    if (existingMember) {
      const text = lang === 'ru'
        ? 'ℹ️ Вы уже являетесь участником этого пространства.'
        : 'ℹ️ You are already a member of this space.';
      return ctx.reply(text);
    }

    await prisma.spaceMember.create({
      data: {
        spaceId: invite.spaceId,
        userId: ctx.user.id,
        role: invite.role,
      },
    });

    await prisma.userSpaceStats.upsert({
      where: {
        spaceId_userId: {
          spaceId: invite.spaceId,
          userId: ctx.user.id,
        },
      },
      create: {
        spaceId: invite.spaceId,
        userId: ctx.user.id,
        totalXp: 0,
        level: 1,
      },
      update: {},
    });

    setCurrentSpace(ctx.user.id, invite.spaceId);
    ctx.currentSpaceId = invite.spaceId;

    const roleEmoji = invite.role === 'Admin' ? '👑' : invite.role === 'Editor' ? '✏️' : '👁️';
    const text = lang === 'ru'
      ? `✅ *Вы присоединились к пространству!*\n\n🏷️ *${invite.space.name}*\n${roleEmoji} *Роль:* ${invite.role}`
      : `✅ *You joined the space!*\n\n🏷️ *${invite.space.name}*\n${roleEmoji} *Role:* ${invite.role}`;

    await ctx.reply(text, { parse_mode: 'Markdown' });
  });

  bot.command('members', ensureUser, requireSpace, async (ctx) => {
    if (!ctx.currentSpaceId) return;

    const members = await prisma.spaceMember.findMany({
      where: { spaceId: ctx.currentSpaceId },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });

    const membersList = members
      .map((m) => `- ${m.user.firstName || m.user.username || 'Unknown'} (@${m.user.username || 'no username'}) - ${m.role}`)
      .join('\n');

    await ctx.reply(`Members:\n\n${membersList}`);
  });

  bot.command('member_role', ensureUser, requireSpace, requireRole('Admin'), async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const username = args?.[0]?.replace('@', '');
    const roleStr = args?.[1]?.toLowerCase();

    if (!username || !roleStr || !ctx.currentSpaceId) {
      return ctx.reply('Usage: /member_role <username> <role>');
    }

    let role: Role;
    if (roleStr === 'admin') role = 'Admin';
    else if (roleStr === 'editor') role = 'Editor';
    else if (roleStr === 'viewer') role = 'Viewer';
    else {
      return ctx.reply('Invalid role. Use: Admin, Editor, or Viewer');
    }

    const targetUser = await prisma.telegramUser.findFirst({
      where: { username },
    });

    if (!targetUser) {
      return ctx.reply('User not found.');
    }

    const member = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: ctx.currentSpaceId,
          userId: targetUser.id,
        },
      },
    });

    if (!member) {
      return ctx.reply('User is not a member of this space.');
    }

    await prisma.spaceMember.update({
      where: {
        spaceId_userId: {
          spaceId: ctx.currentSpaceId,
          userId: targetUser.id,
        },
      },
      data: { role },
    });

    await ctx.reply(`Role updated: ${username} is now ${role}`);
  });

  bot.command('member_kick', ensureUser, requireSpace, requireRole('Admin'), async (ctx) => {
    const args = ctx.message?.text?.split(' ').slice(1);
    const username = args?.[0]?.replace('@', '');

    if (!username || !ctx.currentSpaceId || !ctx.user) {
      return ctx.reply('Usage: /member_kick <username>');
    }

    const targetUser = await prisma.telegramUser.findFirst({
      where: { username },
    });

    if (!targetUser) {
      return ctx.reply('User not found.');
    }

    if (targetUser.id === ctx.user.id) {
      return ctx.reply('You cannot kick yourself.');
    }

    const member = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: ctx.currentSpaceId,
          userId: targetUser.id,
        },
      },
    });

    if (!member) {
      return ctx.reply('User is not a member of this space.');
    }

    await prisma.spaceMember.delete({
      where: {
        spaceId_userId: {
          spaceId: ctx.currentSpaceId,
          userId: targetUser.id,
        },
      },
    });

    await ctx.reply(`User ${username} has been removed from the space.`);
  });

  // Callback handler для меню
  bot.callbackQuery('members:list', ensureUser, requireSpace, async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) {
      await ctx.answerCallbackQuery({ text: 'Error' });
      return;
    }

    const lang = await getUserLanguage(ctx.user.id);
    const members = await prisma.spaceMember.findMany({
      where: { spaceId: ctx.currentSpaceId },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });

    const membersList = members
      .map((m: any) => {
        const roleEmoji = m.role === 'Admin' ? '👑' : m.role === 'Editor' ? '✏️' : '👁️';
        const name = m.user.firstName || m.user.username || (lang === 'ru' ? 'Неизвестно' : 'Unknown');
        const username = m.user.username ? `@${m.user.username}` : '';
        return `${roleEmoji} *${name}* ${username}\n   ${m.role}`;
      })
      .join('\n\n');

    const text = lang === 'ru'
      ? `👥 *Участники пространства*\n\n${membersList}\n\n_Всего: ${members.length}_`
      : `👥 *Space Members*\n\n${membersList}\n\n_Total: ${members.length}_`;

    await ctx.editMessageText(text, {
      reply_markup: getMembersMenu(lang),
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });

  // Callback для приглашения пользователей
  bot.callbackQuery('members:invite', ensureUser, requireSpace, requireRole('Admin'), async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) {
      await ctx.answerCallbackQuery({ text: 'Error' });
      return;
    }

    const lang = await getUserLanguage(ctx.user.id);
    const text = lang === 'ru'
      ? '👥 *Создание приглашения*\n\nВыберите роль для приглашения:'
      : '👥 *Create Invite*\n\nSelect role for the invite:';

    const keyboard = new InlineKeyboard()
      .text('👑 Admin', 'invite:create:Admin')
      .text('✏️ Editor', 'invite:create:Editor')
      .text('👁️ Viewer', 'invite:create:Viewer').row()
      .text(lang === 'ru' ? '◀️ Назад' : '◀️ Back', 'members:list');

    await ctx.editMessageText(text, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });

  // Callback для создания приглашения с выбранной ролью
  bot.callbackQuery(/^invite:create:(Admin|Editor|Viewer)$/, ensureUser, requireSpace, requireRole('Admin'), async (ctx) => {
    try {
      if (!ctx.user || !ctx.currentSpaceId) {
        const lang = await getUserLanguage(ctx.user?.id || BigInt(0));
        const errorText = lang === 'ru' ? 'Ошибка: пространство не найдено' : 'Error: space not found';
        await ctx.answerCallbackQuery({ text: errorText });
        return;
      }

      const role = ctx.match[1] as Role;
      const lang = await getUserLanguage(ctx.user.id);

      const code = randomBytes(8).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

      await prisma.invite.create({
        data: {
          spaceId: ctx.currentSpaceId,
          role,
          code,
          expiresAt,
          createdBy: ctx.user.id,
        },
      });

      const space = await prisma.space.findUnique({
        where: { id: ctx.currentSpaceId },
      });

      if (!space) {
        const errorText = lang === 'ru' ? 'Ошибка: пространство не найдено' : 'Error: space not found';
        await ctx.answerCallbackQuery({ text: errorText });
        return;
      }

      const roleEmoji = role === 'Admin' ? '👑' : role === 'Editor' ? '✏️' : '👁️';
      const text = lang === 'ru'
        ? `✅ *Приглашение создано!*\n\n📋 *Код:* \`${code}\`\n${roleEmoji} *Роль:* ${role}\n⏰ *Действительно до:* ${expiresAt.toLocaleString('ru-RU')}\n\n💬 *Отправьте этот код пользователю или используйте команду:*\n/invite_use ${code}`
        : `✅ *Invite Created!*\n\n📋 *Code:* \`${code}\`\n${roleEmoji} *Role:* ${role}\n⏰ *Expires:* ${expiresAt.toLocaleString()}\n\n💬 *Send this code to the user or use command:*\n/invite_use ${code}`;

      const keyboard = new InlineKeyboard()
        .text(lang === 'ru' ? '◀️ Назад' : '◀️ Back', 'members:list');

      await ctx.editMessageText(text, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
      await ctx.answerCallbackQuery({ text: lang === 'ru' ? 'Создано' : 'Created' });
    } catch (error) {
      const lang = await getUserLanguage(ctx.user?.id || BigInt(0));
      const errorText = lang === 'ru' ? 'Ошибка при создании приглашения' : 'Error creating invite';
      await ctx.answerCallbackQuery({ text: errorText });
      console.error('Error creating invite:', error);
    }
  });
}