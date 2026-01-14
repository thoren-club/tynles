import { prisma } from '../db';
import { Language } from '../i18n';

export async function getUserLanguage(userId: bigint): Promise<Language> {
  const user = await prisma.telegramUser.findUnique({
    where: { id: userId },
    select: { language: true },
  });
  
  return (user?.language as Language) || 'en';
}

export async function setUserLanguage(userId: bigint, language: Language): Promise<void> {
  await prisma.telegramUser.update({
    where: { id: userId },
    data: { language },
  });
}