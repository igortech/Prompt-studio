import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Save, Clock, FileText, History, ArrowLeft, Eye, Split } from 'lucide-react';
import { DiffView } from './DiffView';
import { ImprovementChat } from './ImprovementChat';

export function PromptEditor() {
  const { currentPrompt, updatePrompt } = useStore();
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [compareVersion, setCompareVersion] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'diff'>('edit');

  useEffect(() => {
    if (currentPrompt) {
      if (content !== currentPrompt.content && !isSaving) {
        setContent(currentPrompt.content);
      }
      if (name !== currentPrompt.name && !isSaving) {
        setName(currentPrompt.name);
      }
    }
  }, [currentPrompt?.id, currentPrompt?.content, currentPrompt?.name]);

  useEffect(() => {
    if (!currentPrompt) return;
    
    const timer = setTimeout(() => {
      if (content !== currentPrompt.content || name !== currentPrompt.name) {
        setIsSaving(true);
        updatePrompt(currentPrompt.id, { content, name }).then(() => setIsSaving(false));
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [content, name, currentPrompt, updatePrompt]);

  if (!currentPrompt) return <div className="p-4">Выберите или создайте промпт</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 z-20">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {compareVersion ? (
            <button 
              onClick={() => {
                setCompareVersion(null);
                setViewMode('edit');
              }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
          )}
          <input 
            value={name}
            onChange={e => setName(e.target.value)}
            className="bg-transparent font-semibold text-base outline-none border-b border-transparent focus:border-indigo-500 w-full"
            disabled={!!compareVersion}
            placeholder="Название промпта"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {!compareVersion && (
            <div className="text-[10px] text-slate-400">
              {isSaving ? (
                <span className="flex items-center gap-1"><Save className="w-3 h-3 animate-pulse" /> Сохранение...</span>
              ) : (
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Сохранено</span>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 p-4 pb-20 relative">
          {viewMode === 'diff' && compareVersion ? (
            <div className="h-full overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <DiffView oldText={compareVersion.content} newText={content} />
            </div>
          ) : (
            <textarea
              value={compareVersion ? compareVersion.content : content}
              onChange={e => !compareVersion && setContent(e.target.value)}
              readOnly={!!compareVersion}
              className={`w-full h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-6 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm ${compareVersion ? 'opacity-80' : ''}`}
              placeholder="Введите ваш системный промпт здесь..."
            />
          )}
        </div>
      </div>
    </div>
  );
}
