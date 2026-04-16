"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_js_1 = __importDefault(require("../services/prisma.js"));
const auth_js_1 = require("../middleware/auth.js");
const crypto_js_1 = require("../services/crypto.js");
const genai_1 = require("@google/genai");
const systemPrompts_js_1 = require("../prompts/systemPrompts.js");
const ai_js_1 = require("../services/ai.js");
const ai_js_2 = require("../config/ai.js");
const logger_js_1 = require("../services/logger.js");
const router = express_1.default.Router();
router.post('/prompt/:promptId/generate-scenarios', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { scenarioCount = 5 } = req.body;
        const promptId = req.params.promptId;
        const prompt = await prisma_js_1.default.prompt.findUnique({ where: { id: promptId } });
        if (!prompt || prompt.userId !== req.user.id)
            return res.status(404).json({ error: 'Prompt not found' });
        const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google');
        const apiKey = userKey || process.env.GEMINI_API_KEY;
        if (!apiKey)
            throw new Error('Google Gemini API key is not configured');
        const ai = new genai_1.GoogleGenAI({ apiKey });
        const user = await prisma_js_1.default.user.findUnique({ where: { id: req.user.id } });
        const model = user?.analysisModel;
        if (!model) {
            return res.status(400).json({ error: 'Модель для анализа не выбрана в настройках' });
        }
        logger_js_1.logger.info('Generating test scenarios', { promptId, model });
        const systemInstruction = (0, systemPrompts_js_1.getTestingPrompt)(prompt.content, scenarioCount);
        const response = await (0, ai_js_1.generateContentWithRetry)(apiKey, {
            model,
            contents: 'Сгенерируй тестовые сценарии.',
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingLevel: ai_js_2.AI_CONFIG.defaults.thinkingLevels.generation },
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
        });
        const text = response.text || '[]';
        const scenarios = JSON.parse(text);
        const createdTestCases = [];
        for (const scenario of scenarios) {
            const tc = await prisma_js_1.default.testCase.create({
                data: {
                    promptId,
                    input: scenario.input,
                    expectedOutput: scenario.expected_aspects.join(', ')
                }
            });
            createdTestCases.push(tc);
        }
        res.json(createdTestCases);
    }
    catch (error) {
        console.error('Generate scenarios error:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/prompt/:promptId', auth_js_1.requireAuth, async (req, res) => {
    const prompt = await prisma_js_1.default.prompt.findUnique({ where: { id: req.params.promptId } });
    if (!prompt || prompt.userId !== req.user.id)
        return res.status(404).json({ error: 'Not found' });
    const testCases = await prisma_js_1.default.testCase.findMany({
        where: { promptId: req.params.promptId },
        orderBy: { createdAt: 'asc' },
    });
    res.json(testCases);
});
router.post('/prompt/:promptId', auth_js_1.requireAuth, async (req, res) => {
    const { input, expectedOutput } = req.body;
    const prompt = await prisma_js_1.default.prompt.findUnique({ where: { id: req.params.promptId } });
    if (!prompt || prompt.userId !== req.user.id)
        return res.status(404).json({ error: 'Not found' });
    const testCase = await prisma_js_1.default.testCase.create({
        data: {
            promptId: req.params.promptId,
            input,
            expectedOutput,
        }
    });
    res.json(testCase);
});
router.put('/:id', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { input, expectedOutput } = req.body;
        const testCase = await prisma_js_1.default.testCase.findUnique({
            where: { id: req.params.id },
            include: { prompt: true }
        });
        if (!testCase || testCase.prompt.userId !== req.user.id)
            return res.status(404).json({ error: 'Not found' });
        const updated = await prisma_js_1.default.testCase.update({
            where: { id: req.params.id },
            data: { input, expectedOutput }
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.delete('/:id', auth_js_1.requireAuth, async (req, res) => {
    try {
        const testCase = await prisma_js_1.default.testCase.findUnique({
            where: { id: req.params.id },
            include: { prompt: true }
        });
        if (!testCase || testCase.prompt.userId !== req.user.id)
            return res.status(404).json({ error: 'Not found' });
        await prisma_js_1.default.testCase.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Run Single Test
router.post('/:id/run', auth_js_1.requireAuth, async (req, res) => {
    try {
        const testCaseId = req.params.id;
        const { versionId } = req.body || {};
        const testCase = await prisma_js_1.default.testCase.findUnique({
            where: { id: testCaseId },
            include: { prompt: true }
        });
        if (!testCase || testCase.prompt.userId !== req.user.id) {
            return res.status(404).json({ error: 'Test case not found' });
        }
        let promptContent = testCase.prompt.content;
        if (versionId) {
            const version = await prisma_js_1.default.promptVersion.findUnique({
                where: { id: versionId }
            });
            if (version && version.promptId === testCase.promptId) {
                promptContent = version.content;
            }
        }
        const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google');
        const apiKey = userKey || process.env.GEMINI_API_KEY;
        if (!apiKey)
            throw new Error('Google Gemini API key is not configured in settings');
        const ai = new genai_1.GoogleGenAI({ apiKey });
        const user = await prisma_js_1.default.user.findUnique({ where: { id: req.user.id } });
        const testModel = user?.testModel;
        const analysisModel = user?.analysisModel;
        if (!testModel || !analysisModel) {
            return res.status(400).json({ error: 'Модели для тестирования или анализа не выбраны в настройках' });
        }
        logger_js_1.logger.info('Running test case', { promptId: testCase.promptId, testCaseId, testModel, analysisModel });
        // 1. Generate actual output
        let actualOutput = '';
        try {
            const genResponse = await (0, ai_js_1.generateContentWithRetry)(apiKey, {
                model: testModel,
                contents: testCase.input,
                config: {
                    systemInstruction: promptContent,
                }
            });
            actualOutput = genResponse.text || '';
        }
        catch (e) {
            logger_js_1.logger.error('Failed to generate output for test case', e, { testCaseId });
            actualOutput = `Error generating output: ${e.message}`;
        }
        // 2. Evaluate output
        const evalPrompt = (0, systemPrompts_js_1.getEvalPrompt)(promptContent, testCase.input, testCase.expectedOutput, actualOutput);
        let evaluation = { score: 0, reasoning: 'Failed to evaluate', passed: false, metrics: {} };
        try {
            const evalResponse = await (0, ai_js_1.generateContentWithRetry)(apiKey, {
                model: analysisModel,
                contents: evalPrompt,
                config: {
                    responseMimeType: 'application/json',
                    thinkingConfig: { thinkingLevel: ai_js_2.AI_CONFIG.defaults.thinkingLevels.evaluation }
                }
            });
            evaluation = JSON.parse(evalResponse.text || '{}');
        }
        catch (e) {
            logger_js_1.logger.error('Failed to evaluate test case', e, { testCaseId });
            console.error('Eval error:', e);
        }
        res.json({
            testCaseId: testCase.id,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput,
            score: evaluation.score || 0,
            reasoning: evaluation.reasoning || '',
            passed: evaluation.passed || false,
            metrics: evaluation.metrics || {}
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
