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
var client_1 = require("@prisma/client");
var auth_js_1 = require("../middleware/auth.js");
var crypto_js_1 = require("../services/crypto.js");
var genai_1 = require("@google/genai");
var systemPrompts_js_1 = require("../prompts/systemPrompts.js");
var router = express_1.default.Router();
var prisma = new client_1.PrismaClient();
router.post('/prompt/:promptId/generate-scenarios', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, scenarioCount, promptId, prompt_1, userKey, apiKey, ai, user, model, systemInstruction, response, text, scenarios, createdTestCases, _i, scenarios_1, scenario, tc, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 9, , 10]);
                _a = req.body.scenarioCount, scenarioCount = _a === void 0 ? 5 : _a;
                promptId = req.params.promptId;
                return [4 /*yield*/, prisma.prompt.findUnique({ where: { id: promptId } })];
            case 1:
                prompt_1 = _b.sent();
                if (!prompt_1 || prompt_1.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Prompt not found' })];
                return [4 /*yield*/, (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google')];
            case 2:
                userKey = _b.sent();
                apiKey = userKey || process.env.GEMINI_API_KEY;
                if (!apiKey)
                    throw new Error('Google Gemini API key is not configured');
                ai = new genai_1.GoogleGenAI({ apiKey: apiKey });
                return [4 /*yield*/, prisma.user.findUnique({ where: { id: req.user.id } })];
            case 3:
                user = _b.sent();
                model = (user === null || user === void 0 ? void 0 : user.analysisModel) || 'gemini-3-flash-preview';
                systemInstruction = (0, systemPrompts_js_1.getTestingPrompt)(prompt_1.content, scenarioCount);
                return [4 /*yield*/, ai.models.generateContent({
                        model: model,
                        contents: 'Сгенерируй тестовые сценарии.',
                        config: {
                            systemInstruction: systemInstruction,
                            responseMimeType: 'application/json',
                            responseSchema: {
                                type: genai_1.Type.ARRAY,
                                items: {
                                    type: genai_1.Type.OBJECT,
                                    properties: {
                                        type: { type: genai_1.Type.STRING },
                                        description: { type: genai_1.Type.STRING },
                                        input: { type: genai_1.Type.STRING },
                                        expected_aspects: {
                                            type: genai_1.Type.ARRAY,
                                            items: { type: genai_1.Type.STRING }
                                        }
                                    },
                                    required: ['type', 'description', 'input', 'expected_aspects']
                                }
                            }
                        }
                    })];
            case 4:
                response = _b.sent();
                text = response.text || '[]';
                scenarios = JSON.parse(text);
                createdTestCases = [];
                _i = 0, scenarios_1 = scenarios;
                _b.label = 5;
            case 5:
                if (!(_i < scenarios_1.length)) return [3 /*break*/, 8];
                scenario = scenarios_1[_i];
                return [4 /*yield*/, prisma.testCase.create({
                        data: {
                            promptId: promptId,
                            input: scenario.input,
                            expectedOutput: scenario.expected_aspects.join(', ')
                        }
                    })];
            case 6:
                tc = _b.sent();
                createdTestCases.push(tc);
                _b.label = 7;
            case 7:
                _i++;
                return [3 /*break*/, 5];
            case 8:
                res.json(createdTestCases);
                return [3 /*break*/, 10];
            case 9:
                error_1 = _b.sent();
                console.error('Generate scenarios error:', error_1);
                res.status(500).json({ error: error_1.message });
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
router.get('/prompt/:promptId', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var prompt, testCases;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.prompt.findUnique({ where: { id: req.params.promptId } })];
            case 1:
                prompt = _a.sent();
                if (!prompt || prompt.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Not found' })];
                return [4 /*yield*/, prisma.testCase.findMany({
                        where: { promptId: req.params.promptId },
                        orderBy: { createdAt: 'asc' },
                    })];
            case 2:
                testCases = _a.sent();
                res.json(testCases);
                return [2 /*return*/];
        }
    });
}); });
router.post('/prompt/:promptId', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, input, expectedOutput, prompt, testCase;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, input = _a.input, expectedOutput = _a.expectedOutput;
                return [4 /*yield*/, prisma.prompt.findUnique({ where: { id: req.params.promptId } })];
            case 1:
                prompt = _b.sent();
                if (!prompt || prompt.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Not found' })];
                return [4 /*yield*/, prisma.testCase.create({
                        data: {
                            promptId: req.params.promptId,
                            input: input,
                            expectedOutput: expectedOutput,
                        }
                    })];
            case 2:
                testCase = _b.sent();
                res.json(testCase);
                return [2 /*return*/];
        }
    });
}); });
router.put('/:id', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, input, expectedOutput, testCase, updated, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                _a = req.body, input = _a.input, expectedOutput = _a.expectedOutput;
                return [4 /*yield*/, prisma.testCase.findUnique({
                        where: { id: req.params.id },
                        include: { prompt: true }
                    })];
            case 1:
                testCase = _b.sent();
                if (!testCase || testCase.prompt.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Not found' })];
                return [4 /*yield*/, prisma.testCase.update({
                        where: { id: req.params.id },
                        data: { input: input, expectedOutput: expectedOutput }
                    })];
            case 2:
                updated = _b.sent();
                res.json(updated);
                return [3 /*break*/, 4];
            case 3:
                error_2 = _b.sent();
                res.status(500).json({ error: error_2.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.delete('/:id', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var testCase, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, prisma.testCase.findUnique({
                        where: { id: req.params.id },
                        include: { prompt: true }
                    })];
            case 1:
                testCase = _a.sent();
                if (!testCase || testCase.prompt.userId !== req.user.id)
                    return [2 /*return*/, res.status(404).json({ error: 'Not found' })];
                return [4 /*yield*/, prisma.testCase.delete({ where: { id: req.params.id } })];
            case 2:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _a.sent();
                res.status(500).json({ error: error_3.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Run Single Test
router.post('/:id/run', auth_js_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var testCaseId, versionId, testCase, promptContent, version, userKey, apiKey, ai, actualOutput, genResponse, e_1, evalPrompt, evaluation, evalResponse, e_2, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 13, , 14]);
                testCaseId = req.params.id;
                versionId = (req.body || {}).versionId;
                return [4 /*yield*/, prisma.testCase.findUnique({
                        where: { id: testCaseId },
                        include: { prompt: true }
                    })];
            case 1:
                testCase = _a.sent();
                if (!testCase || testCase.prompt.userId !== req.user.id) {
                    return [2 /*return*/, res.status(404).json({ error: 'Test case not found' })];
                }
                promptContent = testCase.prompt.content;
                if (!versionId) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma.promptVersion.findUnique({
                        where: { id: versionId }
                    })];
            case 2:
                version = _a.sent();
                if (version && version.promptId === testCase.promptId) {
                    promptContent = version.content;
                }
                _a.label = 3;
            case 3: return [4 /*yield*/, (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google')];
            case 4:
                userKey = _a.sent();
                apiKey = userKey || process.env.GEMINI_API_KEY;
                if (!apiKey)
                    throw new Error('Google Gemini API key is not configured in settings');
                ai = new genai_1.GoogleGenAI({ apiKey: apiKey });
                actualOutput = '';
                _a.label = 5;
            case 5:
                _a.trys.push([5, 7, , 8]);
                return [4 /*yield*/, ai.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: testCase.input,
                        config: {
                            systemInstruction: promptContent,
                        }
                    })];
            case 6:
                genResponse = _a.sent();
                actualOutput = genResponse.text || '';
                return [3 /*break*/, 8];
            case 7:
                e_1 = _a.sent();
                actualOutput = "Error generating output: ".concat(e_1.message);
                return [3 /*break*/, 8];
            case 8:
                evalPrompt = (0, systemPrompts_js_1.getEvalPrompt)(promptContent, testCase.input, testCase.expectedOutput, actualOutput);
                evaluation = { score: 0, reasoning: 'Failed to evaluate', passed: false, metrics: {} };
                _a.label = 9;
            case 9:
                _a.trys.push([9, 11, , 12]);
                return [4 /*yield*/, ai.models.generateContent({
                        model: 'gemini-3.1-pro-preview',
                        contents: evalPrompt,
                        config: { responseMimeType: 'application/json' }
                    })];
            case 10:
                evalResponse = _a.sent();
                evaluation = JSON.parse(evalResponse.text || '{}');
                return [3 /*break*/, 12];
            case 11:
                e_2 = _a.sent();
                console.error('Eval error:', e_2);
                return [3 /*break*/, 12];
            case 12:
                res.json({
                    testCaseId: testCase.id,
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: actualOutput,
                    score: evaluation.score || 0,
                    reasoning: evaluation.reasoning || '',
                    passed: evaluation.passed || false,
                    metrics: evaluation.metrics || {}
                });
                return [3 /*break*/, 14];
            case 13:
                error_4 = _a.sent();
                res.status(500).json({ error: error_4.message });
                return [3 /*break*/, 14];
            case 14: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
