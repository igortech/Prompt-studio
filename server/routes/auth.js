"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_js_1 = __importDefault(require("../services/prisma.js"));
const auth_js_1 = require("../middleware/auth.js");
const crypto_js_1 = require("../services/crypto.js");
const ai_js_1 = require("../services/ai.js");
const ai_js_2 = require("../config/ai.js");
const logger_js_1 = require("../services/logger.js");
const router = express_1.default.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-dev';
router.get('/url', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        return res.status(400).json({ error: 'Google OAuth Client ID is not configured in AI Studio Secrets.' });
    }
    const redirectUri = `${process.env.APP_URL}/auth/callback`;
    console.log('DEBUG: APP_URL =', process.env.APP_URL);
    console.log('DEBUG: redirectUri =', redirectUri);
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
    console.log('DEBUG callback: APP_URL =', process.env.APP_URL);
    console.log('DEBUG callback: redirectUri =', redirectUri);
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
                code: code,
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
        let user = await prisma_js_1.default.user.findUnique({ where: { email: userData.email } });
        if (!user) {
            user = await prisma_js_1.default.user.create({
                data: {
                    email: userData.email,
                    name: userData.name,
                    picture: userData.picture,
                    analysisModel: ai_js_2.AI_CONFIG.defaults.models.analysis,
                    improvementModel: ai_js_2.AI_CONFIG.defaults.models.improvement,
                    testModel: ai_js_2.AI_CONFIG.defaults.models.test
                }
            });
            logger_js_1.logger.info('New user created with default AI settings', { email: user.email });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, name: user.name, picture: user.picture }, JWT_SECRET, { expiresIn: '7d' });
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
    }
    catch (error) {
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
        const existingUser = await prisma_js_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            console.log('User already exists:', email);
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }
        console.log('Hashing password for:', email);
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        console.log('Creating user in DB:', email);
        const user = await prisma_js_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                name
            }
        });
        console.log('User created successfully:', user.id);
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, name: user.name, picture: user.picture }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } });
    }
    catch (error) {
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
        const user = await prisma_js_1.default.user.findUnique({ where: { email } });
        if (!user || !user.password) {
            console.log('User not found or no password:', email);
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        console.log('Comparing password for:', email);
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            console.log('Password mismatch for:', email);
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        console.log('Login successful for:', email);
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, name: user.name, picture: user.picture }, JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/me', auth_js_1.requireAuth, async (req, res) => {
    const user = await prisma_js_1.default.user.findUnique({
        where: { id: req.user.id },
        include: { apiKeys: true }
    });
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    const hasGeminiKey = user.apiKeys.some((k) => k.provider === 'google');
    const hasOllamaKey = user.apiKeys.some((k) => k.provider === 'ollama');
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
router.get('/keys', auth_js_1.requireAuth, async (req, res) => {
    const googleKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google');
    const ollamaKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'ollama');
    res.json({ google: googleKey, ollama: ollamaKey });
});
router.post('/test-key', auth_js_1.requireAuth, async (req, res) => {
    const { provider, key } = req.body;
    try {
        if (provider === 'google') {
            const user = await prisma_js_1.default.user.findUnique({ where: { id: req.user.id } });
            const model = user?.testModel;
            if (!model) {
                return res.status(400).json({ error: 'Модель для теста не выбрана в настройках' });
            }
            logger_js_1.logger.info('Testing Google API key', { model });
            const response = await (0, ai_js_1.generateContentWithRetry)(key, {
                model: model,
                contents: 'Say "ok"',
                config: {
                    thinkingConfig: { thinkingLevel: ai_js_2.AI_CONFIG.defaults.thinkingLevels.keyTest }
                }
            });
            return res.json({ success: !!response.text });
        }
        else if (provider === 'ollama') {
            logger_js_1.logger.info('Testing Ollama API key');
            // Simple health check for Ollama Cloud if we have an endpoint
            const response = await fetch('https://api.ollama.com/v1/models', {
                headers: { 'Authorization': `Bearer ${key}` }
            });
            logger_js_1.logger.info('Ollama API key test result', { status: response.status, ok: response.ok });
            return res.json({ success: response.ok });
        }
        res.status(400).json({ error: 'Unsupported provider' });
    }
    catch (error) {
        console.error('API Key test failed:', error);
        res.json({ success: false, error: error.message });
    }
});
router.post('/settings', auth_js_1.requireAuth, async (req, res) => {
    const { geminiKey, ollamaKey, testProvider, testModel, analysisProvider, analysisModel, improvementProvider, improvementModel } = req.body;
    const updateKey = async (provider, key) => {
        if (key === undefined)
            return;
        if (key === '') {
            await prisma_js_1.default.apiKey.deleteMany({ where: { userId: req.user.id, provider } });
            return;
        }
        const { encryptedKey, keyIv } = (0, crypto_js_1.encryptKey)(key);
        await prisma_js_1.default.apiKey.upsert({
            where: { userId_provider: { userId: req.user.id, provider } },
            update: { encryptedKey, keyIv },
            create: { userId: req.user.id, provider, encryptedKey, keyIv }
        });
    };
    try {
        await updateKey('google', geminiKey);
        await updateKey('ollama', ollamaKey);
        // Update user preferences
        await prisma_js_1.default.user.update({
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
