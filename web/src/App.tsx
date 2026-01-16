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
        // Get initData from Telegram WebApp
        // Telegram provides initData as a string in window.Telegram.WebApp.initData
        const tgWebApp = window.Telegram?.WebApp;
        if (!tgWebApp) {
          console.error('Telegram WebApp not available');
          setLoading(false);
          return;
        }

        const initData = tgWebApp.initData;
        if (!initData) {
          console.error('No Telegram init data');
          setLoading(false);
          return;
        }

        // Set auth header for all requests
        api.setAuthHeader(initData);

        // Verify authentication
        const user = await api.getUser();
        if (user) {
          setIsAuthenticated(true);
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
