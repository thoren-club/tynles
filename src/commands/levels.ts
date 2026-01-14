import { prisma } from '../db';
import { AuthContext, ensureUser, requireSpace } from '../middleware/auth';
import { Bot, InlineKeyboard } from 'grammy';
import { getXpProgress, getProgressBar } from '../utils/xp';
import { t } from '../i18n';
import { getUserLanguage, setUserLanguage } from '../utils/language';
import { Language } from '../i18n';
import { getStatsMenu, getSettingsMenu } from '../menu';

export function setupLevelCommands(bot: Bot<AuthContext>) {
  bot.command('me', ensureUser, requireSpace, async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) return;

    const lang = await getUserLanguage(ctx.user.id);
    const stats = await prisma.userSpaceStats.findUnique({
      where: {
        spaceId_userId: {
          spaceId: ctx.currentSpaceId,
          userId: ctx.user.id,
        },
      },
    });

    if (!stats) {
      return ctx.reply(t(lang, 'stats.notFound'));
    }

    const progress = getXpProgress(stats.totalXp);

    const message = `${t(lang, 'stats.yourStats')}
${t(lang, 'stats.level')} ${stats.level}
${t(lang, 'stats.totalXp')} ${stats.totalXp}
${t(lang, 'stats.progress')} ${progress.current}/${progress.current + progress.next} (${progress.progress}%)`;

    await ctx.reply(message);
  });

  bot.command('language', ensureUser, async (ctx) => {
    if (!ctx.user) return;
    
    const lang = await getUserLanguage(ctx.user.id);
    const keyboard = new InlineKeyboard()
      .text(lang === 'en' ? '✓ English' : 'English', 'lang_en')
      .text(lang === 'ru' ? '✓ Русский' : 'Русский', 'lang_ru');

    await ctx.reply('Choose language / Выберите язык:', { reply_markup: keyboard });
  });

  bot.callbackQuery(/^lang_(en|ru)$/, ensureUser, async (ctx) => {
    if (!ctx.user) return;
    
    const lang = ctx.match[1] as Language;
    await setUserLanguage(ctx.user.id, lang);
    
    await ctx.answerCallbackQuery();
    const text = lang === 'ru' 
      ? '✅ *Язык изменён на русский*'
      : '✅ *Language changed to English*';
    await ctx.editMessageText(text, {
      reply_markup: getSettingsMenu(lang),
      parse_mode: 'Markdown'
    });
  });

  // Callback для настроек языка
  bot.callbackQuery('settings:language', ensureUser, async (ctx) => {
    if (!ctx.user) {
      await ctx.answerCallbackQuery({ text: 'Error' });
      return;
    }
    
    const lang = await getUserLanguage(ctx.user.id);
    const keyboard = new InlineKeyboard()
      .text(lang === 'en' ? '✓ English' : 'English', 'lang_en')
      .text(lang === 'ru' ? '✓ Русский' : 'Русский', 'lang_ru').row()
      .text(lang === 'ru' ? '◀️ Назад' : '◀️ Back', 'menu:settings');

    const text = lang === 'ru'
      ? '🌐 *Выбор языка*\n\nВыберите язык интерфейса:'
      : '🌐 *Language Selection*\n\nChoose interface language:';
    
    await ctx.editMessageText(text, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    await ctx.answerCallbackQuery();
  });

  // Callback для кнопки "Моя статистика"
  bot.callbackQuery('stats:me', ensureUser, requireSpace, async (ctx) => {
    if (!ctx.user || !ctx.currentSpaceId) {
      await ctx.answerCallbackQuery({ text: 'Error' });
      return;
    }

    const lang = await getUserLanguage(ctx.user.id);
    const stats = await prisma.userSpaceStats.findUnique({
      where: {
        spaceId_userId: {
          spaceId: ctx.currentSpaceId,
          userId: ctx.user.id,
        },
      },
    });

    if (!stats) {
      await ctx.answerCallbackQuery({ text: t(lang, 'stats.notFound') });
      return;
    }

    const progress = getXpProgress(stats.totalXp);
    const message = `${t(lang, 'stats.yourStats')}
${t(lang, 'stats.level')} ${stats.level}
${t(lang, 'stats.totalXp')} ${stats.totalXp}
${t(lang, 'stats.progress')} ${progress.current}/${progress.current + progress.next} (${progress.progress}%)`;

    await ctx.editMessageText(message, {
      reply_markup: getStatsMenu(lang),
    });
    await ctx.answerCallbackQuery();
  });

  const showLeaderboard = async (ctx: any, edit: boolean = false) => {
    if (!ctx.user || !ctx.currentSpaceId) return;

    const lang = await getUserLanguage(ctx.user.id);
    const stats = await prisma.userSpaceStats.findMany({
      where: { spaceId: ctx.currentSpaceId },
      include: { user: true },
      orderBy: { totalXp: 'desc' },
      take: 10,
    });

    if (stats.length === 0) {
      const message = t(lang, 'leaderboard.noStats');
      if (edit) {
        await ctx.editMessageText(message);
      } else {
        await ctx.reply(message);
      }
      return;
    }

    const leaderboard = stats
      .map((s: any, idx: number) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        const name = s.user.firstName || s.user.username || (lang === 'ru' ? 'Неизвестно' : 'Unknown');
        return `${medal} ${name} - ${t(lang, 'stats.level')} ${s.level} (${s.totalXp} XP)`;
      })
      .join('\n');

    const message = `${t(lang, 'leaderboard.title')}\n\n${leaderboard}`;
    if (edit) {
      await ctx.editMessageText(message, {
        reply_markup: getStatsMenu(lang),
      });
    } else {
      await ctx.reply(message, {
        reply_markup: getStatsMenu(lang),
      });
    }
  };

  bot.command('leaderboard', ensureUser, requireSpace, async (ctx) => {
    await showLeaderboard(ctx, false);
  });

  bot.callbackQuery('stats:leaderboard', ensureUser, requireSpace, async (ctx) => {
    await showLeaderboard(ctx, true);
    await ctx.answerCallbackQuery();
  });
}