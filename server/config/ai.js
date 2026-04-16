"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_CONFIG = void 0;
const ai_js_1 = require("../services/ai.js");
exports.AI_CONFIG = {
    defaults: {
        // Дефолтные модели для разных категорий (используются при инициализации настроек)
        models: {
            analysis: 'gemini-3.1-flash-lite-preview',
            improvement: 'gemini-3.1-flash-lite-preview',
            test: 'gemini-3.1-flash-lite-preview'
        },
        // Уровни размышлений для разных типов операций
        thinkingLevels: {
            analysis: ai_js_1.ThinkingLevel.LOW,
            improvement: ai_js_1.ThinkingLevel.LOW,
            generation: ai_js_1.ThinkingLevel.LOW,
            extraction: ai_js_1.ThinkingLevel.LOW,
            evaluation: ai_js_1.ThinkingLevel.LOW,
            testChat: ai_js_1.ThinkingLevel.MINIMAL,
            keyTest: ai_js_1.ThinkingLevel.MINIMAL
        }
    }
};
