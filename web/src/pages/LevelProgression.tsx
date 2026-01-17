import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronLeft } from '@tabler/icons-react';
import { api } from '../api';
import './LevelProgression.css';

export default function LevelProgression() {
  const navigate = useNavigate();
  const [levelRewards, setLevelRewards] = useState<Array<{ level: number; text: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      const data = await api.getLevelRewards();
      setLevelRewards(data.rewards || []);
    } catch (error) {
      console.error('Failed to load level rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  // Генерируем список уровней от 1 до 80
  const levels = Array.from({ length: 80 }, (_, i) => i + 1);

  return (
    <div className="level-progression">
      {/* Хедер */}
      <div className="progression-header">
        <IconChevronLeft 
          size={24} 
          className="back-icon"
          onClick={() => navigate('/')}
        />
        <h1 className="progression-title">Прогрессия уровней</h1>
        <div style={{ width: 24 }} />
      </div>

      {/* Список уровней */}
      {loading ? (
        <div className="loading-state">Загрузка наград...</div>
      ) : (
        <div className="levels-list">
          {levels.map((level) => {
            const reward = levelRewards.find(r => r.level === level);
            
            return (
              <div key={level} className="level-item">
                <div className="level-number">Уровень {level}</div>
                <div className="level-reward">
                  {reward?.text || 'нет'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
