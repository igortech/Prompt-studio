"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var jsonwebtoken_1 = require("jsonwebtoken");
var bcryptjs_1 = require("bcryptjs");
var client_1 = require("@prisma/client");
var auth_js_1 = require("../middleware/auth.js");
var crypto_js_1 = require("../services/crypto.js");
var router = express_1.default.Router();
var prisma = new client_1.PrismaClient();
var JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-dev';
router.get('/url', function (req, res) {
    var clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        return res.status(400).json({ error: 'Google OAuth Client ID is not configured in AI Studio Secrets.' });
    }
    var redirectUri = "".concat(process.env.APP_URL, "/auth/callback");
    var params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent'
    });
    res.json({ url: "https://accounts.google.com/o/oauth2/v2/auth?".concat(params) });
});
router.get('/callback', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var code, clientId, clientSecret, redirectUri, tokenRes, tokenData, userRes, userData, user, token, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                code = req.query.code;
                clientId = process.env.GOOGLE_CLIENT_ID;
                clientSecret = process.env.GOOGLE_CLIENT_SECRET;
                redirectUri = "".concat(process.env.APP_URL, "/auth/callback");
                if (!clientId || !clientSecret) {
                    return [2 /*return*/, res.status(500).send('OAuth credentials not configured')];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 9, , 10]);
                return [4 /*yield*/, fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            client_id: clientId,
                            client_secret: clientSecret,
                            code: code,
                            grant_type: 'authorization_code',
                            redirect_uri: redirectUri
                        })
                    })];
            case 2:
                tokenRes = _a.sent();
                return [4 /*yield*/, tokenRes.json()];
            case 3:
                tokenData = _a.sent();
                if (tokenData.error) {
                    throw new Error(tokenData.error_description || tokenData.error);
                }
                return [4 /*yield*/, fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                        headers: { Authorization: "Bearer ".concat(tokenData.access_token) }
                    })];
            case 4:
                userRes = _a.sent();
                return [4 /*yield*/, userRes.json()];
            case 5:
                userData = _a.sent();
                return [4 /*yield*/, prisma.user.findUnique({ where: { email: userData.email } })];
            case 6:
                user = _a.sent();
                if (!!user) return [3 /*break*/, 8];
                return [4 /*yield*/, prisma.user.create({
                        data: {
                            email: userData.email,
                            name: userData.name,
                            picture: userData.picture
                        }
                    })];
            case 7:
                user = _a.sent();
                _a.label = 8;
            case 8:
                token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, name: user.name, picture: user.picture }, JWT_SECRET, { expiresIn: '7d' });
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                    maxAge: 7 * 24 * 60 * 60 * 1000
                });
                res.send("\n      <html>\n        <body>\n          <script>\n            if (window.opener) {\n              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '".concat(token, "' }, '*');\n              window.close();\n            } else {\n              window.location.href = '/';\n            }\n          </script>\n          <p>Authentication successful. This window should close automatically.</p>\n        </body>\n      </html>\n    "));
                return [3 /*break*/, 10];
            case 9:
                error_1 = _a.sent();
                console.error('OAuth error:', error_1);
                res.status(500).send("Authentication failed: ".concat(error_1.message));
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
router.post('/register', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, name, existingUser, hashedPassword, user, token, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, email = _a.email, password = _a.password, name = _a.name;
                console.log('Register attempt for:', email);
                if (!email || !password) {
                    return [2 /*return*/, res.status(400).json({ error: 'Email and password are required' })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                return [4 /*yield*/, prisma.user.findUnique({ where: { email: email } })];
            case 2:
                existingUser = _b.sent();
                if (existingUser) {
                    console.log('User already exists:', email);
                    return [2 /*return*/, res.status(400).json({ error: 'Пользователь с таким email уже существует' })];
                }
                console.log('Hashing password for:', email);
                return [4 /*yield*/, bcryptjs_1.default.hash(password, 10)];
            case 3:
                hashedPassword = _b.sent();
                console.log('Creating user in DB:', email);
                return [4 /*yield*/, prisma.user.create({
                        data: {
                            email: email,
                            password: hashedPassword,
                            name: name
                        }
                    })];
            case 4:
                user = _b.sent();
                console.log('User created successfully:', user.id);
                token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, name: user.name, picture: user.picture }, JWT_SECRET, { expiresIn: '7d' });
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                    maxAge: 7 * 24 * 60 * 60 * 1000
                });
                res.json({ success: true, token: token, user: { id: user.id, email: user.email, name: user.name } });
                return [3 /*break*/, 6];
            case 5:
                error_2 = _b.sent();
                res.status(500).json({ error: error_2.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
router.post('/login', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, user, isMatch, token, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, email = _a.email, password = _a.password;
                console.log('Login attempt for:', email);
                if (!email || !password) {
                    return [2 /*return*/, res.status(400).json({ error: 'Email and password are required' })];
                }
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                return [4 /*yield*/, prisma.user.findUnique({ where: { email: email } })];
            case 2:
                user = _b.sent();
                if (!user || !user.password) {
                    console.log('User not found or no password:', email);
                    return [2 /*return*/, res.status(401).json({ error: 'Неверный email или пароль' })];
                }
                console.log('Comparing password for:', email);
                return [4 /*yield*/, bcryptjs_1.default.compare(password, user.password)];
            case 3:
                isMatch = _b.sent();
                if (!isMatch) {
                    console.log('Password mismatch for:', email);
                    return [2 /*return*/, res.status(401).json({ error: 'Неверный email или пароль' })];
                }
                console.log('Login successful for:', email);
                token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, name: user.name, picture: user.picture }, JWT_SECRET, { expiresIn: '7d' });
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                    maxAge: 7 * 24 * 60 * 60 * 1000
                });
                res.json({ success: true, token: token, user: { id: user.id, email: user.email, name: user.name } });
                return [3 /*break*/, 5];
            case 4:
                error_3 = _b.sent();
                res.status(500).json({ error: error_3.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.get('/me', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, hasGeminiKey, hasOllamaKey;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.user.findUnique({
                    where: { id: req.user.id },
                    include: { apiKeys: true }
                })];
            case 1:
                user = _a.sent();
                if (!user)
                    return [2 /*return*/, res.status(404).json({ error: 'User not found' })];
                hasGeminiKey = user.apiKeys.some(function (k) { return k.provider === 'google'; });
                hasOllamaKey = user.apiKeys.some(function (k) { return k.provider === 'ollama'; });
                res.json({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    picture: user.picture,
                    hasGeminiKey: hasGeminiKey,
                    hasOllamaKey: hasOllamaKey,
                    testProvider: user.testProvider,
                    testModel: user.testModel,
                    analysisProvider: user.analysisProvider,
                    analysisModel: user.analysisModel,
                    improvementProvider: user.improvementProvider,
                    improvementModel: user.improvementModel
                });
                return [2 /*return*/];
        }
    });
}); });
router.post('/logout', function (req, res) {
    res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ success: true });
});
router.get('/keys', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var googleKey, ollamaKey;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google')];
            case 1:
                googleKey = _a.sent();
                return [4 /*yield*/, (0, crypto_js_1.getDecryptedKey)(req.user.id, 'ollama')];
            case 2:
                ollamaKey = _a.sent();
                res.json({ google: googleKey, ollama: ollamaKey });
                return [2 /*return*/];
        }
    });
}); });
router.post('/settings', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, geminiKey, ollamaKey, testProvider, testModel, analysisProvider, analysisModel, improvementProvider, improvementModel, updateKey, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, geminiKey = _a.geminiKey, ollamaKey = _a.ollamaKey, testProvider = _a.testProvider, testModel = _a.testModel, analysisProvider = _a.analysisProvider, analysisModel = _a.analysisModel, improvementProvider = _a.improvementProvider, improvementModel = _a.improvementModel;
                updateKey = function (provider, key) { return __awaiter(void 0, void 0, void 0, function () {
                    var _a, encryptedKey, keyIv;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                if (key === undefined)
                                    return [2 /*return*/];
                                if (!(key === '')) return [3 /*break*/, 2];
                                return [4 /*yield*/, prisma.apiKey.deleteMany({ where: { userId: req.user.id, provider: provider } })];
                            case 1:
                                _b.sent();
                                return [2 /*return*/];
                            case 2:
                                _a = (0, crypto_js_1.encryptKey)(key), encryptedKey = _a.encryptedKey, keyIv = _a.keyIv;
                                return [4 /*yield*/, prisma.apiKey.upsert({
                                        where: { userId_provider: { userId: req.user.id, provider: provider } },
                                        update: { encryptedKey: encryptedKey, keyIv: keyIv },
                                        create: { userId: req.user.id, provider: provider, encryptedKey: encryptedKey, keyIv: keyIv }
                                    })];
                            case 3:
                                _b.sent();
                                return [2 /*return*/];
                        }
                    });
                }); };
                _b.label = 1;
            case 1:
                _b.trys.push([1, 5, , 6]);
                return [4 /*yield*/, updateKey('google', geminiKey)];
            case 2:
                _b.sent();
                return [4 /*yield*/, updateKey('ollama', ollamaKey)];
            case 3:
                _b.sent();
                // Update user preferences
                return [4 /*yield*/, prisma.user.update({
                        where: { id: req.user.id },
                        data: {
                            testProvider: testProvider,
                            testModel: testModel,
                            analysisProvider: analysisProvider,
                            analysisModel: analysisModel,
                            improvementProvider: improvementProvider,
                            improvementModel: improvementModel
                        }
                    })];
            case 4:
                // Update user preferences
                _b.sent();
                res.json({ success: true });
                return [3 /*break*/, 6];
            case 5:
                error_4 = _b.sent();
                res.status(500).json({ error: error_4.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
