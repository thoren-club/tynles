import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { logger } from '../logger';
import { setupApiRoutes } from './api';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true, // Allow all origins (Telegram can open from any domain)
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form data

// Request logging middleware
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    query: req.query,
    hasAuthHeader: !!req.headers['x-telegram-init-data'],
  }, 'Incoming request');
  next();
});

// API routes
app.use('/api', setupApiRoutes());

// Serve static files from web/dist
const webDistPath = path.join(__dirname, '../../web/dist');

// Проверяем, существует ли папка web/dist
if (fs.existsSync(webDistPath)) {
  logger.info(`Serving static files from ${webDistPath}`);
  app.use(express.static(webDistPath));
  
  // Serve index.html for all routes (SPA routing)
  // Но только для не-API маршрутов
  app.get('*', (req, res, next) => {
    // Пропускаем API маршруты
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
} else {
  logger.warn(`Static files directory not found: ${webDistPath}`);
  logger.warn('Frontend is not built. Run: cd web && npm run build');
  
  // Fallback для не-API маршрутов
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.status(404).json({ 
      error: 'Frontend not built',
      message: 'Please build frontend: cd web && npm run build'
    });
  });
}

// Start server
app.listen(PORT, () => {
  logger.info(`Web server started on port ${PORT}`);
});

export default app;
