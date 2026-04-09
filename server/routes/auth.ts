import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../services/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { encryptKey, getDecryptedKey } from '../services/crypto.js';
import { GoogleGenAI } from '@google/genai';
import { generateContentWithRetry } from '../services/ai.js';
import { AI_CONFIG } from '../config/ai.js';

import { logger } from '../services/logger.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-dev';

router.get('/url', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(400).json({ error: 'Google OAuth Client ID is not configured in AI Studio Secrets.' });
  }
  const redirectUri = `${process.env.APP_URL}/auth/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent'
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.APP_URL}/auth/callback`;

  if (!clientId || !clientSecret) {
    return res.status(500).send('OAuth credentials not configured');
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userRes.json();

    let user = await prisma.user.findUnique({ where: { email: userData.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          analysisModel: AI_CONFIG.defaults.models.analysis,
          improvementModel: AI_CONFIG.defaults.models.improvement,
          testModel: AI_CONFIG.defaults.models.test
        }
      });
      logger.info('New user created with default AI settings', { email: user.email });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, picture: user.picture },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('OAuth error:', error);
    res.status(500).send(`Authentication failed: ${error.message}`);
  }
});

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  console.log('Register attempt for:', email);
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    console.log('Hashing password for:', email);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Creating user in DB:', email);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
    });

    console.log('User created successfully:', user.id);

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, picture: user.picture },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt for:', email);
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      console.log('User not found or no password:', email);
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    console.log('Comparing password for:', email);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for:', email);
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    console.log('Login successful for:', email);

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, picture: user.picture },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', requireAuth, async (req: any, res) => {
  const user = await prisma.user.findUnique({ 
    where: { id: req.user.id },
    include: { apiKeys: true }
  });
  
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hasGeminiKey = user.apiKeys.some((k: any) => k.provider === 'google');
  const hasOllamaKey = user.apiKeys.some((k: any) => k.provider === 'ollama');
  
  res.json({ 
    id: user.id, 
    email: user.email, 
    name: user.name, 
    picture: user.picture, 
    hasGeminiKey, 
    hasOllamaKey,
    testProvider: user.testProvider,
    testModel: user.testModel,
    analysisProvider: user.analysisProvider,
    analysisModel: user.analysisModel,
    improvementProvider: user.improvementProvider,
    improvementModel: user.improvementModel
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'none' });
  res.json({ success: true });
});

router.get('/keys', requireAuth, async (req: any, res) => {
  const googleKey = await getDecryptedKey(req.user.id, 'google');
  const ollamaKey = await getDecryptedKey(req.user.id, 'ollama');
  res.json({ google: googleKey, ollama: ollamaKey });
});

router.post('/test-key', requireAuth, async (req: any, res) => {
  const { provider, key } = req.body;
  try {
    if (provider === 'google') {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      const model = user?.testModel;

      if (!model) {
        return res.status(400).json({ error: 'Модель для теста не выбрана в настройках' });
      }

      logger.info('Testing Google API key', { model });
      const response = await generateContentWithRetry(key, {
        model: model,
        contents: 'Say "ok"',
        config: {
          thinkingConfig: { thinkingLevel: AI_CONFIG.defaults.thinkingLevels.keyTest }
        }
      });
      return res.json({ success: !!response.text });
    } else if (provider === 'ollama') {
      logger.info('Testing Ollama API key');
      // Simple health check for Ollama Cloud if we have an endpoint
      const response = await fetch('https://api.ollama.com/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      logger.info('Ollama API key test result', { status: response.status, ok: response.ok });
      return res.json({ success: response.ok });
    }
    res.status(400).json({ error: 'Unsupported provider' });
  } catch (error: any) {
    console.error('API Key test failed:', error);
    res.json({ success: false, error: error.message });
  }
});

router.post('/settings', requireAuth, async (req: any, res) => {
  const { 
    geminiKey, 
    ollamaKey,
    testProvider,
    testModel,
    analysisProvider,
    analysisModel,
    improvementProvider,
    improvementModel
  } = req.body;
  
  const updateKey = async (provider: string, key: string | undefined) => {
    if (key === undefined) return;
    if (key === '') {
      await prisma.apiKey.deleteMany({ where: { userId: req.user.id, provider } });
      return;
    }
    const { encryptedKey, keyIv } = encryptKey(key);
    await prisma.apiKey.upsert({
      where: { userId_provider: { userId: req.user.id, provider } },
      update: { encryptedKey, keyIv },
      create: { userId: req.user.id, provider, encryptedKey, keyIv }
    });
  };

  try {
    await updateKey('google', geminiKey);
    await updateKey('ollama', ollamaKey);

    // Update user preferences
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        testProvider,
        testModel,
        analysisProvider,
        analysisModel,
        improvementProvider,
        improvementModel
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
