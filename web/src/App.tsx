import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './api';
import Dashboard from './pages/Dashboard';
import Spaces from './pages/Spaces';
import Deals from './pages/Deals';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import LevelProgression from './pages/LevelProgression';
import GoalDetail from './pages/GoalDetail';
import AllGoals from './pages/AllGoals';
import Layout from './components/Layout';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          onClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
        };
        BackButton: {
          onClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
        };
      };
    };
  }
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Wait for Telegram WebApp to load
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!window.Telegram?.WebApp && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        const tgWebApp = window.Telegram?.WebApp;
        if (!tgWebApp) {
          console.error('Telegram WebApp not available after waiting');
          console.log('window.Telegram:', window.Telegram);
          setLoading(false);
          return;
        }

        // Initialize Telegram WebApp
        tgWebApp.ready();
        tgWebApp.expand();

        // Debug: Log all available data
        console.log('Telegram WebApp object:', {
          initData: tgWebApp.initData,
          initDataLength: tgWebApp.initData?.length,
          initDataUnsafe: tgWebApp.initDataUnsafe,
        });

        // Check URL parameters (Telegram sometimes passes data via URL)
        const urlParams = new URLSearchParams(window.location.search);
        console.log('URL parameters:', Array.from(urlParams.entries()));
        console.log('Full URL:', window.location.href);

        // Get initData - try multiple sources
        let initData = tgWebApp.initData;
        
        // Wait for initData to be populated (Telegram sometimes needs a moment)
        let waitAttempts = 0;
        while ((!initData || initData === '') && waitAttempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 100));
          initData = tgWebApp.initData;
          waitAttempts++;
        }

        // Try to get from URL if still empty
        if (!initData || initData === '') {
          // Telegram sometimes passes initData in URL hash or query
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const tgData = urlParams.get('tgWebAppData') || 
                        hashParams.get('tgWebAppData') ||
                        urlParams.get('_auth');
          
          if (tgData) {
            initData = decodeURIComponent(tgData);
            console.log('Using initData from URL');
          }
        }

        console.log('Final initData:', !!initData, 'Length:', initData?.length);

        if (!initData || initData === '') {
          // Show alert in Telegram for debugging
          if (typeof (tgWebApp as any).showAlert === 'function') {
            (tgWebApp as any).showAlert('Ошибка: initData пустой. Проверьте настройки в BotFather.');
          }
          console.error('No Telegram init data available');
          console.error('This usually means:');
          console.error('1. Mini App not opened from Telegram');
          console.error('2. URL in BotFather is incorrect');
          console.error('3. Mini App opened in external browser instead of Telegram');
          console.log('Available WebApp properties:', Object.keys(tgWebApp));
          setLoading(false);
          return;
        }

        // Debug: Show initData info in Telegram (first 50 chars)
        const initDataPreview = initData.substring(0, 50) + (initData.length > 50 ? '...' : '');
        console.log('initData preview:', initDataPreview);

        // Set auth header for all requests
        api.setAuthHeader(initData);

        // Verify authentication
        try {
          const user = await api.getUser();
          if (user) {
            setIsAuthenticated(true);
          }
        } catch (authError: any) {
          // Show detailed error in Telegram
          const errorMsg = authError.message || 'Authentication failed';
          if (typeof (tgWebApp as any).showAlert === 'function') {
            (tgWebApp as any).showAlert(`Ошибка аутентификации: ${errorMsg}\n\ninitData длина: ${initData.length}`);
          }
          console.error('Auth verification error:', authError);
          console.error('Auth verification error:', authError);
          // Try to get more info about the error
          if (authError.message) {
            console.error('Error message:', authError.message);
          }
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2>Authentication Required</h2>
          <p style={{ color: '#666', maxWidth: '400px' }}>
            Please open this app from Telegram to continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/spaces" element={<Spaces />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/level-progression" element={<LevelProgression />} />
          <Route path="/goal/:id" element={<GoalDetail />} />
          <Route path="/all-goals" element={<AllGoals />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
