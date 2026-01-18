import './LoadingScreen.css';

type LoadingScreenProps = {
  text?: string;
};

export default function LoadingScreen({ text = 'Загрузка...' }: LoadingScreenProps) {
  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-screen__bottom">
        <div className="loading-screen__text">{text}</div>
        <div className="loading-screen__bar" aria-hidden="true">
          <div className="loading-screen__barFill" />
        </div>
      </div>
    </div>
  );
}

