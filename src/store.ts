import { create } from 'zustand';

const apiFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });
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
  createdAt: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  picture: string;
  hasGeminiKey: boolean;
  hasOllamaKey: boolean;
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
  
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  updateSettings: (geminiKey: string, ollamaKey: string) => Promise<void>;
  
  fetchPrompts: () => Promise<void>;
  createPrompt: (data: Partial<Prompt>) => Promise<void>;
  updatePrompt: (id: string, data: Partial<Prompt>) => Promise<void>;
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

  checkAuth: async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const user = await res.json();
        set({ user, isLoadingAuth: false });
        get().fetchPrompts();
      } else {
        set({ user: null, isLoadingAuth: false });
      }
    } catch (e) {
      set({ user: null, isLoadingAuth: false });
    }
  },

  logout: async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('token');
    set({ user: null, prompts: [], currentPrompt: null, messages: [] });
  },

  updateSettings: async (geminiKey, ollamaKey) => {
    const res = await apiFetch('/api/auth/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geminiKey, ollamaKey })
    });
    if (res.ok) {
      set((state) => ({
        user: state.user ? { ...state.user, hasGeminiKey: !!geminiKey, hasOllamaKey: !!ollamaKey } : null
      }));
    }
  },

  fetchPrompts: async () => {
    const res = await apiFetch('/api/prompts');
    const data = await res.json();
    set({ prompts: data });
    if (data.length > 0 && !get().currentPrompt) {
      get().selectPrompt(data[0].id);
    } else if (data.length === 0) {
      get().createPrompt({ name: 'My First Prompt', content: 'You are a helpful assistant.' });
    }
  },

  createPrompt: async (data) => {
    const res = await apiFetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const newPrompt = await res.json();
    set((state) => ({ prompts: [newPrompt, ...state.prompts] }));
    get().selectPrompt(newPrompt.id);
  },

  updatePrompt: async (id, data) => {
    const res = await apiFetch(`/api/prompts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    set((state) => ({
      prompts: state.prompts.map((p) => (p.id === id ? updated : p)),
      currentPrompt: state.currentPrompt?.id === id ? updated : state.currentPrompt,
    }));
  },

  selectPrompt: async (id) => {
    const res = await apiFetch(`/api/prompts/${id}`);
    const prompt = await res.json();
    
    const msgRes = await apiFetch(`/api/chat/prompt/${id}`);
    const messages = await msgRes.json();
    
    set({ currentPrompt: prompt, messages, improvementMessages: [], evaluation: null, recommendations: null, testResults: null });
    get().fetchTestCases();
  },

  sendMessage: async (content, parameters, provider = 'google', model = 'gemini-3-flash-preview') => {
    const { currentPrompt } = get();
    if (!currentPrompt) return;

    // Optimistic UI
    const tempId = Date.now().toString();
    set((state) => ({
      messages: [...state.messages, { id: tempId, role: 'user', content, createdAt: new Date().toISOString() }],
    }));

    try {
      const res = await apiFetch(`/api/chat/prompt/${currentPrompt.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parameters, provider, model }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || 'Не удалось отправить сообщение');
        set((state) => ({ messages: state.messages.filter(m => m.id !== tempId) }));
        return;
      }
      
      set((state) => ({
        messages: state.messages.map(m => m.id === tempId ? data.userMessage : m).concat(data.assistantMessage),
      }));
    } catch (e) {
      console.error(e);
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
      const res = await apiFetch(`/api/prompts/${currentPrompt.id}/improvement-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, history }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || 'Не удалось отправить сообщение');
        set((state) => ({ improvementMessages: state.improvementMessages.filter(m => m.id !== tempId) }));
        return;
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
    } catch (e) {
      console.error(e);
    } finally {
      set({ isImproving: false });
    }
  },

  analyzePrompt: async () => {
    const { currentPrompt } = get();
    if (!currentPrompt) return;
    
    set({ isAnalyzing: true });
    try {
      const res = await apiFetch(`/api/prompts/${currentPrompt.id}/analyze`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Не удалось проанализировать промпт');
        return;
      }
      set({ evaluation: data });
    } catch (e) {
      console.error(e);
    } finally {
      set({ isAnalyzing: false });
    }
  },

  improvePrompt: async () => {
    const { currentPrompt, evaluation } = get();
    if (!currentPrompt) return;
    
    set({ isImproving: true });
    try {
      const res = await apiFetch(`/api/prompts/${currentPrompt.id}/improve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisResult: evaluation }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Не удалось улучшить промпт');
        return;
      }
      
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
    } catch (e) {
      console.error(e);
    } finally {
      set({ isImproving: false });
    }
  },

  fetchTestCases: async () => {
    const { currentPrompt } = get();
    if (!currentPrompt) return;
    try {
      const res = await apiFetch(`/api/prompts/${currentPrompt.id}/test-cases`);
      const data = await res.json();
      set({ testCases: data });
    } catch (e) {
      console.error(e);
    }
  },

  createTestCase: async (data) => {
    const { currentPrompt } = get();
    if (!currentPrompt) return;
    try {
      const res = await apiFetch(`/api/prompts/${currentPrompt.id}/test-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const newTestCase = await res.json();
      set((state) => ({ testCases: [...state.testCases, newTestCase] }));
    } catch (e) {
      console.error(e);
    }
  },

  updateTestCase: async (id, data) => {
    try {
      const res = await apiFetch(`/api/test-cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      set((state) => ({
        testCases: state.testCases.map((tc) => (tc.id === id ? updated : tc)),
      }));
    } catch (e) {
      console.error(e);
    }
  },

  deleteTestCase: async (id) => {
    try {
      await apiFetch(`/api/test-cases/${id}`, { method: 'DELETE' });
      set((state) => ({
        testCases: state.testCases.filter((tc) => tc.id !== id),
      }));
    } catch (e) {
      console.error(e);
    }
  },

  runTests: async (versionId?: string) => {
    const { currentPrompt } = get();
    if (!currentPrompt) return;
    
    set({ isTesting: true, testResults: null });
    try {
      const res = await apiFetch(`/api/prompts/${currentPrompt.id}/run-tests`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Не удалось запустить тесты');
        return;
      }
      set({ testResults: data });
    } catch (e) {
      console.error(e);
    } finally {
      set({ isTesting: false });
    }
  },

  runSingleTest: async (testCaseId: string, versionId?: string) => {
    set({ isTesting: true });
    try {
      const res = await apiFetch(`/api/test-cases/${testCaseId}/run`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Не удалось запустить тест');
        return;
      }
      
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
    } catch (e) {
      console.error(e);
    } finally {
      set({ isTesting: false });
    }
  }
}));
