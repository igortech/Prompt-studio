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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var client_1 = require("@prisma/client");
var auth_js_1 = require("../middleware/auth.js");
var crypto_js_1 = require("../services/crypto.js");
var genai_1 = require("@google/genai");
var router = express_1.default.Router();
var prisma = new client_1.PrismaClient();
router.get('/prompt/:promptId', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var prompt, messages;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.prompt.findUnique({ where: { id: req.params.promptId } })];
            case 1:
                prompt = _a.sent();
                if (!prompt || prompt.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Not found' })];
                return [4 /*yield*/, prisma.message.findMany({
                        where: { promptId: req.params.promptId },
                        orderBy: { createdAt: 'asc' },
                    })];
            case 2:
                messages = _a.sent();
                res.json(messages);
                return [2 /*return*/];
        }
    });
}); });
router.post('/prompt/:promptId', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, content, parameters, provider, model, promptId, prompt_1, user, finalProvider, finalModel, userMsg, assistantContent, debugInfo, promptTokens, completionTokens, totalTokens, latencyMs, startTime, keyStartTime, userKey, apiKey, ai, historyStartTime, history_1, reversedHistory, systemInstruction, formattedHistory, chat, aiStartTime, response, userKey, endpoint, history_2, reversedHistory, messages, response, err, data, assistantMsg, error_1;
    var _b, _c, _d, _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                _g.trys.push([0, 16, , 17]);
                _a = req.body, content = _a.content, parameters = _a.parameters, provider = _a.provider, model = _a.model;
                promptId = req.params.promptId;
                return [4 /*yield*/, prisma.prompt.findUnique({ where: { id: promptId } })];
            case 1:
                prompt_1 = _g.sent();
                if (!prompt_1 || prompt_1.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Prompt not found' })];
                return [4 /*yield*/, prisma.user.findUnique({ where: { id: req.user.id } })];
            case 2:
                user = _g.sent();
                finalProvider = provider || (user === null || user === void 0 ? void 0 : user.testProvider) || 'google';
                finalModel = model || (user === null || user === void 0 ? void 0 : user.testModel) || 'gemini-3.1-flash-lite-preview';
                return [4 /*yield*/, prisma.message.create({
                        data: { promptId: promptId, role: 'user', content: content }
                    })];
            case 3:
                userMsg = _g.sent();
                assistantContent = '';
                debugInfo = {};
                promptTokens = 0;
                completionTokens = 0;
                totalTokens = 0;
                latencyMs = 0;
                startTime = Date.now();
                console.log("[Chat] Starting request for prompt ".concat(promptId, " with model ").concat(finalModel));
                if (!(finalProvider === 'google')) return [3 /*break*/, 7];
                keyStartTime = Date.now();
                return [4 /*yield*/, (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google')];
            case 4:
                userKey = _g.sent();
                console.log("[Chat] Key retrieval took ".concat(Date.now() - keyStartTime, "ms"));
                apiKey = userKey || process.env.GEMINI_API_KEY;
                if (!apiKey)
                    throw new Error('Google Gemini API key is not configured in settings');
                ai = new genai_1.GoogleGenAI({ apiKey: apiKey });
                historyStartTime = Date.now();
                return [4 /*yield*/, prisma.message.findMany({
                        where: { promptId: promptId },
                        orderBy: { createdAt: 'desc' },
                        take: 21 // Take 21 to get 20 previous + current
                    })];
            case 5:
                history_1 = _g.sent();
                console.log("[Chat] History retrieval took ".concat(Date.now() - historyStartTime, "ms"));
                reversedHistory = history_1.reverse();
                systemInstruction = prompt_1.content;
                formattedHistory = reversedHistory.slice(0, -1).map(function (msg) { return ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                }); });
                chat = ai.chats.create({
                    model: finalModel,
                    config: {
                        systemInstruction: systemInstruction,
                    },
                    history: formattedHistory
                });
                aiStartTime = Date.now();
                return [4 /*yield*/, chat.sendMessage({ message: content })];
            case 6:
                response = _g.sent();
                console.log("[Chat] AI response took ".concat(Date.now() - aiStartTime, "ms"));
                assistantContent = response.text || '';
                latencyMs = Date.now() - startTime;
                // Extract metadata
                if (response.usageMetadata) {
                    promptTokens = response.usageMetadata.promptTokenCount || 0;
                    completionTokens = response.usageMetadata.candidatesTokenCount || 0;
                    totalTokens = response.usageMetadata.totalTokenCount || 0;
                }
                debugInfo = {
                    model: finalModel,
                    provider: 'google',
                    usage: response.usageMetadata,
                    finishReason: (_c = (_b = response.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.finishReason,
                    safetyRatings: (_e = (_d = response.candidates) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.safetyRatings,
                    latencyMs: latencyMs
                };
                return [3 /*break*/, 14];
            case 7:
                if (!(finalProvider === 'ollama')) return [3 /*break*/, 14];
                return [4 /*yield*/, (0, crypto_js_1.getDecryptedKey)(req.user.id, 'ollama')];
            case 8:
                userKey = _g.sent();
                if (!userKey)
                    throw new Error('Ollama API key is not configured in settings');
                endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434/api/chat';
                return [4 /*yield*/, prisma.message.findMany({
                        where: { promptId: promptId },
                        orderBy: { createdAt: 'desc' },
                        take: 11
                    })];
            case 9:
                history_2 = _g.sent();
                reversedHistory = history_2.reverse();
                messages = __spreadArray(__spreadArray([
                    { role: 'system', content: prompt_1.content }
                ], reversedHistory.slice(0, -1).map(function (msg) { return ({
                    role: msg.role,
                    content: msg.content
                }); }), true), [
                    { role: 'user', content: content }
                ], false);
                return [4 /*yield*/, fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: finalModel,
                            messages: messages,
                            stream: false
                        })
                    })];
            case 10:
                response = _g.sent();
                if (!!response.ok) return [3 /*break*/, 12];
                return [4 /*yield*/, response.text()];
            case 11:
                err = _g.sent();
                throw new Error("Ollama error: ".concat(err));
            case 12: return [4 /*yield*/, response.json()];
            case 13:
                data = _g.sent();
                assistantContent = ((_f = data.message) === null || _f === void 0 ? void 0 : _f.content) || '';
                latencyMs = Date.now() - startTime;
                promptTokens = data.prompt_eval_count || 0;
                completionTokens = data.eval_count || 0;
                totalTokens = (data.prompt_eval_count || 0) + (data.eval_count || 0);
                debugInfo = {
                    model: finalModel,
                    provider: 'ollama',
                    total_duration: data.total_duration,
                    load_duration: data.load_duration,
                    prompt_eval_count: data.prompt_eval_count,
                    eval_count: data.eval_count,
                    latencyMs: latencyMs
                };
                _g.label = 14;
            case 14: return [4 /*yield*/, prisma.message.create({
                    data: {
                        promptId: promptId,
                        role: 'assistant',
                        content: assistantContent,
                        model: finalModel,
                        provider: finalProvider,
                        promptTokens: promptTokens,
                        completionTokens: completionTokens,
                        totalTokens: totalTokens,
                        latencyMs: latencyMs,
                        debugInfo: JSON.stringify(debugInfo)
                    }
                })];
            case 15:
                assistantMsg = _g.sent();
                res.json({ userMessage: userMsg, assistantMessage: assistantMsg });
                return [3 /*break*/, 17];
            case 16:
                error_1 = _g.sent();
                console.error('Chat error:', error_1);
                res.status(500).json({ error: error_1.message });
                return [3 /*break*/, 17];
            case 17: return [2 /*return*/];
        }
    });
}); });
router.post('/prompt/:promptId/replay', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var promptId, versionId, prompt_2, promptContent, version, user, finalProvider, finalModel, history_4, userKey, apiKey, ai, results, chat, _i, history_3, msg, startTime, response, latencyMs, assistantContent, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 14, , 15]);
                promptId = req.params.promptId;
                versionId = req.body.versionId;
                return [4 /*yield*/, prisma.prompt.findUnique({ where: { id: promptId } })];
            case 1:
                prompt_2 = _a.sent();
                if (!prompt_2 || prompt_2.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Prompt not found' })];
                promptContent = prompt_2.content;
                if (!versionId) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma.promptVersion.findUnique({ where: { id: versionId } })];
            case 2:
                version = _a.sent();
                if (version && version.promptId === promptId) {
                    promptContent = version.content;
                }
                _a.label = 3;
            case 3: return [4 /*yield*/, prisma.user.findUnique({ where: { id: req.user.id } })];
            case 4:
                user = _a.sent();
                finalProvider = (user === null || user === void 0 ? void 0 : user.testProvider) || 'google';
                finalModel = (user === null || user === void 0 ? void 0 : user.testModel) || 'gemini-3.1-flash-lite-preview';
                return [4 /*yield*/, prisma.message.findMany({
                        where: { promptId: promptId, role: 'user' },
                        orderBy: { createdAt: 'asc' }
                    })];
            case 5:
                history_4 = _a.sent();
                if (history_4.length === 0) {
                    return [2 /*return*/, res.status(400).json({ error: 'No history to replay' })];
                }
                // Delete all existing messages for this prompt
                return [4 /*yield*/, prisma.message.deleteMany({ where: { promptId: promptId } })];
            case 6:
                // Delete all existing messages for this prompt
                _a.sent();
                return [4 /*yield*/, (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google')];
            case 7:
                userKey = _a.sent();
                apiKey = userKey || process.env.GEMINI_API_KEY;
                if (!apiKey)
                    throw new Error('Google Gemini API key is not configured');
                ai = new genai_1.GoogleGenAI({ apiKey: apiKey });
                results = [];
                chat = ai.chats.create({
                    model: finalModel,
                    config: { systemInstruction: promptContent }
                });
                _i = 0, history_3 = history_4;
                _a.label = 8;
            case 8:
                if (!(_i < history_3.length)) return [3 /*break*/, 13];
                msg = history_3[_i];
                // Recreate user message
                return [4 /*yield*/, prisma.message.create({
                        data: {
                            promptId: promptId,
                            role: 'user',
                            content: msg.content
                        }
                    })];
            case 9:
                // Recreate user message
                _a.sent();
                startTime = Date.now();
                return [4 /*yield*/, chat.sendMessage({ message: msg.content })];
            case 10:
                response = _a.sent();
                latencyMs = Date.now() - startTime;
                assistantContent = response.text || '';
                // Create assistant message
                return [4 /*yield*/, prisma.message.create({
                        data: {
                            promptId: promptId,
                            role: 'assistant',
                            content: assistantContent,
                            model: finalModel,
                            provider: finalProvider,
                            latencyMs: latencyMs
                        }
                    })];
            case 11:
                // Create assistant message
                _a.sent();
                results.push({
                    originalMessage: msg.content,
                    newResponse: assistantContent,
                    latencyMs: latencyMs
                });
                _a.label = 12;
            case 12:
                _i++;
                return [3 /*break*/, 8];
            case 13:
                res.json({ success: true, results: results });
                return [3 /*break*/, 15];
            case 14:
                error_2 = _a.sent();
                console.error('Replay error:', error_2);
                res.status(500).json({ error: error_2.message });
                return [3 /*break*/, 15];
            case 15: return [2 /*return*/];
        }
    });
}); });
router.delete('/prompt/:promptId', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var prompt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.prompt.findUnique({ where: { id: req.params.promptId } })];
            case 1:
                prompt = _a.sent();
                if (!prompt || prompt.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Not found' })];
                return [4 /*yield*/, prisma.message.deleteMany({ where: { promptId: req.params.promptId } })];
            case 2:
                _a.sent();
                res.json({ success: true });
                return [2 /*return*/];
        }
    });
}); });
exports.default = router;
