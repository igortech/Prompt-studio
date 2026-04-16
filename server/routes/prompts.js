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
const ai_js_1 = require("../services/ai.js");
const systemPrompts_js_1 = require("../prompts/systemPrompts.js");
const ai_js_2 = require("../config/ai.js");
const logger_js_1 = require("../services/logger.js");
const router = express_1.default.Router();
router.get('/', auth_js_1.requireAuth, async (req, res) => {
    const prompts = await prisma_js_1.default.prompt.findMany({
        where: { userId: req.user.id },
        orderBy: { updatedAt: 'desc' },
    });
    res.json(prompts);
});
router.post('/', auth_js_1.requireAuth, async (req, res) => {
    const { name, description, content } = req.body;
    const prompt = await prisma_js_1.default.prompt.create({
        data: {
            userId: req.user.id,
            name,
            description,
            content,
        }
    });
    res.json(prompt);
});
router.get('/:id', auth_js_1.requireAuth, async (req, res) => {
    const prompt = await prisma_js_1.default.prompt.findUnique({
        where: { id: req.params.id },
        include: { versions: { orderBy: { version: 'desc' } } },
    });
    if (!prompt || prompt.userId !== req.user.id)
        return res.status(404).json({ error: 'Not found' });
    res.json(prompt);
});
router.put('/:id', auth_js_1.requireAuth, async (req, res) => {
    const { name, description, content, saveVersion, changeNote, analysis } = req.body;
    const prompt = await prisma_js_1.default.prompt.findUnique({ where: { id: req.params.id } });
    if (!prompt || prompt.userId !== req.user.id)
        return res.status(404).json({ error: 'Not found' });
    const finalContent = content !== undefined ? content : prompt.content;
    const finalAnalysis = analysis !== undefined
        ? (analysis === null ? null : (typeof analysis === 'string' ? analysis : JSON.stringify(analysis)))
        : prompt.analysis;
    if (saveVersion) {
        const versions = await prisma_js_1.default.promptVersion.findMany({
            where: { promptId: prompt.id },
            orderBy: { version: 'desc' },
            take: 1
        });
        const lastVersionContent = versions.length > 0 ? versions[0].content : null;
        // Create a new version only if the content has changed since the last version
        // or if there are no versions yet.
        if (finalContent !== lastVersionContent) {
            const nextVersion = versions.length > 0 ? versions[0].version + 1 : 1;
            await prisma_js_1.default.promptVersion.create({
                data: {
                    promptId: prompt.id,
                    version: nextVersion,
                    content: finalContent,
                    changeNote: changeNote || 'Сохранение версии',
                    analysis: finalAnalysis
                }
            });
            // Keep only the last 10 versions
            const allVersions = await prisma_js_1.default.promptVersion.findMany({
                where: { promptId: prompt.id },
                orderBy: { version: 'desc' },
                select: { id: true }
            });
            if (allVersions.length > 10) {
                const versionsToDelete = allVersions.slice(10).map(v => v.id);
                await prisma_js_1.default.promptVersion.deleteMany({
                    where: { id: { in: versionsToDelete } }
                });
            }
        }
        else if (versions.length > 0 && finalAnalysis !== undefined) {
            // If content is the same, but analysis is provided, update the latest version's analysis
            await prisma_js_1.default.promptVersion.update({
                where: { id: versions[0].id },
                data: { analysis: finalAnalysis }
            });
        }
    }
    const dataToUpdate = {};
    if (name !== undefined)
        dataToUpdate.name = name;
    if (description !== undefined)
        dataToUpdate.description = description;
    if (content !== undefined)
        dataToUpdate.content = content;
    if (analysis !== undefined)
        dataToUpdate.analysis = finalAnalysis;
    const updated = await prisma_js_1.default.prompt.update({
        where: { id: req.params.id },
        data: dataToUpdate,
        include: { versions: { orderBy: { version: 'desc' } } }
    });
    res.json(updated);
});
router.get('/:id/export', auth_js_1.requireAuth, async (req, res) => {
    const prompt = await prisma_js_1.default.prompt.findUnique({
        where: { id: req.params.id },
        include: {
            versions: true,
            messages: true,
            testCases: true
        }
    });
    if (!prompt || prompt.userId !== req.user.id)
        return res.status(404).json({ error: 'Not found' });
    const exportData = {
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
});
router.post('/import', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { prompt, history } = req.body;
        if (!prompt || !prompt.name || !prompt.content) {
            return res.status(400).json({ error: 'Invalid import format' });
        }
        const newPrompt = await prisma_js_1.default.prompt.create({
            data: {
                userId: req.user.id,
                name: prompt.name + ' (Imported)',
                description: prompt.description,
                content: prompt.content,
                versions: {
                    create: history?.versions?.map((v) => ({
                        version: v.version,
                        content: v.content,
                        changeNote: v.changeNote,
                        createdAt: v.createdAt
                    })) || []
                },
                messages: {
                    create: history?.messages?.map((m) => ({
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
                    })) || []
                },
                testCases: {
                    create: history?.testCases?.map((tc) => ({
                        input: tc.input,
                        expectedOutput: tc.expectedOutput,
                        createdAt: tc.createdAt,
                        updatedAt: tc.updatedAt
                    })) || []
                }
            }
        });
        res.json(newPrompt);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.delete('/:id', auth_js_1.requireAuth, async (req, res) => {
    const prompt = await prisma_js_1.default.prompt.findUnique({ where: { id: req.params.id } });
    if (!prompt || prompt.userId !== req.user.id)
        return res.status(404).json({ error: 'Not found' });
    await prisma_js_1.default.prompt.delete({ where: { id: req.params.id } });
    res.json({ success: true });
});
router.get('/versions/:versionId', auth_js_1.requireAuth, async (req, res) => {
    const version = await prisma_js_1.default.promptVersion.findUnique({
        where: { id: req.params.versionId },
        include: { prompt: true }
    });
    if (!version || version.prompt.userId !== req.user.id)
        return res.status(404).json({ error: 'Not found' });
    res.json(version);
});
// Analyze Prompt
router.post('/:id/analyze', auth_js_1.requireAuth, async (req, res) => {
    try {
        const prompt = await prisma_js_1.default.prompt.findUnique({ where: { id: req.params.id } });
        if (!prompt || prompt.userId !== req.user.id)
            return res.status(404).json({ error: 'Not found' });
        const user = await prisma_js_1.default.user.findUnique({ where: { id: req.user.id } });
        const provider = user?.analysisProvider || 'google';
        const model = user?.analysisModel;
        if (!model) {
            return res.status(400).json({ error: 'Модель для анализа не выбрана в настройках' });
        }
        logger_js_1.logger.info('Analyzing prompt', { promptId: prompt.id, model, provider });
        const analysisPrompt = (0, systemPrompts_js_1.getAnalysisPrompt)(prompt.content);
        let analysisResult = {};
        const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google');
        const apiKey = userKey || process.env.GEMINI_API_KEY;
        if (provider === 'google') {
            if (!apiKey)
                throw new Error('Google Gemini API key is not configured');
            const response = await (0, ai_js_1.generateContentWithRetry)(apiKey, {
                model,
                contents: analysisPrompt,
                config: {
                    responseMimeType: 'application/json',
                    thinkingConfig: { thinkingLevel: ai_js_2.AI_CONFIG.defaults.thinkingLevels.analysis }
                }
            });
            analysisResult = JSON.parse(response.text || '{}');
        }
        else if (provider === 'ollama') {
            const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'ollama');
            if (!userKey)
                throw new Error('Ollama API key is not configured in settings');
            const endpoint = process.env.OLLAMA_ENDPOINT;
            if (!endpoint)
                throw new Error('OLLAMA_ENDPOINT environment variable is not configured');
            logger_js_1.logger.info('Analyze Request (Ollama)', { model, prompt: analysisPrompt });
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    prompt: analysisPrompt + "\n\nIMPORTANT: Return ONLY a valid JSON object.",
                    stream: false,
                    format: 'json'
                })
            });
            if (!response.ok) {
                const err = await response.text();
                logger_js_1.logger.error('Analyze Error (Ollama)', err);
                throw new Error(`Ollama error: ${err}`);
            }
            const data = await response.json();
            // @ts-ignore
            logger_js_1.logger.info('Analyze Response (Ollama)', { model, response: data.response });
            // @ts-ignore
            analysisResult = JSON.parse(data.response || '{}');
        }
        res.json(analysisResult);
    }
    catch (error) {
        console.error('Analyze error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Improve Prompt
router.post('/:id/improve', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { analysisResult } = req.body;
        const prompt = await prisma_js_1.default.prompt.findUnique({ where: { id: req.params.id } });
        if (!prompt || prompt.userId !== req.user.id)
            return res.status(404).json({ error: 'Not found' });
        const user = await prisma_js_1.default.user.findUnique({ where: { id: req.user.id } });
        const provider = user?.improvementProvider || 'google';
        const model = user?.improvementModel;
        if (!model) {
            return res.status(400).json({ error: 'Модель для улучшения не выбрана в настройках' });
        }
        logger_js_1.logger.info('Improving prompt', { promptId: prompt.id, model, provider });
        const improvePrompt = (0, systemPrompts_js_1.getImprovePrompt)(prompt.content, analysisResult);
        let improveResult = {};
        const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google');
        const apiKey = userKey || process.env.GEMINI_API_KEY;
        if (provider === 'google') {
            if (!apiKey)
                throw new Error('Google Gemini API key is not configured');
            const response = await (0, ai_js_1.generateContentWithRetry)(apiKey, {
                model,
                contents: improvePrompt,
                config: {
                    responseMimeType: 'application/json',
                    thinkingConfig: { thinkingLevel: ai_js_2.AI_CONFIG.defaults.thinkingLevels.improvement }
                }
            });
            improveResult = JSON.parse(response.text || '{}');
        }
        else if (provider === 'ollama') {
            const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'ollama');
            if (!userKey)
                throw new Error('Ollama API key is not configured in settings');
            const endpoint = process.env.OLLAMA_ENDPOINT;
            if (!endpoint)
                throw new Error('OLLAMA_ENDPOINT environment variable is not configured');
            logger_js_1.logger.info('Improve Request (Ollama)', { model, prompt: improvePrompt });
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    prompt: improvePrompt + "\n\nIMPORTANT: Return ONLY a valid JSON object.",
                    stream: false,
                    format: 'json'
                })
            });
            if (!response.ok) {
                const err = await response.text();
                logger_js_1.logger.error('Improve Error (Ollama)', err);
                throw new Error(`Ollama error: ${err}`);
            }
            const data = await response.json();
            // @ts-ignore
            logger_js_1.logger.info('Improve Response (Ollama)', { model, response: data.response });
            // @ts-ignore
            improveResult = JSON.parse(data.response || '{}');
        }
        res.json(improveResult);
    }
    catch (error) {
        console.error('Improve error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Improvement Chat
router.post('/:id/improvement-chat', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { message, history } = req.body;
        const prompt = await prisma_js_1.default.prompt.findUnique({ where: { id: req.params.id } });
        if (!prompt || prompt.userId !== req.user.id)
            return res.status(404).json({ error: 'Not found' });
        const user = await prisma_js_1.default.user.findUnique({ where: { id: req.user.id } });
        const provider = user?.improvementProvider || 'google';
        const model = user?.improvementModel;
        if (!model) {
            return res.status(400).json({ error: 'Модель для улучшения не выбрана в настройках' });
        }
        logger_js_1.logger.info('Chat with prompt', { promptId: prompt.id, model, provider });
        // Get recent chat messages for context (only 3 messages by default)
        const testHistory = await prisma_js_1.default.message.findMany({
            where: { promptId: prompt.id },
            orderBy: { createdAt: 'desc' },
            take: 3
        });
        const analysisResult = prompt.analysis ? JSON.parse(prompt.analysis) : null;
        const systemInstruction = (0, systemPrompts_js_1.getChatSystemInstruction)(prompt.content, testHistory.reverse(), analysisResult);
        let result = { message: '', action: 'none', full_prompt_preview: '', suggested_changes: { reasoning: '' } };
        const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google');
        const apiKey = userKey || process.env.GEMINI_API_KEY;
        if (provider === 'google') {
            if (!apiKey)
                throw new Error('Google Gemini API key is not configured');
            const messages = [
                ...history.map((msg) => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                })),
                { role: 'user', parts: [{ text: message }] }
            ];
            const response = await (0, ai_js_1.generateContentWithRetry)(apiKey, {
                model,
                contents: messages,
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    thinkingConfig: { thinkingLevel: ai_js_2.AI_CONFIG.defaults.thinkingLevels.improvement }
                }
            });
            result = JSON.parse(response.text || '{}');
        }
        else if (provider === 'ollama') {
            const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'ollama');
            if (!userKey)
                throw new Error('Ollama API key is not configured in settings');
            const endpoint = process.env.OLLAMA_ENDPOINT;
            if (!endpoint)
                throw new Error('OLLAMA_ENDPOINT environment variable is not configured');
            const messages = [
                { role: 'system', content: systemInstruction },
                ...history.map((msg) => ({ role: msg.role, content: msg.content })),
                { role: 'user', content: message + "\n\nIMPORTANT: Return ONLY a valid JSON object." }
            ];
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages,
                    stream: false,
                    format: 'json'
                })
            });
            if (!response.ok)
                throw new Error(`Ollama error: ${await response.text()}`);
            const data = await response.json();
            // @ts-ignore
            result = JSON.parse(data.message?.content || '{}');
        }
        res.json({
            text: result.message,
            has_changes: result.action === 'suggest' || result.action === 'apply',
            improved_prompt: result.full_prompt_preview,
            diff_summary: result.suggested_changes?.reasoning || 'AI suggestions'
        });
    }
    catch (error) {
        console.error('Improvement chat error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Run Tests (Batch Evaluation)
router.post('/:id/run-tests', auth_js_1.requireAuth, async (req, res) => {
    try {
        const promptId = req.params.id;
        const { versionId } = req.body || {};
        const prompt = await prisma_js_1.default.prompt.findUnique({ where: { id: promptId } });
        if (!prompt || prompt.userId !== req.user.id)
            return res.status(404).json({ error: 'Prompt not found' });
        let promptContent = prompt.content;
        if (versionId) {
            const version = await prisma_js_1.default.promptVersion.findUnique({ where: { id: versionId } });
            if (version && version.promptId === promptId) {
                promptContent = version.content;
            }
        }
        const testCases = await prisma_js_1.default.testCase.findMany({
            where: { promptId },
            orderBy: { createdAt: 'asc' }
        });
        if (testCases.length === 0) {
            return res.status(400).json({ error: 'No test cases found for this prompt.' });
        }
        const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google');
        const apiKey = userKey || process.env.GEMINI_API_KEY;
        if (!apiKey)
            throw new Error('Google Gemini API key is not configured in settings');
        const ai = new genai_1.GoogleGenAI({ apiKey });
        const user = await prisma_js_1.default.user.findUnique({ where: { id: req.user.id } });
        const testProvider = user?.testProvider || 'google';
        const testModel = user?.testModel;
        const analysisProvider = user?.analysisProvider || 'google';
        const analysisModel = user?.analysisModel;
        if (!testModel || !analysisModel) {
            return res.status(400).json({ error: 'Модели для тестирования или анализа не выбраны в настройках' });
        }
        logger_js_1.logger.info('Running all tests', { promptId: prompt.id, testModel, analysisModel });
        const results = [];
        let totalScore = 0;
        // Run tests sequentially to avoid rate limits
        for (const tc of testCases) {
            // 1. Generate actual output
            let actualOutput = '';
            try {
                if (testProvider === 'google') {
                    const genResponse = await (0, ai_js_1.generateContentWithRetry)(apiKey, {
                        model: testModel,
                        contents: tc.input,
                        config: {
                            systemInstruction: promptContent,
                        }
                    });
                    actualOutput = genResponse.text || '';
                }
                else if (testProvider === 'ollama') {
                    const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'ollama');
                    const endpoint = process.env.OLLAMA_ENDPOINT;
                    if (!endpoint)
                        throw new Error('OLLAMA_ENDPOINT environment variable is not configured');
                    const response = await fetch(endpoint, {
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
                    });
                    const data = await response.json();
                    // @ts-ignore
                    actualOutput = data.message?.content || '';
                }
            }
            catch (e) {
                actualOutput = `Error generating output: ${e.message}`;
            }
            // 2. Evaluate output
            const evalPrompt = (0, systemPrompts_js_1.getEvalPrompt)(promptContent, tc.input, tc.expectedOutput, actualOutput);
            let evaluation = { score: 0, reasoning: 'Failed to evaluate', passed: false, metrics: {} };
            try {
                if (analysisProvider === 'google') {
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
                else if (analysisProvider === 'ollama') {
                    const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'ollama');
                    const endpoint = process.env.OLLAMA_ENDPOINT;
                    if (!endpoint)
                        throw new Error('OLLAMA_ENDPOINT environment variable is not configured');
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: analysisModel,
                            prompt: evalPrompt + "\n\nIMPORTANT: Return ONLY a valid JSON object.",
                            stream: false,
                            format: 'json'
                        })
                    });
                    const data = await response.json();
                    // @ts-ignore
                    evaluation = JSON.parse(data.response || '{}');
                }
            }
            catch (e) {
                console.error('Eval error:', e);
            }
            totalScore += evaluation.score || 0;
            results.push({
                testCaseId: tc.id,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                actualOutput,
                score: evaluation.score || 0,
                reasoning: evaluation.reasoning || '',
                passed: evaluation.passed || false,
                metrics: evaluation.metrics || {}
            });
        }
        const overallScore = results.length > 0 ? (totalScore / results.length).toFixed(1) : 0;
        const passedCount = results.filter(r => r.passed).length;
        res.json({
            overallScore: Number(overallScore),
            passedCount,
            totalCount: results.length,
            results
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Generate Prompt from Fields
router.post('/generate-from-fields', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { fields } = req.body;
        const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google');
        const apiKey = userKey || process.env.GEMINI_API_KEY;
        if (!apiKey)
            throw new Error('Google Gemini API key is not configured');
        const user = await prisma_js_1.default.user.findUnique({ where: { id: req.user.id } });
        const model = user?.analysisModel;
        if (!model) {
            return res.status(400).json({ error: 'Модель для генерации не выбрана в настройках' });
        }
        logger_js_1.logger.info('Generating prompt from fields', { model });
        const prompt = (0, systemPrompts_js_1.getPromptGenerationPrompt)(fields);
        const response = await (0, ai_js_1.generateContentWithRetry)(apiKey, {
            model: model,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingLevel: ai_js_2.AI_CONFIG.defaults.thinkingLevels.generation }
            }
        });
        res.json(JSON.parse(response.text || '{}'));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Extract Fields from Text
router.post('/extract-fields', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { text } = req.body;
        const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google');
        const apiKey = userKey || process.env.GEMINI_API_KEY;
        if (!apiKey)
            throw new Error('Google Gemini API key is not configured');
        const user = await prisma_js_1.default.user.findUnique({ where: { id: req.user.id } });
        const model = user?.analysisModel;
        if (!model) {
            return res.status(400).json({ error: 'Модель для извлечения не выбрана в настройках' });
        }
        logger_js_1.logger.info('Extracting fields from text', { model });
        const prompt = (0, systemPrompts_js_1.getPromptExtractionPrompt)(text);
        const response = await (0, ai_js_1.generateContentWithRetry)(apiKey, {
            model: model,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingLevel: ai_js_2.AI_CONFIG.defaults.thinkingLevels.extraction }
            }
        });
        res.json(JSON.parse(response.text || '{}'));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Extract Metadata from Prompt
router.post('/extract-metadata', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { text } = req.body;
        const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google');
        const apiKey = userKey || process.env.GEMINI_API_KEY;
        if (!apiKey)
            throw new Error('Google Gemini API key is not configured');
        const user = await prisma_js_1.default.user.findUnique({ where: { id: req.user.id } });
        const model = user?.analysisModel;
        if (!model) {
            return res.status(400).json({ error: 'Модель для извлечения метаданных не выбрана в настройках' });
        }
        logger_js_1.logger.info('Extracting metadata from prompt', { model });
        const prompt = (0, systemPrompts_js_1.getPromptMetadataExtractionPrompt)(text);
        const response = await (0, ai_js_1.generateContentWithRetry)(apiKey, {
            model: model,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingLevel: ai_js_2.AI_CONFIG.defaults.thinkingLevels.extraction }
            }
        });
        res.json(JSON.parse(response.text || '{}'));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Optimize Prompt from Test Results
router.post('/:id/optimize-from-tests', auth_js_1.requireAuth, async (req, res) => {
    try {
        const promptId = req.params.id;
        const { testResults } = req.body;
        if (!testResults || !testResults.results || testResults.results.length === 0) {
            return res.status(400).json({ error: 'No test results provided' });
        }
        const prompt = await prisma_js_1.default.prompt.findUnique({ where: { id: promptId } });
        if (!prompt || prompt.userId !== req.user.id)
            return res.status(404).json({ error: 'Prompt not found' });
        const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google');
        const apiKey = userKey || process.env.GEMINI_API_KEY;
        if (!apiKey)
            throw new Error('Google Gemini API key is not configured');
        const user = await prisma_js_1.default.user.findUnique({ where: { id: req.user.id } });
        const improvementModel = user?.improvementModel;
        if (!improvementModel) {
            return res.status(400).json({ error: 'Модель для улучшения не выбрана в настройках' });
        }
        logger_js_1.logger.info('Optimizing prompt from tests', { promptId, model: improvementModel });
        const optimizationPrompt = (0, systemPrompts_js_1.getTestOptimizationPrompt)(prompt.content, testResults);
        const response = await (0, ai_js_1.generateContentWithRetry)(apiKey, {
            model: improvementModel,
            contents: optimizationPrompt,
            config: {
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingLevel: ai_js_2.AI_CONFIG.defaults.thinkingLevels.improvement }
            }
        });
        res.json(JSON.parse(response.text || '{}'));
    }
    catch (error) {
        logger_js_1.logger.error('Optimization error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
