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
var systemPrompts_js_1 = require("../prompts/systemPrompts.js");
var router = express_1.default.Router();
var prisma = new client_1.PrismaClient();
router.get('/', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var prompts;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.prompt.findMany({
                    where: { userId: req.user.id },
                    orderBy: { updatedAt: 'desc' },
                })];
            case 1:
                prompts = _a.sent();
                res.json(prompts);
                return [2 /*return*/];
        }
    });
}); });
router.post('/', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, description, content, prompt;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, name = _a.name, description = _a.description, content = _a.content;
                return [4 /*yield*/, prisma.prompt.create({
                        data: {
                            userId: req.user.id,
                            name: name,
                            description: description,
                            content: content,
                        }
                    })];
            case 1:
                prompt = _b.sent();
                res.json(prompt);
                return [2 /*return*/];
        }
    });
}); });
router.get('/:id', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var prompt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.prompt.findUnique({
                    where: { id: req.params.id },
                    include: { versions: { orderBy: { version: 'desc' } } },
                })];
            case 1:
                prompt = _a.sent();
                if (!prompt || prompt.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Not found' })];
                res.json(prompt);
                return [2 /*return*/];
        }
    });
}); });
router.put('/:id', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, description, content, saveVersion, changeNote, analysis, prompt, finalContent, finalAnalysis, versions, lastVersionContent, nextVersion, allVersions, versionsToDelete, dataToUpdate, updated;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, name = _a.name, description = _a.description, content = _a.content, saveVersion = _a.saveVersion, changeNote = _a.changeNote, analysis = _a.analysis;
                return [4 /*yield*/, prisma.prompt.findUnique({ where: { id: req.params.id } })];
            case 1:
                prompt = _b.sent();
                if (!prompt || prompt.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Not found' })];
                finalContent = content !== undefined ? content : prompt.content;
                finalAnalysis = analysis !== undefined
                    ? (typeof analysis === 'string' ? analysis : JSON.stringify(analysis))
                    : prompt.analysis;
                if (!saveVersion) return [3 /*break*/, 6];
                return [4 /*yield*/, prisma.promptVersion.findMany({
                        where: { promptId: prompt.id },
                        orderBy: { version: 'desc' },
                        take: 1
                    })];
            case 2:
                versions = _b.sent();
                lastVersionContent = versions.length > 0 ? versions[0].content : null;
                if (!(finalContent !== lastVersionContent)) return [3 /*break*/, 6];
                nextVersion = versions.length > 0 ? versions[0].version + 1 : 1;
                return [4 /*yield*/, prisma.promptVersion.create({
                        data: {
                            promptId: prompt.id,
                            version: nextVersion,
                            content: finalContent,
                            changeNote: changeNote || 'Сохранение версии',
                            analysis: finalAnalysis
                        }
                    })];
            case 3:
                _b.sent();
                return [4 /*yield*/, prisma.promptVersion.findMany({
                        where: { promptId: prompt.id },
                        orderBy: { version: 'desc' },
                        select: { id: true }
                    })];
            case 4:
                allVersions = _b.sent();
                if (!(allVersions.length > 10)) return [3 /*break*/, 6];
                versionsToDelete = allVersions.slice(10).map(function (v) { return v.id; });
                return [4 /*yield*/, prisma.promptVersion.deleteMany({
                        where: { id: { in: versionsToDelete } }
                    })];
            case 5:
                _b.sent();
                _b.label = 6;
            case 6:
                dataToUpdate = {};
                if (name !== undefined)
                    dataToUpdate.name = name;
                if (description !== undefined)
                    dataToUpdate.description = description;
                if (content !== undefined)
                    dataToUpdate.content = content;
                if (analysis !== undefined)
                    dataToUpdate.analysis = finalAnalysis;
                return [4 /*yield*/, prisma.prompt.update({
                        where: { id: req.params.id },
                        data: dataToUpdate,
                        include: { versions: { orderBy: { version: 'desc' } } }
                    })];
            case 7:
                updated = _b.sent();
                res.json(updated);
                return [2 /*return*/];
        }
    });
}); });
router.get('/:id/export', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var prompt, exportData;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.prompt.findUnique({
                    where: { id: req.params.id },
                    include: {
                        versions: true,
                        messages: true,
                        testCases: true
                    }
                })];
            case 1:
                prompt = _a.sent();
                if (!prompt || prompt.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Not found' })];
                exportData = {
                    version: "1.0",
                    exportedAt: new Date().toISOString(),
                    prompt: {
                        name: prompt.name,
                        description: prompt.description,
                        content: prompt.content,
                        createdAt: prompt.createdAt,
                        updatedAt: prompt.updatedAt
                    },
                    history: {
                        messages: prompt.messages,
                        testCases: prompt.testCases,
                        versions: prompt.versions
                    }
                };
                res.json(exportData);
                return [2 /*return*/];
        }
    });
}); });
router.post('/import', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, prompt_1, history_1, newPrompt, error_1;
    var _b, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 2, , 3]);
                _a = req.body, prompt_1 = _a.prompt, history_1 = _a.history;
                if (!prompt_1 || !prompt_1.name || !prompt_1.content) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid import format' })];
                }
                return [4 /*yield*/, prisma.prompt.create({
                        data: {
                            userId: req.user.id,
                            name: prompt_1.name + ' (Imported)',
                            description: prompt_1.description,
                            content: prompt_1.content,
                            versions: {
                                create: ((_b = history_1 === null || history_1 === void 0 ? void 0 : history_1.versions) === null || _b === void 0 ? void 0 : _b.map(function (v) { return ({
                                    version: v.version,
                                    content: v.content,
                                    changeNote: v.changeNote,
                                    createdAt: v.createdAt
                                }); })) || []
                            },
                            messages: {
                                create: ((_c = history_1 === null || history_1 === void 0 ? void 0 : history_1.messages) === null || _c === void 0 ? void 0 : _c.map(function (m) { return ({
                                    role: m.role,
                                    content: m.content,
                                    model: m.model,
                                    provider: m.provider,
                                    promptTokens: m.promptTokens,
                                    completionTokens: m.completionTokens,
                                    totalTokens: m.totalTokens,
                                    latencyMs: m.latencyMs,
                                    debugInfo: m.debugInfo,
                                    createdAt: m.createdAt
                                }); })) || []
                            },
                            testCases: {
                                create: ((_d = history_1 === null || history_1 === void 0 ? void 0 : history_1.testCases) === null || _d === void 0 ? void 0 : _d.map(function (tc) { return ({
                                    input: tc.input,
                                    expectedOutput: tc.expectedOutput,
                                    createdAt: tc.createdAt,
                                    updatedAt: tc.updatedAt
                                }); })) || []
                            }
                        }
                    })];
            case 1:
                newPrompt = _e.sent();
                res.json(newPrompt);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _e.sent();
                res.status(500).json({ error: error_1.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.delete('/:id', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var prompt;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.prompt.findUnique({ where: { id: req.params.id } })];
            case 1:
                prompt = _a.sent();
                if (!prompt || prompt.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Not found' })];
                return [4 /*yield*/, prisma.prompt.delete({ where: { id: req.params.id } })];
            case 2:
                _a.sent();
                res.json({ success: true });
                return [2 /*return*/];
        }
    });
}); });
router.get('/versions/:versionId', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var version;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.promptVersion.findUnique({
                    where: { id: req.params.versionId },
                    include: { prompt: true }
                })];
            case 1:
                version = _a.sent();
                if (!version || version.prompt.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Not found' })];
                res.json(version);
                return [2 /*return*/];
        }
    });
}); });
// Analyze Prompt
router.post('/:id/analyze', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var prompt_2, user, provider, model, history_2, analysisPrompt, analysisResult, userKey, endpoint, response, _a, _b, data, error_2;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 11, , 12]);
                return [4 /*yield*/, prisma.prompt.findUnique({ where: { id: req.params.id } })];
            case 1:
                prompt_2 = _c.sent();
                if (!prompt_2 || prompt_2.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Not found' })];
                return [4 /*yield*/, prisma.user.findUnique({ where: { id: req.user.id } })];
            case 2:
                user = _c.sent();
                provider = (user === null || user === void 0 ? void 0 : user.analysisProvider) || 'google';
                model = (user === null || user === void 0 ? void 0 : user.analysisModel) || 'gemini-3-flash-preview';
                return [4 /*yield*/, prisma.message.findMany({
                        where: { promptId: prompt_2.id },
                        orderBy: { createdAt: 'asc' },
                        take: 10
                    })];
            case 3:
                history_2 = _c.sent();
                analysisPrompt = (0, systemPrompts_js_1.getAnalysisPrompt)(prompt_2.content, history_2);
                analysisResult = {};
                if (!(provider === 'google')) return [3 /*break*/, 4];
                throw new Error('Analysis for Google provider should be handled on the frontend');
            case 4:
                if (!(provider === 'ollama')) return [3 /*break*/, 10];
                return [4 /*yield*/, (0, crypto_js_1.getDecryptedKey)(req.user.id, 'ollama')];
            case 5:
                userKey = _c.sent();
                if (!userKey)
                    throw new Error('Ollama API key is not configured in settings');
                endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434/api/generate';
                return [4 /*yield*/, fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: model,
                            prompt: analysisPrompt + "\n\nIMPORTANT: Return ONLY a valid JSON object.",
                            stream: false,
                            format: 'json'
                        })
                    })];
            case 6:
                response = _c.sent();
                if (!!response.ok) return [3 /*break*/, 8];
                _a = Error.bind;
                _b = "Ollama error: ".concat;
                return [4 /*yield*/, response.text()];
            case 7: throw new (_a.apply(Error, [void 0, _b.apply("Ollama error: ", [_c.sent()])]))();
            case 8: return [4 /*yield*/, response.json()];
            case 9:
                data = _c.sent();
                analysisResult = JSON.parse(data.response || '{}');
                _c.label = 10;
            case 10:
                res.json(analysisResult);
                return [3 /*break*/, 12];
            case 11:
                error_2 = _c.sent();
                console.error('Analyze error:', error_2);
                res.status(500).json({ error: error_2.message });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
// Improve Prompt
router.post('/:id/improve', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var analysisResult, prompt_3, user, provider, model, improvePrompt, improveResult, userKey, endpoint, response, _a, _b, data, error_3;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 10, , 11]);
                analysisResult = req.body.analysisResult;
                return [4 /*yield*/, prisma.prompt.findUnique({ where: { id: req.params.id } })];
            case 1:
                prompt_3 = _c.sent();
                if (!prompt_3 || prompt_3.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Not found' })];
                return [4 /*yield*/, prisma.user.findUnique({ where: { id: req.user.id } })];
            case 2:
                user = _c.sent();
                provider = (user === null || user === void 0 ? void 0 : user.improvementProvider) || 'google';
                model = (user === null || user === void 0 ? void 0 : user.improvementModel) || 'gemini-3-flash-preview';
                improvePrompt = (0, systemPrompts_js_1.getImprovePrompt)(prompt_3.content, analysisResult);
                improveResult = {};
                if (!(provider === 'google')) return [3 /*break*/, 3];
                throw new Error('Improvement for Google provider should be handled on the frontend');
            case 3:
                if (!(provider === 'ollama')) return [3 /*break*/, 9];
                return [4 /*yield*/, (0, crypto_js_1.getDecryptedKey)(req.user.id, 'ollama')];
            case 4:
                userKey = _c.sent();
                if (!userKey)
                    throw new Error('Ollama API key is not configured in settings');
                endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434/api/generate';
                return [4 /*yield*/, fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: model,
                            prompt: improvePrompt + "\n\nIMPORTANT: Return ONLY a valid JSON object.",
                            stream: false,
                            format: 'json'
                        })
                    })];
            case 5:
                response = _c.sent();
                if (!!response.ok) return [3 /*break*/, 7];
                _a = Error.bind;
                _b = "Ollama error: ".concat;
                return [4 /*yield*/, response.text()];
            case 6: throw new (_a.apply(Error, [void 0, _b.apply("Ollama error: ", [_c.sent()])]))();
            case 7: return [4 /*yield*/, response.json()];
            case 8:
                data = _c.sent();
                improveResult = JSON.parse(data.response || '{}');
                _c.label = 9;
            case 9:
                res.json(improveResult);
                return [3 /*break*/, 11];
            case 10:
                error_3 = _c.sent();
                console.error('Improve error:', error_3);
                res.status(500).json({ error: error_3.message });
                return [3 /*break*/, 11];
            case 11: return [2 /*return*/];
        }
    });
}); });
// Improvement Chat
router.post('/:id/improvement-chat', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, message, history_3, prompt_4, user, provider, model, testHistory, analysisResult, systemInstruction, result, userKey, endpoint, messages, response, _b, _c, data, error_4;
    var _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 11, , 12]);
                _a = req.body, message = _a.message, history_3 = _a.history;
                return [4 /*yield*/, prisma.prompt.findUnique({ where: { id: req.params.id } })];
            case 1:
                prompt_4 = _f.sent();
                if (!prompt_4 || prompt_4.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Not found' })];
                return [4 /*yield*/, prisma.user.findUnique({ where: { id: req.user.id } })];
            case 2:
                user = _f.sent();
                provider = (user === null || user === void 0 ? void 0 : user.improvementProvider) || 'google';
                model = (user === null || user === void 0 ? void 0 : user.improvementModel) || 'gemini-3-flash-preview';
                return [4 /*yield*/, prisma.message.findMany({
                        where: { promptId: prompt_4.id },
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    })];
            case 3:
                testHistory = _f.sent();
                analysisResult = prompt_4.analysis ? JSON.parse(prompt_4.analysis) : null;
                systemInstruction = (0, systemPrompts_js_1.getChatSystemInstruction)(prompt_4.content, testHistory.reverse(), analysisResult);
                result = { message: '', action: 'none', full_prompt_preview: '', suggested_changes: { reasoning: '' } };
                if (!(provider === 'google')) return [3 /*break*/, 4];
                throw new Error('Improvement chat for Google provider should be handled on the frontend');
            case 4:
                if (!(provider === 'ollama')) return [3 /*break*/, 10];
                return [4 /*yield*/, (0, crypto_js_1.getDecryptedKey)(req.user.id, 'ollama')];
            case 5:
                userKey = _f.sent();
                if (!userKey)
                    throw new Error('Ollama API key is not configured in settings');
                endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434/api/chat';
                messages = __spreadArray(__spreadArray([
                    { role: 'system', content: systemInstruction }
                ], history_3.map(function (msg) { return ({ role: msg.role, content: msg.content }); }), true), [
                    { role: 'user', content: message + "\n\nIMPORTANT: Return ONLY a valid JSON object." }
                ], false);
                return [4 /*yield*/, fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: model,
                            messages: messages,
                            stream: false,
                            format: 'json'
                        })
                    })];
            case 6:
                response = _f.sent();
                if (!!response.ok) return [3 /*break*/, 8];
                _b = Error.bind;
                _c = "Ollama error: ".concat;
                return [4 /*yield*/, response.text()];
            case 7: throw new (_b.apply(Error, [void 0, _c.apply("Ollama error: ", [_f.sent()])]))();
            case 8: return [4 /*yield*/, response.json()];
            case 9:
                data = _f.sent();
                result = JSON.parse(((_d = data.message) === null || _d === void 0 ? void 0 : _d.content) || '{}');
                _f.label = 10;
            case 10:
                res.json({
                    text: result.message,
                    has_changes: result.action === 'suggest' || result.action === 'apply',
                    improved_prompt: result.full_prompt_preview,
                    diff_summary: ((_e = result.suggested_changes) === null || _e === void 0 ? void 0 : _e.reasoning) || 'AI suggestions'
                });
                return [3 /*break*/, 12];
            case 11:
                error_4 = _f.sent();
                console.error('Improvement chat error:', error_4);
                res.status(500).json({ error: error_4.message });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
// Run Tests (Batch Evaluation)
router.post('/:id/run-tests', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var promptId, versionId, prompt_5, promptContent, version, testCases, userKey, apiKey, ai, user, testProvider, testModel, analysisProvider, analysisModel, results, totalScore, _i, testCases_1, tc, actualOutput, genResponse, userKey_1, endpoint, response, data, e_1, evalPrompt, evaluation, evalResponse, userKey_2, endpoint, response, data, e_2, overallScore, passedCount, error_5;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 28, , 29]);
                promptId = req.params.id;
                versionId = (req.body || {}).versionId;
                return [4 /*yield*/, prisma.prompt.findUnique({ where: { id: promptId } })];
            case 1:
                prompt_5 = _b.sent();
                if (!prompt_5 || prompt_5.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Prompt not found' })];
                promptContent = prompt_5.content;
                if (!versionId) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma.promptVersion.findUnique({ where: { id: versionId } })];
            case 2:
                version = _b.sent();
                if (version && version.promptId === promptId) {
                    promptContent = version.content;
                }
                _b.label = 3;
            case 3: return [4 /*yield*/, prisma.testCase.findMany({
                    where: { promptId: promptId },
                    orderBy: { createdAt: 'asc' }
                })];
            case 4:
                testCases = _b.sent();
                if (testCases.length === 0) {
                    return [2 /*return*/, res.status(400).json({ error: 'No test cases found for this prompt.' })];
                }
                return [4 /*yield*/, (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google')];
            case 5:
                userKey = _b.sent();
                apiKey = userKey || process.env.GEMINI_API_KEY;
                if (!apiKey)
                    throw new Error('Google Gemini API key is not configured in settings');
                ai = new genai_1.GoogleGenAI({ apiKey: apiKey });
                return [4 /*yield*/, prisma.user.findUnique({ where: { id: req.user.id } })];
            case 6:
                user = _b.sent();
                testProvider = (user === null || user === void 0 ? void 0 : user.testProvider) || 'google';
                testModel = (user === null || user === void 0 ? void 0 : user.testModel) || 'gemini-3.1-flash-lite-preview';
                analysisProvider = (user === null || user === void 0 ? void 0 : user.analysisProvider) || 'google';
                analysisModel = (user === null || user === void 0 ? void 0 : user.analysisModel) || 'gemini-3-flash-preview';
                results = [];
                totalScore = 0;
                _i = 0, testCases_1 = testCases;
                _b.label = 7;
            case 7:
                if (!(_i < testCases_1.length)) return [3 /*break*/, 27];
                tc = testCases_1[_i];
                actualOutput = '';
                _b.label = 8;
            case 8:
                _b.trys.push([8, 15, , 16]);
                if (!(testProvider === 'google')) return [3 /*break*/, 10];
                return [4 /*yield*/, ai.models.generateContent({
                        model: testModel,
                        contents: tc.input,
                        config: {
                            systemInstruction: promptContent,
                        }
                    })];
            case 9:
                genResponse = _b.sent();
                actualOutput = genResponse.text || '';
                return [3 /*break*/, 14];
            case 10:
                if (!(testProvider === 'ollama')) return [3 /*break*/, 14];
                return [4 /*yield*/, (0, crypto_js_1.getDecryptedKey)(req.user.id, 'ollama')];
            case 11:
                userKey_1 = _b.sent();
                endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434/api/chat';
                return [4 /*yield*/, fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: testModel,
                            messages: [
                                { role: 'system', content: promptContent },
                                { role: 'user', content: tc.input }
                            ],
                            stream: false
                        })
                    })];
            case 12:
                response = _b.sent();
                return [4 /*yield*/, response.json()];
            case 13:
                data = _b.sent();
                actualOutput = ((_a = data.message) === null || _a === void 0 ? void 0 : _a.content) || '';
                _b.label = 14;
            case 14: return [3 /*break*/, 16];
            case 15:
                e_1 = _b.sent();
                actualOutput = "Error generating output: ".concat(e_1.message);
                return [3 /*break*/, 16];
            case 16:
                evalPrompt = (0, systemPrompts_js_1.getEvalPrompt)(promptContent, tc.input, tc.expectedOutput, actualOutput);
                evaluation = { score: 0, reasoning: 'Failed to evaluate', passed: false, metrics: {} };
                _b.label = 17;
            case 17:
                _b.trys.push([17, 24, , 25]);
                if (!(analysisProvider === 'google')) return [3 /*break*/, 19];
                return [4 /*yield*/, ai.models.generateContent({
                        model: analysisModel,
                        contents: evalPrompt,
                        config: { responseMimeType: 'application/json' }
                    })];
            case 18:
                evalResponse = _b.sent();
                evaluation = JSON.parse(evalResponse.text || '{}');
                return [3 /*break*/, 23];
            case 19:
                if (!(analysisProvider === 'ollama')) return [3 /*break*/, 23];
                return [4 /*yield*/, (0, crypto_js_1.getDecryptedKey)(req.user.id, 'ollama')];
            case 20:
                userKey_2 = _b.sent();
                endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434/api/generate';
                return [4 /*yield*/, fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: analysisModel,
                            prompt: evalPrompt + "\n\nIMPORTANT: Return ONLY a valid JSON object.",
                            stream: false,
                            format: 'json'
                        })
                    })];
            case 21:
                response = _b.sent();
                return [4 /*yield*/, response.json()];
            case 22:
                data = _b.sent();
                evaluation = JSON.parse(data.response || '{}');
                _b.label = 23;
            case 23: return [3 /*break*/, 25];
            case 24:
                e_2 = _b.sent();
                console.error('Eval error:', e_2);
                return [3 /*break*/, 25];
            case 25:
                totalScore += evaluation.score || 0;
                results.push({
                    testCaseId: tc.id,
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    actualOutput: actualOutput,
                    score: evaluation.score || 0,
                    reasoning: evaluation.reasoning || '',
                    passed: evaluation.passed || false,
                    metrics: evaluation.metrics || {}
                });
                _b.label = 26;
            case 26:
                _i++;
                return [3 /*break*/, 7];
            case 27:
                overallScore = results.length > 0 ? (totalScore / results.length).toFixed(1) : 0;
                passedCount = results.filter(function (r) { return r.passed; }).length;
                res.json({
                    overallScore: Number(overallScore),
                    passedCount: passedCount,
                    totalCount: results.length,
                    results: results
                });
                return [3 /*break*/, 29];
            case 28:
                error_5 = _b.sent();
                res.status(500).json({ error: error_5.message });
                return [3 /*break*/, 29];
            case 29: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
