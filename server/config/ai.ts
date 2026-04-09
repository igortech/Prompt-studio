import { ThinkingLevel } from '../services/ai.js';

export const AI_CONFIG = {
  defaults: {
    // Дефолтные модели для разных категорий (используются при инициализации настроек)
    models: {
      analysis: 'gemini-3.1-flash-lite-preview',
      improvement: 'gemini-3.1-flash-lite-preview',
      test: 'gemini-3.1-flash-lite-preview'
    },
    
    // Уровни размышлений для разных типов операций
    thinkingLevels: {
      analysis: ThinkingLevel.LOW,
      improvement: ThinkingLevel.LOW,
      generation: ThinkingLevel.LOW,
      extraction: ThinkingLevel.LOW,
      evaluation: ThinkingLevel.LOW,
      testChat: ThinkingLevel.MINIMAL,
      keyTest: ThinkingLevel.MINIMAL
    }
  }
};
