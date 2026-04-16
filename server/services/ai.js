"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThinkingLevel = void 0;
exports.generateContentWithRetry = generateContentWithRetry;
exports.sendMessageWithRetry = sendMessageWithRetry;
const genai_1 = require("@google/genai");
Object.defineProperty(exports, "ThinkingLevel", { enumerable: true, get: function () { return genai_1.ThinkingLevel; } });
const logger_js_1 = require("./logger.js");
/**
 * Helper to check if a model supports thinkingConfig
 */
function supportsThinking(model) {
    // Only Gemini 3 series models support thinkingConfig
    return model.includes('gemini-3');
}
/**
 * Sanitize parameters for Gemini API calls
 */
function sanitizeParams(params) {
    if (!params.config)
        return;
    const model = params.model || '';
    if (params.config.thinkingConfig) {
        const level = params.config.thinkingConfig.thinkingLevel;
        if (!supportsThinking(model)) {
            logger_js_1.logger.warn('Removing thinkingConfig for unsupported model', { model });
            delete params.config.thinkingConfig;
        }
        else {
            // ThinkingLevel.MINIMAL is not available for gemini-3.1-pro-preview
            if (level === genai_1.ThinkingLevel.MINIMAL && model.includes('pro')) {
                logger_js_1.logger.warn('Removing ThinkingLevel.MINIMAL for Pro model', { model });
                delete params.config.thinkingConfig;
            }
            // If it's MINIMAL, it's often the default, so we can omit it to be safe
            else if (level === genai_1.ThinkingLevel.MINIMAL) {
                delete params.config.thinkingConfig;
            }
        }
    }
    // Ensure no thinking_budget is sent if thinkingConfig is present (or even if not, to be safe)
    // The SDK might add it, so we explicitly clean up if it's there
    if (params.config.thinking_budget) {
        delete params.config.thinking_budget;
    }
}
/**
 * Helper to call Gemini with exponential backoff retry logic
 * Handles 503 (Service Unavailable) and 429 (Too Many Requests) errors
 */
async function generateContentWithRetry(apiKey, params, maxRetries = 3) {
    const ai = new genai_1.GoogleGenAI({ apiKey });
    let lastError;
    sanitizeParams(params);
    logger_js_1.logger.info('AI Request', {
        model: params.model,
        hasSystemInstruction: !!params.config?.systemInstruction,
        hasThinking: !!params.config?.thinkingConfig,
        thinkingLevel: params.config?.thinkingConfig?.thinkingLevel
    });
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent(params);
            logger_js_1.logger.info('AI Response', { model: params.model, text: response.text });
            return response;
        }
        catch (error) {
            lastError = error;
            const errorStr = JSON.stringify(error).toLowerCase();
            const isRetryable = errorStr.includes('503') ||
                errorStr.includes('429') ||
                errorStr.includes('high demand') ||
                errorStr.includes('unavailable') ||
                errorStr.includes('deadline_exceeded') ||
                error.status === 'UNAVAILABLE' ||
                error.code === 503 ||
                error.error?.code === 503 ||
                error.error?.status === 'UNAVAILABLE';
            if (isRetryable && attempt < maxRetries) {
                // Увеличенные интервалы: 3с, 6с, 12с
                const delay = Math.pow(2, attempt) * 3000 + Math.random() * 1000;
                logger_js_1.logger.warn(`Gemini API busy (attempt ${attempt + 1}/${maxRetries + 1}). Retrying...`, { delay: Math.round(delay), error: error.message || error.status });
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            logger_js_1.logger.error('Gemini API Error', error, { model: params.model, attempt: attempt + 1 });
            if (isRetryable) {
                throw new Error('Сервис временно недоступен (503). Это может быть связано с перегрузкой API или ограничениями вашего API-ключа/квот. Попробуйте использовать другую модель в настройках или подождите пару минут.');
            }
            throw error;
        }
    }
    throw new Error('Не удалось получить ответ от AI после нескольких попыток. Пожалуйста, проверьте настройки API-ключа или попробуйте позже.');
}
/**
 * Helper to send chat messages with exponential backoff retry logic
 */
async function sendMessageWithRetry(chat, message, maxRetries = 3) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await chat.sendMessage({ message });
            return response;
        }
        catch (error) {
            lastError = error;
            const errorStr = JSON.stringify(error).toLowerCase();
            const isRetryable = errorStr.includes('503') ||
                errorStr.includes('429') ||
                errorStr.includes('high demand') ||
                errorStr.includes('unavailable') ||
                errorStr.includes('deadline_exceeded') ||
                error.status === 'UNAVAILABLE' ||
                error.code === 503 ||
                error.error?.code === 503 ||
                error.error?.status === 'UNAVAILABLE';
            if (isRetryable && attempt < maxRetries) {
                // Увеличенные интервалы: 2с, 4с, 8с
                const delay = Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000;
                logger_js_1.logger.info(`Gemini Chat API busy (attempt ${attempt + 1}/${maxRetries + 1}). Retrying...`, { delay: Math.round(delay), error: error.message || error.status });
                console.warn(`Gemini Chat API busy (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${Math.round(delay)}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            logger_js_1.logger.error('Gemini Chat API Error', error, { attempt: attempt + 1 });
            if (isRetryable) {
                throw new Error('Сервис временно недоступен (503). Пожалуйста, попробуйте снова через минуту.');
            }
            throw error;
        }
    }
    throw new Error('Не удалось получить ответ от AI после нескольких попыток.');
}
