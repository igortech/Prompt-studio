export const GOOGLE_MODELS = [
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }
];

export const OLLAMA_MODELS = [
  { id: 'llama3', name: 'Llama 3' },
  { id: 'mistral', name: 'Mistral' },
  { id: 'phi3', name: 'Phi-3' },
  { id: 'gemma2', name: 'Gemma 2' }
];

export const DEFAULT_MODELS = {
  test: {
    provider: 'google',
    model: 'gemini-3.1-flash-lite-preview'
  },
  improvement: {
    provider: 'google',
    model: 'gemini-3-flash-preview'
  },
  analysis: {
    provider: 'google',
    model: 'gemini-3-flash-preview'
  }
};
