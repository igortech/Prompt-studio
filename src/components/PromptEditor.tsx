import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Save, Clock, FileText, History } from 'lucide-react';

export function PromptEditor() {
  const { currentPrompt, updatePrompt } = useStore();
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (currentPrompt) {
      setContent(currentPrompt.content);
      setName(currentPrompt.name);
    }
  }, [currentPrompt?.id]);

  useEffect(() => {
    if (!currentPrompt) return;
    
    const timer = setTimeout(() => {
      if (content !== currentPrompt.content || name !== currentPrompt.name) {
        setIsSaving(true);
        updatePrompt(currentPrompt.id, { content, name }).then(() => setIsSaving(false));
      }
    }, 2000); // 2s debounce

    return () => clearTimeout(timer);
  }, [content, name, currentPrompt, updatePrompt]);

  if (!currentPrompt) return <div className="p-4">Выберите или создайте промпт</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          <input 
            value={name}
            onChange={e => setName(e.target.value)}
            className="bg-transparent font-semibold text-lg outline-none border-b border-transparent focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {isSaving ? (
            <span className="flex items-center gap-1"><Save className="w-4 h-4 animate-pulse" /> Сохранение...</span>
          ) : (
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Сохранено</span>
          )}
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ${showHistory ? 'bg-slate-200 dark:bg-slate-800 text-indigo-500' : ''}`}
            title="История версий"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 p-4 ${showHistory ? 'border-r border-slate-200 dark:border-slate-800' : ''}`}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Введите ваш системный промпт здесь..."
          />
        </div>
        
        {showHistory && (
          <div className="w-64 bg-slate-100 dark:bg-slate-900 overflow-y-auto p-4 flex flex-col gap-2">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <History className="w-4 h-4" /> История версий
            </h3>
            {currentPrompt.versions?.map((v: any) => (
              <div key={v.id} className="p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs cursor-pointer hover:border-indigo-500 transition-colors" onClick={() => setContent(v.content)}>
                <div className="font-bold mb-1">Версия {v.version}</div>
                <div className="text-slate-500 truncate">{v.changeNote}</div>
                <div className="text-slate-400 mt-1">{new Date(v.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {(!currentPrompt.versions || currentPrompt.versions.length === 0) && (
              <div className="text-xs text-slate-500">Версии не найдены.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
