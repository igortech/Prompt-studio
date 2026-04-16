export const GOOGLE_MODELS = [
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite', description: 'Быстрая и легкая модель для быстрых операций' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Сбалансированная модель с хорошей скоростью' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', description: 'Мощная модель для сложных задач' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Предыдущее поколение, быстрая обработка' }
];

export const OLLAMA_MODELS = [
  { id: 'gemma4:31b', name: 'Gemma 4 31B', description: 'Лучший баланс качество/скорость' },
  { id: 'gemma4:26b', name: 'Gemma 4 26B-A4B', description: 'Максимум качества при ограниченном VRAM' },
  { id: 'minimax2.5', name: 'MiniMax M2.5', description: 'Агентские задачи / кодинг' },
  { id: 'glm5', name: 'GLM-5', description: 'Длинные контексты / большие выходы' },
  { id: 'qwen3.5:35b', name: 'Qwen 3.5 35B-A3B', description: 'Мультиязычность (201 язык)' },
  { id: 'deepseek-r1:671b', name: 'DeepSeek-R1 671B', description: 'Chain-of-thought reasoning, математика, логика (37B active)' },
  { id: 'llama4:400b', name: 'Llama 4 Maverick 400B', description: 'Лучшая от Meta, 10M контекст, мультимодальность (17B active)' }
];

export const DEFAULT_MODELS = {
  test: {
    provider: 'google',
    model: 'gemini-3.1-flash-lite-preview'
  },
  improvement: {
    provider: 'google',
    model: 'gemini-3.1-flash-lite-preview'
  },
  analysis: {
    provider: 'google',
    model: 'gemini-3.1-flash-lite-preview'
  }
};
