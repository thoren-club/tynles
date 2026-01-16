import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

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
