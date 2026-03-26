import { create } from 'zustand';
import { GoogleGenAI } from '@google/genai';
import { getAnalysisPrompt, getImprovePrompt, getChatSystemInstruction, getEvalPrompt } from './prompts/systemPrompts';

const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (!response.ok) {
    let errorMessage = `Error: ${response.status} ${response.statusText}`;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } else {
        // If it's not JSON, it might be an HTML error page
        const text = await response.text();
        if (text.includes('<!doctype html>') || text.includes('<html>')) {
          errorMessage = `Server error (HTML returned instead of JSON). Check if the API route exists: ${url}`;
        } else {
          errorMessage = text || errorMessage;
        }
      }
    } catch (e) {
      // Ignore parsing errors for error messages
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return response;
};

export type PromptVersion = {
  id: string;
  version: number;
  content: string;
  changeNote: string | null;
  analysis?: string | null;
  createdAt: string;
};

export type Prompt = {
  id: string;
  name: string;
  description: string | null;
  content: string;
  analysis?: string | null;
  autoCleanup?: boolean;
  cleanupDays?: number;
  createdAt: string;
  updatedAt: string;
  versions?: PromptVersion[];
};

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  debugInfo?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  createdAt: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  picture: string;
  hasGeminiKey: boolean;
  hasOllamaKey: boolean;
  testProvider?: string;
  testModel?: string;
  analysisProvider?: string;
  analysisModel?: string;
  improvementProvider?: string;
  improvementModel?: string;
};

export type ImprovementMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  hasChanges?: boolean;
  improvedPrompt?: string;
  diffSummary?: string;
};

export type TestCase = {
  id: string;
  promptId: string;
  input: string;
  expectedOutput: string | null;
  createdAt: string;
};

export type TestResult = {
  testCaseId: string;
  input: string;
  expectedOutput: string | null;
  actualOutput: string;
  score: number;
  reasoning: string;
  passed: boolean;
  metrics?: {
    relevance?: number;
    clarity?: number;
    accuracy?: number;
  };
};

export type BatchTestResult = {
  overallScore: number;
  passedCount: number;
  totalCount: number;
  results: TestResult[];
};

export type Notification = {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
};

type Store = {
  user: User | null;
  isLoadingAuth: boolean;
  prompts: Prompt[];
  currentPrompt: Prompt | null;
  messages: Message[];
  improvementMessages: ImprovementMessage[];
  testCases: TestCase[];
  testResults: BatchTestResult | null;
  isAnalyzing: boolean;
  isImproving: boolean;
  isTesting: boolean;
  evaluation: any | null;
  recommendations: any | null;
  notifications: Notification[];
  theme: 'light' | 'dark';
  activeMiddleTab: 'improvement' | 'analysis' | 'testing' | 'history';
  
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setActiveMiddleTab: (tab: 'improvement' | 'analysis' | 'testing' | 'history') => void;
  updateSettings: (settings: {
    geminiKey?: string;
    ollamaKey?: string;
    testProvider?: string;
    testModel?: string;
    analysisProvider?: string;
    analysisModel?: string;
    improvementProvider?: string;
    improvementModel?: string;
  }) => Promise<void>;
  
  fetchPrompts: () => Promise<void>;
  createPrompt: (data: Partial<Prompt>) => Promise<void>;
  updatePrompt: (id: string, data: Partial<Prompt> & { saveVersion?: boolean; changeNote?: string }) => Promise<void>;
  selectPrompt: (id: string) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  exportPrompt: (id: string) => Promise<void>;
  importPrompt: (file: File) => Promise<void>;
  
  sendMessage: (content: string, parameters?: any, provider?: string, model?: string) => Promise<void>;
  sendImprovementMessage: (content: string) => Promise<void>;
  rejectImprovement: (messageId: string) => void;
  analyzePrompt: () => Promise<void>;
  improvePrompt: () => Promise<void>;

  fetchTestCases: () => Promise<void>;
  createTestCase: (data: Partial<TestCase>) => Promise<void>;
  updateTestCase: (id: string, data: Partial<TestCase>) => Promise<void>;
  deleteTestCase: (id: string) => Promise<void>;
  generateScenarios: (count?: number) => Promise<void>;
  generatePromptFromFields: (fields: any) => Promise<any>;
  extractFieldsFromText: (text: string) => Promise<any>;
  extractMetadataFromPrompt: (text: string) => Promise<any>;
  testApiKey: (provider: string, key: string) => Promise<boolean>;
  runTests: (versionId?: string) => Promise<void>;
  runSingleTest: (testCaseId: string, versionId?: string) => Promise<void>;
  clearMessages: () => Promise<void>;
  replayHistory: (versionId?: string) => Promise<void>;
  
  addNotification: (type: Notification['type'], message: string) => void;
  removeNotification: (id: string) => void;
};

export const useStore = create<Store>((set, get) => ({
  user: null,
  isLoadingAuth: true,
  prompts: [],
  currentPrompt: null,
  messages: [],
  improvementMessages: [],
  testCases: [],
  testResults: null,
  isAnalyzing: false,
  isImproving: false,
  isTesting: false,
  evaluation: null,
  recommendations: null,
  notifications: [],
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'dark',
  activeMiddleTab: 'analysis',

  rejectImprovement: (messageId: string) => {
    set((state) => ({
      improvementMessages: state.improvementMessages.map(m => 
        m.id === messageId ? { ...m, hasChanges: false, improvedPrompt: null, diffSummary: null } : m
      )
    }));
    get().addNotification('info', 'Предложение отклонено');
  },

  addNotification: (type, message) => {
    const id = Date.now().toString();
    set((state) => ({
      notifications: [...state.notifications, { id, type, message }]
    }));
    setTimeout(() => get().removeNotification(id), 5000);
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },

  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: newTheme });
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  },

  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },

  setActiveMiddleTab: (tab) => set({ activeMiddleTab: tab }),

  checkAuth: async () => {
    try {
      const user = await apiFetch('/api/auth/me');
      try {
        await get().fetchPrompts();
      } catch (e) {
        console.error('Failed to fetch prompts during auth check:', e);
      }
      set({ user, isLoadingAuth: false });
    } catch (e) {
      set({ user: null, isLoadingAuth: false });
    }
  },

  logout: async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('token');
    set({ user: null, prompts: [], currentPrompt: null, messages: [] });
  },

  updateSettings: async (settings) => {
    try {
      await apiFetch('/api/auth/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      set((state) => ({
        user: state.user ? { 
          ...state.user, 
          ...settings,
          hasGeminiKey: settings.geminiKey !== undefined ? !!settings.geminiKey : state.user.hasGeminiKey,
          hasOllamaKey: settings.ollamaKey !== undefined ? !!settings.ollamaKey : state.user.hasOllamaKey
        } : null
      }));
      get().addNotification('success', 'Настройки сохранены');
    } catch (e: any) {
      get().addNotification('error', e.message || 'Не удалось сохранить настройки');
    }
  },

  fetchPrompts: async () => {
    try {
      const data = await apiFetch('/api/prompts');
      set({ prompts: data });
      if (data.length > 0 && !get().currentPrompt) {
        get().selectPrompt(data[0].id);
      }
    } catch (e: any) {
      get().addNotification('error', e.message || 'Не удалось загрузить промпты');
    }
  },

  createPrompt: async (data) => {
    try {
      const newPrompt = await apiFetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      set((state) => ({ prompts: [newPrompt, ...state.prompts] }));
      get().selectPrompt(newPrompt.id);
    } catch (e: any) {
      get().addNotification('error', e.message || 'Не удалось создать промпт');
    }
  },

  updatePrompt: async (id, data) => {
    try {
      const updated = await apiFetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      // If we saved a version, we should re-fetch the prompt to get the updated versions list
      let promptToUse = updated;
      if (data.saveVersion) {
        promptToUse = await apiFetch(`/api/prompts/${id}`);
      }
      
      let newEvaluation = get().evaluation;
      if (data.analysis !== undefined) {
        if (promptToUse.analysis) {
          try {
            newEvaluation = typeof promptToUse.analysis === 'string' ? JSON.parse(promptToUse.analysis) : promptToUse.analysis;
          } catch (e) {
            console.error('Failed to parse analysis JSON', e);
          }
        } else {
          newEvaluation = null;
        }
      }

      set((state) => ({
        prompts: state.prompts.map((p) => (p.id === id ? promptToUse : p)),
        currentPrompt: state.currentPrompt?.id === id ? promptToUse : state.currentPrompt,
        evaluation: state.currentPrompt?.id === id ? newEvaluation : state.evaluation,
      }));
    } catch (e: any) {
      get().addNotification('error', e.message || 'Не удалось обновить промпт');
    }
  },

  selectPrompt: async (id) => {
    try {
      const prompt = await apiFetch(`/api/prompts/${id}`);
      const messages = await apiFetch(`/api/chat/prompt/${id}`);
      
      let evaluation = null;
      if (prompt.analysis) {
        try {
          evaluation = typeof prompt.analysis === 'string' ? JSON.parse(prompt.analysis) : prompt.analysis;
        } catch (e) {
          console.error('Failed to parse analysis JSON', e);
        }
      }
      
      set({ currentPrompt: prompt, messages, improvementMessages: [], evaluation, recommendations: null, testResults: null });
      get().fetchTestCases();
    } catch (e: any) {
      get().addNotification('error', e.message || 'Не удалось выбрать промпт');
    }
  },

  deletePrompt: async (id) => {
    try {
      await apiFetch(`/api/prompts/${id}`, {
        method: 'DELETE',
      });
      
      set((state) => {
        const newPrompts = state.prompts.filter((p) => p.id !== id);
        const nextPrompt = newPrompts.length > 0 ? newPrompts[0] : null;
        return {
          prompts: newPrompts,
          currentPrompt: state.currentPrompt?.id === id ? null : state.currentPrompt
        };
      });
      
      if (get().currentPrompt === null && get().prompts.length > 0) {
        get().selectPrompt(get().prompts[0].id);
      }
      
      get().addNotification('success', 'Промпт удален');
    } catch (e: any) {
      get().addNotification('error', e.message || 'Не удалось удалить промпт');
    }
  },

  exportPrompt: async (id) => {
    try {
      const data = await apiFetch(`/api/prompts/${id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt_${data.prompt.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      get().addNotification('success', 'Промпт успешно экспортирован');
    } catch (e: any) {
      get().addNotification('error', e.message || 'Не удалось экспортировать промпт');
    }
  },

  importPrompt: async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const newPrompt = await apiFetch('/api/prompts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      await get().fetchPrompts();
      await get().selectPrompt(newPrompt.id);
      get().addNotification('success', 'Промпт успешно импортирован');
    } catch (e: any) {
      get().addNotification('error', e.message || 'Не удалось импортировать промпт');
    }
  },

  sendMessage: async (content, parameters, provider, model) => {
    const { currentPrompt, user } = get();
    if (!currentPrompt) return;

    const finalProvider = provider || user?.testProvider || 'google';
    const finalModel = model || user?.testModel || 'gemini-3.1-flash-lite-preview';

    // Optimistic UI
    const tempId = Date.now().toString();
    set((state) => ({
      messages: [...state.messages, { id: tempId, role: 'user', content, createdAt: new Date().toISOString() }],
    }));

    try {
      const data = await apiFetch(`/api/chat/prompt/${currentPrompt.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parameters, provider: finalProvider, model: finalModel }),
      });
      
      set((state) => ({
        messages: state.messages.map(m => m.id === tempId ? data.userMessage : m).concat(data.assistantMessage),
      }));
    } catch (e: any) {
      console.error(e);
      get().addNotification('error', e.message || 'Не удалось отправить сообщение');
      set((state) => ({ messages: state.messages.filter(m => m.id !== tempId) }));
    }
  },

  sendImprovementMessage: async (content) => {
    const { currentPrompt, improvementMessages, user, messages, evaluation } = get();
    if (!currentPrompt || !user) return;

    const tempId = Date.now().toString();
    set((state) => ({
      improvementMessages: [...state.improvementMessages, { id: tempId, role: 'user', content }],
      isImproving: true
    }));

    try {
      const provider = user.improvementProvider || 'google';
      const model = user.improvementModel || 'gemini-3-flash-preview';
      const history = improvementMessages.map(m => ({ role: m.role, content: m.content }));

      let data;
      if (provider === 'google') {
        const keys = await apiFetch('/api/auth/keys');
        const apiKey = keys.google;
        if (!apiKey) throw new Error('Google Gemini API key is not configured in settings');

        // Get recent chat messages for context
        const recentMessages = messages.slice(-10);
        const systemInstruction = getChatSystemInstruction(currentPrompt.content, recentMessages, evaluation);

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model,
          contents: [
            ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
            { role: 'user', parts: [{ text: content }] }
          ],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
          }
        });
        
        const result = JSON.parse(response.text || '{}');
        data = {
          text: result.message,
          has_changes: result.action === 'suggest' || result.action === 'apply',
          improved_prompt: result.full_prompt_preview,
          diff_summary: result.suggested_changes?.reasoning || 'Предложения ИИ'
        };
      } else {
        data = await apiFetch(`/api/prompts/${currentPrompt.id}/improvement-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content, history }),
        });
      }
      
      set((state) => ({
        improvementMessages: [...state.improvementMessages, {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.text,
          hasChanges: data.has_changes,
          improvedPrompt: data.improved_prompt,
          diffSummary: data.diff_summary
        }]
      }));
    } catch (e: any) {
      console.error(e);
      get().addNotification('error', e.message || 'Не удалось отправить сообщение');
      set((state) => ({ improvementMessages: state.improvementMessages.filter(m => m.id !== tempId) }));
    } finally {
      set({ isImproving: false });
    }
  },

  analyzePrompt: async () => {
    const { currentPrompt, user } = get();
    if (!currentPrompt || !user) return;
    
    set({ isAnalyzing: true });
    try {
      const provider = user.analysisProvider || 'google';
      const model = user.analysisModel || 'gemini-3-flash-preview';

      if (provider === 'google') {
        const keys = await apiFetch('/api/auth/keys');
        const apiKey = keys.google;
        if (!apiKey) throw new Error('Google Gemini API key is not configured in settings');

        const analysisPrompt = getAnalysisPrompt(currentPrompt.content);

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model,
          contents: analysisPrompt,
          config: { responseMimeType: 'application/json' }
        });
        
        const data = JSON.parse(response.text || '{}');
        set({ evaluation: data });
        // Save analysis to the backend and create a version if content changed
        await get().updatePrompt(currentPrompt.id, { 
          analysis: data,
          saveVersion: true,
          changeNote: 'Анализ промпта'
        });
      } else {
        const data = await apiFetch(`/api/prompts/${currentPrompt.id}/analyze`, { method: 'POST' });
        set({ evaluation: data });
        // Save analysis to the backend and create a version if content changed
        await get().updatePrompt(currentPrompt.id, { 
          analysis: data,
          saveVersion: true,
          changeNote: 'Анализ промпта'
        });
      }
    } catch (e: any) {
      console.error(e);
      get().addNotification('error', e.message || 'Не удалось проанализировать промпт');
    } finally {
      set({ isAnalyzing: false });
    }
  },

  improvePrompt: async () => {
    const { currentPrompt, evaluation, user } = get();
    if (!currentPrompt || !user) return;
    
    set({ isImproving: true });
    try {
      const provider = user.improvementProvider || 'google';
      const model = user.improvementModel || 'gemini-3-flash-preview';

      let data;
      if (provider === 'google') {
        const keys = await apiFetch('/api/auth/keys');
        const apiKey = keys.google;
        if (!apiKey) throw new Error('Google Gemini API key is not configured in settings');

        const improvePrompt = getImprovePrompt(currentPrompt.content, evaluation);
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model,
          contents: improvePrompt,
          config: { responseMimeType: 'application/json' }
        });
        data = JSON.parse(response.text || '{}');
      } else {
        data = await apiFetch(`/api/prompts/${currentPrompt.id}/improve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analysisResult: evaluation }),
        });
      }
      
      // Convert the old recommendations format into a chat message
      const content = `Вот мой анализ и предложения по улучшению:\n\n**Анализ:** ${data.analysis}\n\n**Предложения:**\n${data.suggestions?.map((s: any) => `- **${s.priority === 'high' ? 'Высокий' : s.priority === 'medium' ? 'Средний' : 'Низкий'} приоритет**: ${s.diff}\n  *Обоснование*: ${s.reasoning}\n  *Ожидаемый эффект*: ${s.expected_effect}`).join('\n')}\n\n**Риски:**\n${data.risks?.map((r: string) => `- ${r}`).join('\n')}`;

      set((state) => ({
        improvementMessages: [...state.improvementMessages, {
          id: Date.now().toString(),
          role: 'assistant',
          content,
          hasChanges: !!data.improved_prompt,
          improvedPrompt: data.improved_prompt,
          diffSummary: 'Применены все предложенные улучшения.'
        }]
      }));
    } catch (e: any) {
      console.error(e);
      get().addNotification('error', e.message || 'Не удалось улучшить промпт');
    } finally {
      set({ isImproving: false });
    }
  },

  fetchTestCases: async () => {
    const { currentPrompt } = get();
    if (!currentPrompt) return;
    try {
      const data = await apiFetch(`/api/test-cases/prompt/${currentPrompt.id}`);
      set({ testCases: data });
    } catch (e: any) {
      console.error(e);
      get().addNotification('error', e.message || 'Не удалось загрузить тест-кейсы');
    }
  },

  createTestCase: async (data) => {
    const { currentPrompt } = get();
    if (!currentPrompt) return;
    try {
      const newTestCase = await apiFetch(`/api/test-cases/prompt/${currentPrompt.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      set((state) => ({ testCases: [...state.testCases, newTestCase] }));
    } catch (e: any) {
      console.error(e);
      get().addNotification('error', e.message || 'Не удалось создать тест-кейс');
    }
  },

  updateTestCase: async (id, data) => {
    try {
      const updated = await apiFetch(`/api/test-cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      set((state) => ({
        testCases: state.testCases.map((tc) => (tc.id === id ? updated : tc)),
      }));
    } catch (e: any) {
      console.error(e);
      get().addNotification('error', e.message || 'Не удалось обновить тест-кейс');
    }
  },

  deleteTestCase: async (id) => {
    try {
      await apiFetch(`/api/test-cases/${id}`, { method: 'DELETE' });
      set((state) => ({
        testCases: state.testCases.filter((tc) => tc.id !== id),
      }));
    } catch (e: any) {
      console.error(e);
      get().addNotification('error', e.message || 'Не удалось удалить тест-кейс');
    }
  },

  generateScenarios: async (count = 5) => {
    const { currentPrompt } = get();
    if (!currentPrompt) return;
    set({ isTesting: true });
    try {
      const newTestCases = await apiFetch(`/api/test-cases/prompt/${currentPrompt.id}/generate-scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioCount: count }),
      });
      set((state) => ({ testCases: [...state.testCases, ...newTestCases] }));
      get().addNotification('success', `Сгенерировано ${newTestCases.length} новых сценариев`);
    } catch (e: any) {
      console.error(e);
      get().addNotification('error', e.message || 'Не удалось сгенерировать сценарии');
    } finally {
      set({ isTesting: false });
    }
  },

  generatePromptFromFields: async (fields: any) => {
    const { user } = get();
    if (!user) return;
    
    try {
      const keys = await apiFetch('/api/auth/keys');
      const apiKey = keys.google;
      if (!apiKey) throw new Error('Google Gemini API key is not configured in settings');

      const { getPromptGenerationPrompt } = await import('./prompts/systemPrompts');
      const prompt = getPromptGenerationPrompt(fields);
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      
      return JSON.parse(response.text || '{}');
    } catch (e: any) {
      console.error(e);
      get().addNotification('error', e.message || 'Не удалось сгенерировать промпт');
      return null;
    }
  },

  extractFieldsFromText: async (text: string) => {
    const { user } = get();
    if (!user) return;
    
    try {
      const keys = await apiFetch('/api/auth/keys');
      const apiKey = keys.google;
      if (!apiKey) throw new Error('Google Gemini API key is not configured in settings');

      const { getPromptExtractionPrompt } = await import('./prompts/systemPrompts');
      const prompt = getPromptExtractionPrompt(text);
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      
      return JSON.parse(response.text || '{}');
    } catch (e: any) {
      console.error(e);
      get().addNotification('error', e.message || 'Не удалось извлечь поля из текста');
      return null;
    }
  },

  extractMetadataFromPrompt: async (text: string) => {
    const { user } = get();
    if (!user) return;
    
    try {
      const keys = await apiFetch('/api/auth/keys');
      const apiKey = keys.google;
      if (!apiKey) throw new Error('Google Gemini API key is not configured in settings');

      const { getPromptMetadataExtractionPrompt } = await import('./prompts/systemPrompts');
      const prompt = getPromptMetadataExtractionPrompt(text);
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      
      return JSON.parse(response.text || '{}');
    } catch (e: any) {
      console.error(e);
      get().addNotification('error', e.message || 'Не удалось извлечь метаданные из промпта');
      return null;
    }
  },

  testApiKey: async (provider: string, key: string) => {
    try {
      if (provider === 'google') {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: 'Say "ok"',
        });
        return !!response.text;
      } else if (provider === 'ollama') {
        // Simple health check for Ollama Cloud if we have an endpoint
        // For now, we'll just check if it's not empty and assume it's valid if the server accepts it
        // Or we can try to call a dummy endpoint
        const response = await fetch('https://api.ollama.com/v1/models', {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        return response.ok;
      }
      return false;
    } catch (e) {
      console.error('API Key test failed:', e);
      return false;
    }
  },

  runTests: async (versionId?: string) => {
    const { currentPrompt } = get();
    if (!currentPrompt) return;
    
    set({ isTesting: true, testResults: null });
    try {
      const data = await apiFetch(`/api/prompts/${currentPrompt.id}/run-tests`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId })
      });
      set({ testResults: data });
    } catch (e: any) {
      console.error(e);
      get().addNotification('error', e.message || 'Не удалось запустить тесты');
    } finally {
      set({ isTesting: false });
    }
  },

  runSingleTest: async (testCaseId: string, versionId?: string) => {
    set({ isTesting: true });
    try {
      const data = await apiFetch(`/api/test-cases/${testCaseId}/run`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId })
      });
      
      const { testResults, testCases } = get();
      if (testResults) {
        // Update existing results
        const newResults = testResults.results.filter(r => r.testCaseId !== testCaseId);
        newResults.push(data);
        
        const passedCount = newResults.filter(r => r.passed).length;
        const totalScore = newResults.reduce((sum, r) => sum + r.score, 0);
        const overallScore = newResults.length > 0 ? Number((totalScore / newResults.length).toFixed(1)) : 0;
        
        set({
          testResults: {
            ...testResults,
            results: newResults,
            passedCount,
            overallScore
          }
        });
      } else {
        // Create new results object
        set({
          testResults: {
            overallScore: data.score,
            passedCount: data.passed ? 1 : 0,
            totalCount: testCases.length,
            results: [data]
          }
        });
      }
    } catch (e: any) {
      console.error(e);
      get().addNotification('error', e.message || 'Не удалось запустить тест');
    } finally {
      set({ isTesting: false });
    }
  },

  clearMessages: async () => {
    const { currentPrompt } = get();
    if (!currentPrompt) return;
    try {
      await apiFetch(`/api/chat/prompt/${currentPrompt.id}`, { method: 'DELETE' });
      set({ messages: [] });
    } catch (e: any) {
      console.error(e);
      get().addNotification('error', e.message || 'Не удалось очистить чат');
    }
  },

  replayHistory: async (versionId?: string) => {
    const { currentPrompt, messages, sendMessage } = get();
    if (!currentPrompt) return;
    
    // Keep user messages for replay
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
    if (userMessages.length === 0) {
      get().addNotification('info', 'Нет истории для перетестирования');
      return;
    }

    set({ isTesting: true });
    try {
      // 1. Clear chat first
      await get().clearMessages();
      
      // 2. Re-send each user message one by one to show progress
      for (const content of userMessages) {
        await sendMessage(content);
      }
      
      get().addNotification('success', `Успешно перетестировано ${userMessages.length} сообщений`);
    } catch (e: any) {
      console.error(e);
      get().addNotification('error', e.message || 'Не удалось выполнить перетестирование');
    } finally {
      set({ isTesting: false });
    }
  }
}));
