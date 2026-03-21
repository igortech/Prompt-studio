import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Save, Clock, FileText, History, ArrowLeft, Eye, Split } from 'lucide-react';
import { DiffView } from './DiffView';

export function PromptEditor() {
  const { currentPrompt, updatePrompt } = useStore();
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [compareVersion, setCompareVersion] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'diff'>('edit');

  useEffect(() => {
    if (currentPrompt) {
      // Only update local state if it's different from the store
      // and we're not in the middle of a debounce save (isSaving)
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
    }, 2000); // 2s debounce

    return () => clearTimeout(timer);
  }, [content, name, currentPrompt, updatePrompt]);

  if (!currentPrompt) return <div className="p-4">Выберите или создайте промпт</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {compareVersion ? (
            <button 
              onClick={() => {
                setCompareVersion(null);
                setViewMode('edit');
              }}
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <FileText className="w-5 h-5 text-indigo-500" />
          )}
          <input 
            value={name}
            onChange={e => setName(e.target.value)}
            className="bg-transparent font-semibold text-lg outline-none border-b border-transparent focus:border-indigo-500"
            disabled={!!compareVersion}
          />
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          {compareVersion && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${viewMode === 'edit' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'hover:text-slate-900 dark:hover:text-slate-100'}`}
              >
                <Eye className="w-4 h-4" /> Просмотр
              </button>
              <button 
                onClick={() => setViewMode('diff')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${viewMode === 'diff' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'hover:text-slate-900 dark:hover:text-slate-100'}`}
              >
                <Split className="w-4 h-4" /> Сравнение
              </button>
            </div>
          )}
          
          {!compareVersion && (
            <>
              {isSaving ? (
                <span className="flex items-center gap-1"><Save className="w-4 h-4 animate-pulse" /> Сохранение...</span>
              ) : (
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Сохранено</span>
              )}
            </>
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
          {viewMode === 'diff' && compareVersion ? (
            <DiffView oldText={compareVersion.content} newText={content} />
          ) : (
            <textarea
              value={compareVersion ? compareVersion.content : content}
              onChange={e => !compareVersion && setContent(e.target.value)}
              readOnly={!!compareVersion}
              className={`w-full h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none ${compareVersion ? 'opacity-80' : ''}`}
              placeholder="Введите ваш системный промпт здесь..."
            />
          )}
        </div>
        
        {showHistory && (
          <div className="w-72 bg-slate-100 dark:bg-slate-900 overflow-y-auto p-4 flex flex-col gap-2">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <History className="w-4 h-4" /> История версий
            </h3>
            {currentPrompt.versions?.map((v: any) => (
              <div 
                key={v.id} 
                className={`p-3 rounded border transition-all cursor-pointer ${compareVersion?.id === v.id ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-500'}`}
                onClick={() => {
                  setCompareVersion(v);
                  setViewMode('edit');
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-xs">Версия {v.version}</div>
                  {compareVersion?.id === v.id && <div className="text-[10px] bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Выбрано</div>}
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-2 mb-2">{v.changeNote || 'Без описания'}</div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Вы уверены, что хотите восстановить эту версию? Текущие изменения будут сохранены как новая версия.')) {
                        updatePrompt(currentPrompt.id, { 
                          content: v.content, 
                          saveVersion: true, 
                          changeNote: `Восстановлено из версии ${v.version}` 
                        });
                        setCompareVersion(null);
                        setViewMode('edit');
                      }
                    }}
                    className="text-indigo-500 hover:underline font-medium"
                  >
                    Восстановить
                  </button>
                </div>
              </div>
            ))}
            {(!currentPrompt.versions || currentPrompt.versions.length === 0) && (
              <div className="text-xs text-slate-500 text-center py-8 italic">Версии не найдены.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
