/**
 * Определение роли пользователя
 * Роли: разработчик (developer), премиум (premium), обычный (regular)
 */

export enum UserRole {
  REGULAR = 'обычный',
  PREMIUM = 'премиум',
  DEVELOPER = 'разработчик',
}

/**
 * Получает роль пользователя
 * TODO: После миграции получать из TelegramUser.userRole
 * Пока используем логику на основе tgId (для разработчиков)
 */
export function getUserRole(tgId: bigint): UserRole {
  // Список ID разработчиков (можно вынести в конфиг)
  const DEVELOPER_IDS: bigint[] = [];
  // TODO: После миграции БД получать роль из TelegramUser.userRole
  
  // Проверка на разработчика
  if (DEVELOPER_IDS.includes(tgId)) {
    return UserRole.DEVELOPER;
  }
  
  // TODO: Проверка на премиум (можно через поле isPremium или отдельную таблицу подписок)
  // const isPremium = await checkPremiumStatus(tgId);
  // if (isPremium) {
  //   return UserRole.PREMIUM;
  // }
  
  // По умолчанию - обычный пользователь
  return UserRole.REGULAR;
}

/**
 * Получает название роли на русском
 */
export function getUserRoleName(role: UserRole): string {
  return role;
}

/**
 * Получает описание роли
 */
export function getUserRoleDescription(role: UserRole): string {
  switch (role) {
    case UserRole.DEVELOPER:
      return 'Уникальный вариант для разработчиков';
    case UserRole.PREMIUM:
      return 'Платный вариант с расширенными возможностями';
    case UserRole.REGULAR:
      return 'Обычный пользователь';
    default:
      return 'Обычный пользователь';
  }
}
