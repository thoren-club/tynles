import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './api';
import Dashboard from './pages/Dashboard';
import Spaces from './pages/Spaces';
import Tasks from './pages/Tasks';
import Goals from './pages/Goals';
import Stats from './pages/Stats';
import Members from './pages/Members';
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
          console.error('No Telegram init data available');
          console.error('This usually means:');
          console.error('1. Mini App not opened from Telegram');
          console.error('2. URL in BotFather is incorrect');
          console.error('3. Mini App opened in external browser instead of Telegram');
          console.log('Available WebApp properties:', Object.keys(tgWebApp));
          setLoading(false);
          return;
        }

        // Set auth header for all requests
        api.setAuthHeader(initData);

        // Verify authentication
        try {
          const user = await api.getUser();
          if (user) {
            setIsAuthenticated(true);
          }
        } catch (authError: any) {
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Please open this app from Telegram</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/spaces" element={<Spaces />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/members" element={<Members />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
