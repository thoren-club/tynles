import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from '../config';
import { logger } from '../logger';
import { setupApiRoutes } from './api';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', setupApiRoutes());

// Serve static files from web/dist in production
if (process.env.NODE_ENV === 'production') {
  const webDistPath = path.join(__dirname, '../../web/dist');
  app.use(express.static(webDistPath));
  
  // Serve index.html for all routes (SPA routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
} else {
  // In development, serve from web/dist or redirect to dev server
  app.get('*', (req, res) => {
    res.json({ message: 'Web server running. Frontend should be served separately in development.' });
  });
}

// Start server
app.listen(PORT, () => {
  logger.info(`Web server started on port ${PORT}`);
});

export default app;
