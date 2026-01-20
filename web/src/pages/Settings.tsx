import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../api';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const { language, setLanguage, t, tr } = useLanguage();
  const [notificationSettings, setNotificationSettings] = useState<{
    taskRemindersEnabled: boolean;
    reminderHoursBefore: number;
    pokeEnabled: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg?.BackButton) return;
    const handleBack = () => navigate(-1);
    try {
      tg.BackButton.show();
      tg.BackButton.onClick(handleBack);
    } catch {
      // no-op
    }
    return () => {
      try {
        tg.BackButton.offClick(handleBack);
        tg.BackButton.hide();
      } catch {
        // no-op
      }
    };
  }, [navigate]);

  const loadNotificationSettings = async () => {
    try {
      const settings = await api.getNotificationSettings();
      setNotificationSettings(settings);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReminders = async () => {
    if (!notificationSettings) return;
    
    const newValue = !notificationSettings.taskRemindersEnabled;
    try {
      await api.updateNotificationSettings({ taskRemindersEnabled: newValue });
      setNotificationSettings({ ...notificationSettings, taskRemindersEnabled: newValue });
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      alert(tr('Не удалось обновить настройки', 'Failed to update settings'));
    }
  };

  const handleTogglePoke = async () => {
    if (!notificationSettings) return;
    
    const newValue = !notificationSettings.pokeEnabled;
    try {
      await api.updateNotificationSettings({ pokeEnabled: newValue });
      setNotificationSettings({ ...notificationSettings, pokeEnabled: newValue });
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      alert(tr('Не удалось обновить настройки', 'Failed to update settings'));
    }
  };

  const handleReminderHoursChange = async (hours: number) => {
    if (!notificationSettings) return;
    
    try {
      await api.updateNotificationSettings({ reminderHoursBefore: hours });
      setNotificationSettings({ ...notificationSettings, reminderHoursBefore: hours });
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      alert(tr('Не удалось обновить настройки', 'Failed to update settings'));
    }
  };

  return (
    <div className="settings">
      {/* Хедер */}
      <div className="settings-header">
        <h1 className="settings-title">{t('settings.title')}</h1>
      </div>

      {/* Содержимое настроек */}
      <div className="settings-content">
        <div className="settings-section">
          <h2 className="settings-section-title">{t('settings.general')}</h2>
          <div className="settings-card">
            <div className="settings-item">
              <div className="settings-item-label">{t('settings.language')}</div>
              <div className="language-switcher">
                <button
                  className={`language-button ${language === 'ru' ? 'active' : ''}`}
                  onClick={() => setLanguage('ru')}
                >
                  Русский
                </button>
                <button
                  className={`language-button ${language === 'en' ? 'active' : ''}`}
                  onClick={() => setLanguage('en')}
                >
                  English
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">{t('settings.notifications')}</h2>
          
          {loading ? (
            <div className="settings-card">
              <div className="settings-placeholder">
                <div className="placeholder-text">{t('common.loading')}</div>
              </div>
            </div>
          ) : notificationSettings ? (
            <div className="settings-card">
              <div className="settings-item">
                <div className="settings-item-label">
                  {tr('Напоминания о задачах', 'Task reminders')}
                </div>
                <button
                  className={`toggle-button ${notificationSettings.taskRemindersEnabled ? 'active' : ''}`}
                  onClick={handleToggleReminders}
                >
                  {notificationSettings.taskRemindersEnabled
                    ? tr('Включено', 'On')
                    : tr('Выключено', 'Off')}
                </button>
              </div>

              {notificationSettings.taskRemindersEnabled && (
                <div className="settings-item">
                  <div className="settings-item-label">
                    {tr('Напоминать за (часов до дедлайна)', 'Remind (hours before deadline)')}
                  </div>
                  <select
                    className="settings-select"
                    value={notificationSettings.reminderHoursBefore}
                    onChange={(e) => handleReminderHoursChange(parseInt(e.target.value))}
                  >
                    <option value={1}>{tr('1 час', '1 hour')}</option>
                    <option value={2}>{tr('2 часа', '2 hours')}</option>
                    <option value={6}>{tr('6 часов', '6 hours')}</option>
                    <option value={12}>{tr('12 часов', '12 hours')}</option>
                    <option value={24}>{tr('24 часа', '24 hours')}</option>
                  </select>
                </div>
              )}

              <div className="settings-item">
                <div className="settings-item-label">
                  {tr('Разрешить другим пользователям "пнуть" меня', 'Allow other users to poke me')}
                </div>
                <button
                  className={`toggle-button ${notificationSettings.pokeEnabled ? 'active' : ''}`}
                  onClick={handleTogglePoke}
                >
                  {notificationSettings.pokeEnabled
                    ? tr('Включено', 'On')
                    : tr('Выключено', 'Off')}
                </button>
              </div>
            </div>
          ) : (
            <div className="settings-card">
              <div className="settings-placeholder">
                <div className="placeholder-text">{tr('Не удалось загрузить настройки', 'Failed to load settings')}</div>
              </div>
            </div>
          )}
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">{t('settings.security')}</h2>
          <div className="settings-card">
            <div className="settings-placeholder">
              <div className="placeholder-text">{tr('Здесь возможно будет…', 'Coming soon…')}</div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">{t('settings.about')}</h2>
          <div className="settings-card">
            <div className="settings-placeholder">
              <div className="placeholder-text">{tr('Здесь возможно будет…', 'Coming soon…')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
