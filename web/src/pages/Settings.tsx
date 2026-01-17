import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronLeft } from '@tabler/icons-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../api';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [notificationSettings, setNotificationSettings] = useState<{
    taskRemindersEnabled: boolean;
    reminderHoursBefore: number;
    pokeEnabled: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotificationSettings();
  }, []);

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
      alert('Не удалось обновить настройки');
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
      alert('Не удалось обновить настройки');
    }
  };

  const handleReminderHoursChange = async (hours: number) => {
    if (!notificationSettings) return;
    
    try {
      await api.updateNotificationSettings({ reminderHoursBefore: hours });
      setNotificationSettings({ ...notificationSettings, reminderHoursBefore: hours });
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      alert('Не удалось обновить настройки');
    }
  };

  return (
    <div className="settings">
      {/* Хедер */}
      <div className="settings-header">
        <IconChevronLeft 
          size={24} 
          className="back-icon"
          onClick={() => navigate('/')}
        />
        <h1 className="settings-title">{t('settings.title')}</h1>
        <div style={{ width: 24 }} />
      </div>

      {/* Содержимое настроек */}
      <div className="settings-content">
        <div className="settings-section">
          <h2 className="settings-section-title">{t('settings.general')}</h2>
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

        <div className="settings-section">
          <h2 className="settings-section-title">{t('settings.notifications')}</h2>
          
          {loading ? (
            <div className="settings-placeholder">
              <div className="placeholder-text">Загрузка...</div>
            </div>
          ) : notificationSettings ? (
            <>
              <div className="settings-item">
                <div className="settings-item-label">
                  Напоминания о задачах
                </div>
                <button
                  className={`toggle-button ${notificationSettings.taskRemindersEnabled ? 'active' : ''}`}
                  onClick={handleToggleReminders}
                >
                  {notificationSettings.taskRemindersEnabled ? 'Включено' : 'Выключено'}
                </button>
              </div>

              {notificationSettings.taskRemindersEnabled && (
                <div className="settings-item">
                  <div className="settings-item-label">
                    Напоминать за (часов до дедлайна)
                  </div>
                  <select
                    className="settings-select"
                    value={notificationSettings.reminderHoursBefore}
                    onChange={(e) => handleReminderHoursChange(parseInt(e.target.value))}
                  >
                    <option value={1}>1 час</option>
                    <option value={2}>2 часа</option>
                    <option value={6}>6 часов</option>
                    <option value={12}>12 часов</option>
                    <option value={24}>24 часа</option>
                  </select>
                </div>
              )}

              <div className="settings-item">
                <div className="settings-item-label">
                  Разрешить другим пользователям "пнуть" меня
                </div>
                <button
                  className={`toggle-button ${notificationSettings.pokeEnabled ? 'active' : ''}`}
                  onClick={handleTogglePoke}
                >
                  {notificationSettings.pokeEnabled ? 'Включено' : 'Выключено'}
                </button>
              </div>
            </>
          ) : (
            <div className="settings-placeholder">
              <div className="placeholder-text">Не удалось загрузить настройки</div>
            </div>
          )}
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Безопасность</h2>
          <div className="settings-placeholder">
            <div className="placeholder-text">Здесь возможно будет…</div>
          </div>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">О приложении</h2>
          <div className="settings-placeholder">
            <div className="placeholder-text">Здесь возможно будет…</div>
          </div>
        </div>
      </div>
    </div>
  );
}
