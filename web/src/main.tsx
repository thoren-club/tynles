import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { detectPlatform } from './utils/platform';

function hideBootSplashFallback() {
  // Primary hide logic lives in `index.html` (so it works even before JS bundles).
  // This fallback is just in case.
  (window as any).__hideBootSplash?.();
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

// Set platform attribute for platform-specific styling (navbar, etc.)
document.documentElement.dataset.platform = detectPlatform();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// As a fallback, hide after mount (real hide should happen on app:ready).
setTimeout(hideBootSplashFallback, 2500);
