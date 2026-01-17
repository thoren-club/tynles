import { useNavigate } from 'react-router-dom';
import { IconChevronLeft } from '@tabler/icons-react';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="settings">
      {/* Хедер */}
      <div className="settings-header">
        <IconChevronLeft 
          size={24} 
          className="back-icon"
          onClick={() => navigate('/')}
        />
        <h1 className="settings-title">Настройки</h1>
        <div style={{ width: 24 }} />
      </div>

      {/* Содержимое настроек */}
      <div className="settings-content">
        <div className="settings-section">
          <h2 className="settings-section-title">Основные</h2>
          <div className="settings-placeholder">
            <div className="placeholder-text">Здесь возможно будет…</div>
          </div>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Уведомления</h2>
          <div className="settings-placeholder">
            <div className="placeholder-text">Здесь возможно будет…</div>
          </div>
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
