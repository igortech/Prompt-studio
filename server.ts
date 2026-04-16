import dotenv from 'dotenv';
import path from 'path';

const __dirname = process.cwd();
const envPath = path.resolve(__dirname, '.env');
console.log('Loading .env from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.warn('No .env file found, using default values');
} else {
  console.log('.env loaded successfully');
}

import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';

import authRoutes from './server/routes/auth.js';
import promptRoutes from './server/routes/prompts.js';
import testCaseRoutes from './server/routes/testCases.js';
import chatRoutes from './server/routes/chat.js';
import './server/cron/cleanup.js';

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/auth', authRoutes); // Handle /auth/callback from OAuth provider
  app.use('/api/prompts', promptRoutes);
  app.use('/api/test-cases', testCaseRoutes);
  app.use('/api/chat', chatRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
