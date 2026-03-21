import { create } from 'zustand';

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
  createdAt: string;
};

export type Prompt = {
  id: string;
  name: string;
  description: string | null;
  content: string;
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
  
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
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
  
  sendMessage: (content: string, parameters?: any, provider?: string, model?: string) => Promise<void>;
  sendImprovementMessage: (content: string) => Promise<void>;
  analyzePrompt: () => Promise<void>;
  improvePrompt: () => Promise<void>;

  fetchTestCases: () => Promise<void>;
  createTestCase: (data: Partial<TestCase>) => Promise<void>;
  updateTestCase: (id: string, data: Partial<TestCase>) => Promise<void>;
  deleteTestCase: (id: string) => Promise<void>;
  runTests: (versionId?: string) => Promise<void>;
  runSingleTest: (testCaseId: string, versionId?: string) => Promise<void>;
  
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

  checkAuth: async () => {
    try {
      const user = await apiFetch('/api/auth/me');
      set({ user, isLoadingAuth: false });
      get().fetchPrompts();
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
      } else if (data.length === 0) {
        get().createPrompt({ name: 'My First Prompt', content: 'You are a helpful assistant.' });
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
      if (data.saveVersion) {
        const fullPrompt = await apiFetch(`/api/prompts/${id}`);
        set((state) => ({
          prompts: state.prompts.map((p) => (p.id === id ? fullPrompt : p)),
          currentPrompt: state.currentPrompt?.id === id ? fullPrompt : state.currentPrompt,
        }));
      } else {
        set((state) => ({
          prompts: state.prompts.map((p) => (p.id === id ? updated : p)),
          currentPrompt: state.currentPrompt?.id === id ? updated : state.currentPrompt,
        }));
      }
    } catch (e: any) {
      get().addNotification('error', e.message || 'Не удалось обновить промпт');
    }
  },

  selectPrompt: async (id) => {
    try {
      const prompt = await apiFetch(`/api/prompts/${id}`);
      const messages = await apiFetch(`/api/chat/prompt/${id}`);
      
      set({ currentPrompt: prompt, messages, improvementMessages: [], evaluation: null, recommendations: null, testResults: null });
      get().fetchTestCases();
    } catch (e: any) {
      get().addNotification('error', e.message || 'Не удалось выбрать промпт');
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
    const { currentPrompt, improvementMessages } = get();
    if (!currentPrompt) return;

    const tempId = Date.now().toString();
    set((state) => ({
      improvementMessages: [...state.improvementMessages, { id: tempId, role: 'user', content }],
      isImproving: true
    }));

    try {
      const history = improvementMessages.map(m => ({ role: m.role, content: m.content }));
      const data = await apiFetch(`/api/prompts/${currentPrompt.id}/improvement-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, history }),
      });
      
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
    const { currentPrompt } = get();
    if (!currentPrompt) return;
    
    set({ isAnalyzing: true });
    try {
      const data = await apiFetch(`/api/prompts/${currentPrompt.id}/analyze`, { method: 'POST' });
      set({ evaluation: data });
    } catch (e: any) {
      console.error(e);
      get().addNotification('error', e.message || 'Не удалось проанализировать промпт');
    } finally {
      set({ isAnalyzing: false });
    }
  },

  improvePrompt: async () => {
    const { currentPrompt, evaluation } = get();
    if (!currentPrompt) return;
    
    set({ isImproving: true });
    try {
      const data = await apiFetch(`/api/prompts/${currentPrompt.id}/improve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisResult: evaluation }),
      });
      
      // Convert the old recommendations format into a chat message
      const content = `Here is my analysis and suggestions for improvement:\n\n**Analysis:** ${data.analysis}\n\n**Suggestions:**\n${data.suggestions?.map((s: any) => `- **${s.priority.toUpperCase()} Priority**: ${s.diff}\n  *Reasoning*: ${s.reasoning}\n  *Expected Effect*: ${s.expected_effect}`).join('\n')}\n\n**Risks:**\n${data.risks?.map((r: string) => `- ${r}`).join('\n')}`;

      set((state) => ({
        improvementMessages: [...state.improvementMessages, {
          id: Date.now().toString(),
          role: 'assistant',
          content,
          hasChanges: !!data.improved_prompt,
          improvedPrompt: data.improved_prompt,
          diffSummary: 'Applied all suggested improvements.'
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
  }
}));
