import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { X, Key, Save, Settings2, MessageSquare, Sparkles, Activity } from 'lucide-react';
import { GOOGLE_MODELS, OLLAMA_MODELS, DEFAULT_MODELS } from '../constants/models';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, updateSettings } = useStore();
  const [geminiKey, setGeminiKey] = useState('');
  const [ollamaKey, setOllamaKey] = useState('');
  
  const [testProvider, setTestProvider] = useState(user?.testProvider || DEFAULT_MODELS.test.provider);
  const [testModel, setTestModel] = useState(user?.testModel || DEFAULT_MODELS.test.model);
  
  const [analysisProvider, setAnalysisProvider] = useState(user?.analysisProvider || DEFAULT_MODELS.analysis.provider);
  const [analysisModel, setAnalysisModel] = useState(user?.analysisModel || DEFAULT_MODELS.analysis.model);
  
  const [improvementProvider, setImprovementProvider] = useState(user?.improvementProvider || DEFAULT_MODELS.improvement.provider);
  const [improvementModel, setImprovementModel] = useState(user?.improvementModel || DEFAULT_MODELS.improvement.model);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setTestProvider(user.testProvider || DEFAULT_MODELS.test.provider);
      setTestModel(user.testModel || DEFAULT_MODELS.test.model);
      setAnalysisProvider(user.analysisProvider || DEFAULT_MODELS.analysis.provider);
      setAnalysisModel(user.analysisModel || DEFAULT_MODELS.analysis.model);
      setImprovementProvider(user.improvementProvider || DEFAULT_MODELS.improvement.provider);
      setImprovementModel(user.improvementModel || DEFAULT_MODELS.improvement.model);
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    await updateSettings({
      geminiKey: geminiKey || undefined,
      ollamaKey: ollamaKey || undefined,
      testProvider,
      testModel,
      analysisProvider,
      analysisModel,
      improvementProvider,
      improvementModel
    });
    setIsSaving(false);
    onClose();
  };

  const renderModelSelector = (
    label: string, 
    icon: React.ReactNode,
    provider: string, 
    setProvider: (v: string) => void, 
    model: string, 
    setModel: (v: string) => void
  ) => (
    <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h3 className="text-sm font-semibold">{label}</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Провайдер</label>
          <select 
            value={provider}
            onChange={(e) => {
              const newProvider = e.target.value;
              setProvider(newProvider);
              setModel(newProvider === 'google' ? GOOGLE_MODELS[0].id : OLLAMA_MODELS[0].id);
            }}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="google">Google Gemini</option>
            <option value="ollama">Ollama Cloud</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Модель</label>
          <select 
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {(provider === 'google' ? GOOGLE_MODELS : OLLAMA_MODELS).map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 my-8">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-indigo-500" />
            Настройки приложения
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
          {/* API Keys Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Key className="w-4 h-4 text-indigo-500" />
              <h3 className="font-medium">API Ключи</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">Google Gemini API</label>
                <input 
                  type="password"
                  placeholder={user?.hasGeminiKey ? '••••••••••••••••' : 'Введите ключ Gemini API'}
                  value={geminiKey}
                  onChange={e => setGeminiKey(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                {user?.hasGeminiKey && !geminiKey && <p className="text-[10px] text-green-600">Ключ настроен</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-500">Ollama Cloud API</label>
                <input 
                  type="password"
                  placeholder={user?.hasOllamaKey ? '••••••••••••••••' : 'Введите ключ Ollama API'}
                  value={ollamaKey}
                  onChange={e => setOllamaKey(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                {user?.hasOllamaKey && !ollamaKey && <p className="text-[10px] text-green-600">Ключ настроен</p>}
              </div>
            </div>
          </section>

          {/* Model Selection Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h3 className="font-medium">Выбор моделей для задач</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {renderModelSelector(
                "Чат тестирования (по умолчанию)", 
                <MessageSquare className="w-4 h-4 text-blue-500" />,
                testProvider, setTestProvider, testModel, setTestModel
              )}
              
              {renderModelSelector(
                "Улучшение промптов", 
                <Sparkles className="w-4 h-4 text-amber-500" />,
                improvementProvider, setImprovementProvider, improvementModel, setImprovementModel
              )}
              
              {renderModelSelector(
                "Анализ и диагностика", 
                <Activity className="w-4 h-4 text-emerald-500" />,
                analysisProvider, setAnalysisProvider, analysisModel, setAnalysisModel
              )}
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-lg shadow-indigo-500/20"
          >
            {isSaving ? <Save className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />}
            Сохранить настройки
          </button>
        </div>
      </div>
    </div>
  );
}
