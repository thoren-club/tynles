import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

function hideBootSplash() {
  const el = document.getElementById('boot-splash');
  if (!el) return;
  el.classList.add('hide');
  window.setTimeout(() => el.remove(), 260);
}

// Initialize Telegram WebApp when it loads
const initTelegramWebApp = () => {
  if (window.Telegram?.WebApp) {
    try {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      console.log('Telegram WebApp initialized');
    } catch (error) {
      console.error('Error initializing Telegram WebApp:', error);
    }
  }
};

// Try immediately
initTelegramWebApp();

// Also try after a short delay in case script loads later
setTimeout(initTelegramWebApp, 100);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Once React is mounted, remove the first-paint splash.
hideBootSplash();
