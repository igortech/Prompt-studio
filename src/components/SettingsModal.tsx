import React, { useState } from 'react';
import { useStore } from '../store';
import { X, Key, Save } from 'lucide-react';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, updateSettings } = useStore();
  const [geminiKey, setGeminiKey] = useState('');
  const [ollamaKey, setOllamaKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await updateSettings(geminiKey, ollamaKey);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-500" />
            Настройки API
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Настройте ваши личные API ключи для использования моделей. Ключи надежно хранятся в вашем аккаунте.
          </p>
          
          <div>
            <label className="block text-sm font-medium mb-1">Ключ Google Gemini API</label>
            <input 
              type="password"
              placeholder={user?.hasGeminiKey ? '••••••••••••••••' : 'Введите ключ Gemini API'}
              value={geminiKey}
              onChange={e => setGeminiKey(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {user?.hasGeminiKey && !geminiKey && <p className="text-xs text-green-600 mt-1">Ключ уже настроен. Оставьте пустым, чтобы сохранить.</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ключ Ollama Cloud API</label>
            <input 
              type="password"
              placeholder={user?.hasOllamaKey ? '••••••••••••••••' : 'Введите ключ Ollama Cloud API'}
              value={ollamaKey}
              onChange={e => setOllamaKey(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {user?.hasOllamaKey && !ollamaKey && <p className="text-xs text-green-600 mt-1">Ключ уже настроен. Оставьте пустым, чтобы сохранить.</p>}
          </div>
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
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Save className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />}
            Сохранить ключи
          </button>
        </div>
      </div>
    </div>
  );
}
