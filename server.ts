import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
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
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  // Trust proxy headers from Nginx
  app.set('trust proxy', 1);

  console.log('CORS configured for origin:', appUrl);
  
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests from APP_URL and localhost for development
      const allowedOrigins = [appUrl, 'http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'];
      
      // Log CORS check
      console.log(`[CORS] Request origin: ${origin || 'undefined'}`);
      console.log(`[CORS] Allowed origins:`, allowedOrigins);
      
      // Allow if no origin (same-origin requests) or if origin is in allowed list
      if (!origin || allowedOrigins.includes(origin)) {
        console.log(`[CORS] ✅ Allowing request`);
        callback(null, true);
      } else {
        console.log(`[CORS] ❌ Blocking request from ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  app.use(express.json());
  app.use(cookieParser());
  
  // Set longer timeouts for AI operations
  app.use((req, res, next) => {
    // Set socket timeout to 5 minutes for long-running AI requests
    req.socket.setTimeout(5 * 60 * 1000);
    res.setTimeout(5 * 60 * 1000);
    next();
  });
  
  // Log all requests
  app.use((req, res, next) => {
    const cookieKeys = req.cookies ? Object.keys(req.cookies).join(', ') : 'none';
    const authHeader = req.headers.authorization ? `${req.headers.authorization.substring(0, 30)}...` : 'none';
    console.log(`[${req.method}] ${req.path}`);
    console.log(`  Origin: ${req.get('origin') || 'undefined'}`);
    console.log(`  Authorization: ${authHeader}`);
    console.log(`  Cookies: ${cookieKeys}`);
    next();
  });

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
