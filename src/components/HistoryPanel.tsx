import React, { useState } from 'react';
import { useStore } from '../store';
import { History, Clock, ArrowLeft, Check, X, Split, FileText } from 'lucide-react';
import { DiffView } from './DiffView';

export function HistoryPanel() {
  const { currentPrompt, updatePrompt } = useStore();
  const [compareVersion, setCompareVersion] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'diff'>('diff');

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-emerald-500';
    if (score >= 6.0) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 8.5) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (score >= 6.0) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  if (!currentPrompt) return null;

  const compareAnalysis = compareVersion?.analysis ? (typeof compareVersion.analysis === 'string' ? JSON.parse(compareVersion.analysis) : compareVersion.analysis) : null;

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
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-900/30 px-2 py-1 rounded-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Назад
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

            {compareAnalysis && compareAnalysis.evaluation && (
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Оценки версии</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(compareAnalysis.evaluation).map(([key, data]: [string, any]) => {
                    const translations: Record<string, string> = {
                      factual: 'Факты', style: 'Стиль', safety: 'Безопасность',
                      completeness: 'Полнота', consistency: 'Логичность',
                      clarity: 'Ясность', accuracy: 'Точность',
                      conciseness: 'Краткость', tone: 'Тон', format: 'Формат'
                    };
                    return (
                      <div key={key} className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 dark:text-slate-400">{translations[key.toLowerCase()] || key}:</span>
                        <span className={`font-bold ${getScoreColor(data.score)}`}>{data.score}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
            {currentPrompt.versions?.map((v: any) => {
              const analysis = v.analysis ? (typeof v.analysis === 'string' ? JSON.parse(v.analysis) : v.analysis) : null;
              const overallScore = analysis?.overall_score;
              const isCurrent = v.content === currentPrompt.content;
              
              return (
                <div 
                  key={v.id} 
                  className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border ${isCurrent ? 'border-indigo-200 dark:border-indigo-800/50 cursor-default' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500 cursor-pointer group'} transition-all shadow-sm`}
                  onClick={() => !isCurrent && setCompareVersion(v)}
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
                      {isCurrent && (
                        <div className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-medium border border-indigo-100 dark:border-indigo-800/30">
                          Текущая
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {overallScore && (
                        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getScoreBgColor(overallScore)}`}>
                          Оценка: {overallScore}
                        </div>
                      )}
                      {!isCurrent && <ArrowLeft className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {v.changeNote || 'Без описания'}
                  </div>
                </div>
              );
            })}
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
