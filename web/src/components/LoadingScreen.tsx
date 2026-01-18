import './LoadingScreen.css';
import { useLanguage } from '../contexts/LanguageContext';

type LoadingScreenProps = {
  text?: string;
};

export default function LoadingScreen({ text }: LoadingScreenProps) {
  const { t } = useLanguage();
  const label = text ?? t('common.loading');

  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-screen__bottom">
        <div className="loading-screen__text">{label}</div>
        <div className="loading-screen__bar" aria-hidden="true">
          <div className="loading-screen__barFill" />
        </div>
      </div>
    </div>
  );
}

