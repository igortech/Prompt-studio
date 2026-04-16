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
const ai_js_2 = require("../config/ai.js");
const logger_js_1 = require("../services/logger.js");
const router = express_1.default.Router();
router.get('/prompt/:promptId', auth_js_1.requireAuth, async (req, res) => {
    const prompt = await prisma_js_1.default.prompt.findUnique({ where: { id: req.params.promptId } });
    if (!prompt || prompt.userId !== req.user.id)
        return res.status(404).json({ error: 'Not found' });
    const messages = await prisma_js_1.default.message.findMany({
        where: { promptId: req.params.promptId },
        orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
});
router.post('/prompt/:promptId', auth_js_1.requireAuth, async (req, res) => {
    try {
        const { content, parameters, provider, model } = req.body;
        const promptId = req.params.promptId;
        const prompt = await prisma_js_1.default.prompt.findUnique({ where: { id: promptId } });
        if (!prompt || prompt.userId !== req.user.id)
            return res.status(404).json({ error: 'Prompt not found' });
        const user = await prisma_js_1.default.user.findUnique({ where: { id: req.user.id } });
        const finalProvider = provider || user?.testProvider || 'google';
        const finalModel = model || user?.testModel;
        if (!finalModel) {
            return res.status(400).json({ error: 'Модель для теста не выбрана в настройках' });
        }
        logger_js_1.logger.info('Sending chat message', { promptId, model: finalModel, provider: finalProvider });
        // Save user message
        const userMsg = await prisma_js_1.default.message.create({
            data: { promptId, role: 'user', content }
        });
        let assistantContent = '';
        let debugInfo = {};
        let promptTokens = 0;
        let completionTokens = 0;
        let totalTokens = 0;
        let latencyMs = 0;
        const startTime = Date.now();
        console.log(`[Chat] Starting request for prompt ${promptId} with model ${finalModel}`);
        if (finalProvider === 'google') {
            const keyStartTime = Date.now();
            const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google');
            console.log(`[Chat] Key retrieval took ${Date.now() - keyStartTime}ms`);
            const apiKey = userKey || process.env.GEMINI_API_KEY;
            if (!apiKey)
                throw new Error('Google Gemini API key is not configured in settings');
            const ai = new genai_1.GoogleGenAI({ apiKey });
            // Get chat history for context (last 20 messages)
            const historyStartTime = Date.now();
            const history = await prisma_js_1.default.message.findMany({
                where: { promptId },
                orderBy: { createdAt: 'desc' },
                take: 21 // Take 21 to get 20 previous + current
            });
            console.log(`[Chat] History retrieval took ${Date.now() - historyStartTime}ms`);
            const reversedHistory = history.reverse();
            const systemInstruction = prompt.content;
            const formattedHistory = reversedHistory.slice(0, -1).map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));
            const chat = ai.chats.create({
                model: finalModel,
                config: {
                    systemInstruction,
                    thinkingConfig: { thinkingLevel: ai_js_2.AI_CONFIG.defaults.thinkingLevels.testChat }
                },
                history: formattedHistory
            });
            const aiStartTime = Date.now();
            logger_js_1.logger.info('Chat Request (Google)', { model: finalModel, history: formattedHistory, message: content });
            const response = await (0, ai_js_1.sendMessageWithRetry)(chat, content);
            logger_js_1.logger.info('Chat Response (Google)', { model: finalModel, text: response.text });
            console.log(`[Chat] AI response took ${Date.now() - aiStartTime}ms`);
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
                finishReason: response.candidates?.[0]?.finishReason,
                safetyRatings: response.candidates?.[0]?.safetyRatings,
                latencyMs
            };
        }
        else if (finalProvider === 'ollama') {
            // Basic Ollama implementation via fetch
            const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'ollama');
            if (!userKey)
                throw new Error('Ollama API key is not configured in settings');
            // Assuming Ollama Cloud API endpoint or local
            const endpoint = process.env.OLLAMA_ENDPOINT;
            if (!endpoint)
                throw new Error('OLLAMA_ENDPOINT environment variable is not configured');
            const history = await prisma_js_1.default.message.findMany({
                where: { promptId },
                orderBy: { createdAt: 'desc' },
                take: 11
            });
            const reversedHistory = history.reverse();
            const messages = [
                { role: 'system', content: prompt.content },
                ...reversedHistory.slice(0, -1).map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                { role: 'user', content }
            ];
            logger_js_1.logger.info('Chat Request (Ollama)', { model: finalModel, messages });
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: finalModel,
                    messages,
                    stream: false
                })
            });
            if (!response.ok) {
                const err = await response.text();
                logger_js_1.logger.error('Chat Error (Ollama)', err);
                throw new Error(`Ollama error: ${err}`);
            }
            const data = await response.json();
            // @ts-ignore
            logger_js_1.logger.info('Chat Response (Ollama)', { model: finalModel, text: data.message?.content });
            // @ts-ignore
            assistantContent = data.message?.content || '';
            latencyMs = Date.now() - startTime;
            // @ts-ignore
            promptTokens = data.prompt_eval_count || 0;
            // @ts-ignore
            completionTokens = data.eval_count || 0;
            // @ts-ignore
            totalTokens = (data.prompt_eval_count || 0) + (data.eval_count || 0);
            debugInfo = {
                model: finalModel,
                provider: 'ollama',
                // @ts-ignore
                total_duration: data.total_duration,
                // @ts-ignore
                load_duration: data.load_duration,
                // @ts-ignore
                prompt_eval_count: data.prompt_eval_count,
                // @ts-ignore
                eval_count: data.eval_count,
                latencyMs
            };
        }
        // Save assistant message
        const assistantMsg = await prisma_js_1.default.message.create({
            data: {
                promptId,
                role: 'assistant',
                content: assistantContent,
                model: finalModel,
                provider: finalProvider,
                promptTokens,
                completionTokens,
                totalTokens,
                latencyMs,
                debugInfo: JSON.stringify(debugInfo)
            }
        });
        res.json({ userMessage: userMsg, assistantMessage: assistantMsg });
    }
    catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: error.message });
    }
});
router.post('/prompt/:promptId/replay', auth_js_1.requireAuth, async (req, res) => {
    try {
        const promptId = req.params.promptId;
        const { versionId } = req.body;
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
        const user = await prisma_js_1.default.user.findUnique({ where: { id: req.user.id } });
        const finalProvider = user?.testProvider || 'google';
        const finalModel = user?.testModel;
        if (!finalModel) {
            return res.status(400).json({ error: 'Модель для теста не выбрана в настройках' });
        }
        logger_js_1.logger.info('Replaying chat', { promptId, model: finalModel, provider: finalProvider });
        // Get all user messages
        const history = await prisma_js_1.default.message.findMany({
            where: { promptId, role: 'user' },
            orderBy: { createdAt: 'asc' }
        });
        if (history.length === 0) {
            return res.status(400).json({ error: 'No history to replay' });
        }
        // Delete all existing messages for this prompt
        await prisma_js_1.default.message.deleteMany({ where: { promptId } });
        const userKey = await (0, crypto_js_1.getDecryptedKey)(req.user.id, 'google');
        const apiKey = userKey || process.env.GEMINI_API_KEY;
        if (!apiKey)
            throw new Error('Google Gemini API key is not configured');
        const ai = new genai_1.GoogleGenAI({ apiKey });
        const results = [];
        const chat = ai.chats.create({
            model: finalModel,
            config: {
                systemInstruction: promptContent,
                thinkingConfig: { thinkingLevel: ai_js_2.AI_CONFIG.defaults.thinkingLevels.testChat }
            }
        });
        for (const msg of history) {
            // Recreate user message
            await prisma_js_1.default.message.create({
                data: {
                    promptId,
                    role: 'user',
                    content: msg.content
                }
            });
            const startTime = Date.now();
            const response = await chat.sendMessage({ message: msg.content });
            const latencyMs = Date.now() - startTime;
            const assistantContent = response.text || '';
            // Create assistant message
            await prisma_js_1.default.message.create({
                data: {
                    promptId,
                    role: 'assistant',
                    content: assistantContent,
                    model: finalModel,
                    provider: finalProvider,
                    latencyMs
                }
            });
            results.push({
                originalMessage: msg.content,
                newResponse: assistantContent,
                latencyMs
            });
        }
        res.json({ success: true, results });
    }
    catch (error) {
        console.error('Replay error:', error);
        res.status(500).json({ error: error.message });
    }
});
router.delete('/prompt/:promptId', auth_js_1.requireAuth, async (req, res) => {
    const prompt = await prisma_js_1.default.prompt.findUnique({ where: { id: req.params.promptId } });
    if (!prompt || prompt.userId !== req.user.id)
        return res.status(404).json({ error: 'Not found' });
    await prisma_js_1.default.message.deleteMany({ where: { promptId: req.params.promptId } });
    res.json({ success: true });
});
exports.default = router;
