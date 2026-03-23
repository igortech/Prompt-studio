import React, { useState } from 'react';
import { useStore } from '../store';
import { History, Clock, ArrowLeft, Check, X, Split, FileText } from 'lucide-react';
import { DiffView } from './DiffView';

export function HistoryPanel() {
  const { currentPrompt, updatePrompt } = useStore();
  const [compareVersion, setCompareVersion] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'diff'>('diff');

  if (!currentPrompt) return null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950 sticky top-0 z-10 shadow-sm">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-500" />
          История версий
        </h2>
        {compareVersion && (
          <button 
            onClick={() => setCompareVersion(null)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {compareVersion ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-bold">Сравнение с v{compareVersion.version}</div>
              <div className="flex bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => setViewMode('edit')}
                  className={`p-1 rounded transition-colors ${viewMode === 'edit' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
                  title="Показать текст"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setViewMode('diff')}
                  className={`p-1 rounded transition-colors ${viewMode === 'diff' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
                  title="Показать отличия"
                >
                  <Split className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
              {viewMode === 'diff' ? (
                <DiffView oldText={compareVersion.content} newText={currentPrompt.content} />
              ) : (
                <pre className="text-xs font-mono whitespace-pre-wrap p-4 text-slate-700 dark:text-slate-300">
                  {compareVersion.content}
                </pre>
              )}
            </div>

            <button 
              onClick={() => {
                if (window.confirm(`Вы уверены, что хотите восстановить версию ${compareVersion.version}?`)) {
                  updatePrompt(currentPrompt.id, { 
                    content: compareVersion.content, 
                    saveVersion: true, 
                    changeNote: `Восстановлено из версии ${compareVersion.version}` 
                  });
                  setCompareVersion(null);
                }
              }}
              className="w-full bg-indigo-600 text-white py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
            >
              Восстановить эту версию
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {currentPrompt.versions?.map((v: any) => (
              <div 
                key={v.id} 
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all cursor-pointer group shadow-sm"
                onClick={() => setCompareVersion(v)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      v{v.version}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(v.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <ArrowLeft className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {v.changeNote || 'Без описания'}
                </div>
              </div>
            ))}
            {(!currentPrompt.versions || currentPrompt.versions.length === 0) && (
              <div className="text-center py-12 text-slate-500 italic text-sm">
                История версий пока пуста.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
