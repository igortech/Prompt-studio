import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { X, Key, Save, Settings2, MessageSquare, Sparkles, Activity, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { GOOGLE_MODELS, OLLAMA_MODELS, DEFAULT_MODELS } from '../constants/models';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, updateSettings, testApiKey, addNotification } = useStore();
  const [activeTab, setActiveTab] = useState<'keys' | 'models'>('keys');
  
  const [geminiKey, setGeminiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [ollamaKey, setOllamaKey] = useState('');
  const [showOllamaKey, setShowOllamaKey] = useState(false);
  const [isTestingOllama, setIsTestingOllama] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
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

  const handleTestKey = async (provider: 'google' | 'ollama') => {
    const key = provider === 'google' ? geminiKey : ollamaKey;
    if (!key) {
      addNotification('error', 'Введите ключ для тестирования');
      return;
    }

    if (provider === 'google') {
      setIsTestingGemini(true);
      setGeminiStatus('idle');
      const success = await testApiKey('google', key);
      setGeminiStatus(success ? 'success' : 'error');
      setIsTestingGemini(false);
    } else {
      setIsTestingOllama(true);
      setOllamaStatus('idle');
      const success = await testApiKey('ollama', key);
      setOllamaStatus(success ? 'success' : 'error');
      setIsTestingOllama(false);
    }
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
            <option value="ollama">Ollama</option>
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

        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('keys')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'keys' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Key className="w-4 h-4" />
            API Ключи
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'models' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Выбор моделей
          </button>
        </div>
        
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {(!user?.hasGeminiKey && !user?.hasOllamaKey) && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-bold mb-1">Требуется настройка API ключей</p>
                <p>Для начала работы необходимо указать хотя бы один API ключ. Без этого функции генерации и тестирования будут недоступны.</p>
              </div>
            </div>
          )}

          {activeTab === 'keys' ? (
            <div className="space-y-6">
              {/* Gemini Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Google Gemini API</label>
                  {user?.hasGeminiKey && !geminiKey && <span className="text-[10px] text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ключ настроен</span>}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type={showGeminiKey ? 'text' : 'password'}
                      placeholder={user?.hasGeminiKey ? '••••••••••••••••' : 'Введите ключ Gemini API'}
                      value={geminiKey}
                      onChange={e => setGeminiKey(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button 
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button 
                    onClick={() => handleTestKey('google')}
                    disabled={isTestingGemini || !geminiKey}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                      geminiStatus === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      geminiStatus === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    } disabled:opacity-50`}
                  >
                    {isTestingGemini ? <Loader2 className="w-3 h-3 animate-spin" /> : 
                     geminiStatus === 'success' ? <CheckCircle2 className="w-3 h-3" /> :
                     geminiStatus === 'error' ? <AlertCircle className="w-3 h-3" /> : null}
                    Тест
                  </button>
                </div>
              </div>

              {/* Ollama Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Ollama API</label>
                  {user?.hasOllamaKey && !ollamaKey && <span className="text-[10px] text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ключ настроен</span>}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type={showOllamaKey ? 'text' : 'password'}
                      placeholder={user?.hasOllamaKey ? '••••••••••••••••' : 'Введите ключ Ollama API'}
                      value={ollamaKey}
                      onChange={e => setOllamaKey(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button 
                      onClick={() => setShowOllamaKey(!showOllamaKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showOllamaKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button 
                    onClick={() => handleTestKey('ollama')}
                    disabled={isTestingOllama || !ollamaKey}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                      ollamaStatus === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      ollamaStatus === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    } disabled:opacity-50`}
                  >
                    {isTestingOllama ? <Loader2 className="w-3 h-3 animate-spin" /> : 
                     ollamaStatus === 'success' ? <CheckCircle2 className="w-3 h-3" /> :
                     ollamaStatus === 'error' ? <AlertCircle className="w-3 h-3" /> : null}
                    Тест
                  </button>
                </div>
              </div>
              
              <p className="text-[10px] text-slate-500 italic">
                Ключи хранятся в зашифрованном виде на сервере и используются только для выполнения запросов к соответствующим API.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
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
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/50 dark:bg-slate-950/50">
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
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Сохранить настройки
          </button>
        </div>
      </div>
    </div>
  );
}
