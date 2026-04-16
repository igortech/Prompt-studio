import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { logger } from './logger.js';

export { ThinkingLevel };

/**
 * Helper to check if a model supports thinkingConfig
 */
function supportsThinking(model: string): boolean {
  // Only Gemini 3 series models support thinkingConfig
  return model.includes('gemini-3');
}

/**
 * Sanitize parameters for Gemini API calls
 */
function sanitizeParams(params: any) {
  if (!params.config) return;

  const model = params.model || '';
  
  if (params.config.thinkingConfig) {
    const level = params.config.thinkingConfig.thinkingLevel;

    if (!supportsThinking(model)) {
      logger.warn('Removing thinkingConfig for unsupported model', { model });
      delete params.config.thinkingConfig;
    } else {
      // ThinkingLevel.MINIMAL is not available for gemini-3.1-pro-preview
      if (level === ThinkingLevel.MINIMAL && model.includes('pro')) {
        logger.warn('Removing ThinkingLevel.MINIMAL for Pro model', { model });
        delete params.config.thinkingConfig;
      }
      // If it's MINIMAL, it's often the default, so we can omit it to be safe
      else if (level === ThinkingLevel.MINIMAL) {
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
 * Helper to call Ollama API (OpenAI compatible)
 */
export async function generateContentWithOllama(apiKey: string, params: any) {
  const baseUrl = process.env.OLLAMA_ENDPOINT || 'https://ollama.com/v1';
  const model = params.model;
  const contents = params.contents;
  
  logger.info('Ollama Request', { model, baseUrl });

  try {
    // Ollama uses OpenAI-compatible /chat/completions endpoint
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: contents
          }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Ollama API Error', { status: response.status, body: errorText }, { model });
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || '';
    
    // If response is JSON wrapped in markdown code blocks, extract it
    if (text.includes('```json')) {
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        text = jsonMatch[1];
      }
    } else if (text.includes('```')) {
      const jsonMatch = text.match(/```\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        text = jsonMatch[1];
      }
    }
    
    logger.info('Ollama Response', { model, text });
    
    return {
      text
    };
  } catch (error: any) {
    logger.error('Ollama Request Failed', error, { model });
    throw error;
  }
}

/**
 * Unified function to generate content with any provider
 */
export async function generateContent(apiKey: string, provider: string, params: any) {
  if (provider === 'ollama') {
    return generateContentWithOllama(apiKey, params);
  } else {
    return generateContentWithRetry(apiKey, params);
  }
}

/**
 * Helper to call Gemini with exponential backoff retry logic
 * Handles 503 (Service Unavailable) and 429 (Too Many Requests) errors
 */
export async function generateContentWithRetry(apiKey: string, params: any, maxRetries = 2) {
  const ai = new GoogleGenAI({ apiKey });
  let lastError: any;
  
  sanitizeParams(params);
  
  logger.info('AI Request', { 
    model: params.model, 
    hasSystemInstruction: !!params.config?.systemInstruction,
    hasThinking: !!params.config?.thinkingConfig,
    thinkingLevel: params.config?.thinkingConfig?.thinkingLevel
  });

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent(params);
      logger.info('AI Response', { model: params.model, text: response.text });
      return response;
    } catch (error: any) {
      lastError = error;
      
      const errorStr = JSON.stringify(error).toLowerCase();
      const isServerOverloaded = 
        errorStr.includes('503') || 
        errorStr.includes('high demand') ||
        errorStr.includes('unavailable') ||
        error.status === 'UNAVAILABLE' ||
        error.code === 503 ||
        error.error?.code === 503 ||
        error.error?.status === 'UNAVAILABLE';
      
      const isRateLimited = 
        errorStr.includes('429') ||
        errorStr.includes('quota');

      // If server is overloaded, fail immediately to avoid hammering the API
      if (isServerOverloaded) {
        logger.error('Gemini API overloaded, failing immediately', error, { model: params.model, attempt: attempt + 1 });
        throw new Error('Сервис временно недоступен (503). Это может быть связано с перегрузкой API или ограничениями вашего API-ключа/квот. Попробуйте использовать другую модель в настройках или подождите пару минут.');
      }

      // For rate limiting, retry with backoff
      if (isRateLimited && attempt < maxRetries) {
        const delays = [5000, 10000]; // 5s, 10s
        const delay = delays[attempt] + Math.random() * 1000;
        logger.warn(`Gemini API rate limited (attempt ${attempt + 1}/${maxRetries + 1}). Retrying...`, { delay: Math.round(delay), error: error.message || error.status });
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      logger.error('Gemini API Error', error, { model: params.model, attempt: attempt + 1 });
      throw error;
    }
  }
  
  throw new Error('Не удалось получить ответ от AI после нескольких попыток. Пожалуйста, проверьте настройки API-ключа или попробуйте позже.');
}

/**
 * Helper to send chat messages with exponential backoff retry logic
 */
export async function sendMessageWithRetry(chat: any, message: string, maxRetries = 2) {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await chat.sendMessage({ message });
      return response;
    } catch (error: any) {
      lastError = error;
      
      const errorStr = JSON.stringify(error).toLowerCase();
      const isServerOverloaded = 
        errorStr.includes('503') || 
        errorStr.includes('high demand') ||
        errorStr.includes('unavailable') ||
        error.status === 'UNAVAILABLE' ||
        error.code === 503 ||
        error.error?.code === 503 ||
        error.error?.status === 'UNAVAILABLE';
      
      const isRateLimited = 
        errorStr.includes('429') ||
        errorStr.includes('quota');

      // If server is overloaded, fail immediately
      if (isServerOverloaded) {
        logger.error('Gemini Chat API overloaded, failing immediately', error, { attempt: attempt + 1 });
        throw new Error('Сервис временно недоступен (503). Пожалуйста, попробуйте снова через минуту.');
      }

      // For rate limiting, retry with backoff
      if (isRateLimited && attempt < maxRetries) {
        const delays = [5000, 10000]; // 5s, 10s
        const delay = delays[attempt] + Math.random() * 1000;
        logger.info(`Gemini Chat API rate limited (attempt ${attempt + 1}/${maxRetries + 1}). Retrying...`, { delay: Math.round(delay), error: error.message || error.status });
        console.warn(`Gemini Chat API rate limited (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      logger.error('Gemini Chat API Error', error, { attempt: attempt + 1 });
      throw error;
    }
  }
  
  throw new Error('Не удалось получить ответ от AI после нескольких попыток.');
}
