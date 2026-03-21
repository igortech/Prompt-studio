import React, { useState } from 'react';
import { useStore } from '../store';
import { BarChart2, Loader2, AlertTriangle, CheckCircle2, Play, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

export function EvaluationPanel() {
  const { 
    evaluation, isAnalyzing, analyzePrompt, currentPrompt,
    testCases, testResults, isTesting, createTestCase, updateTestCase, deleteTestCase, runTests
  } = useStore();
  
  const [activeTab, setActiveTab] = useState<'analysis' | 'tests'>('analysis');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [editExpected, setEditExpected] = useState('');
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');

  if (!currentPrompt) return null;

  const handleCreateTest = () => {
    createTestCase({ input: 'New test input', expectedOutput: '' });
  };

  const startEdit = (tc: any) => {
    setEditingId(tc.id);
    setEditInput(tc.input);
    setEditExpected(tc.expectedOutput || '');
  };

  const saveEdit = async () => {
    if (editingId) {
      await updateTestCase(editingId, { input: editInput, expectedOutput: editExpected });
      setEditingId(null);
    }
  };

  const handleRunSingleTest = async (tcId: string) => {
    setRunningTestId(tcId);
    await useStore.getState().runSingleTest(tcId, selectedVersionId || undefined);
    setRunningTestId(null);
  };

  const handleRunAllTests = async () => {
    await useStore.getState().runTests(selectedVersionId || undefined);
  };

  return (
    <div className="flex flex-col border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 h-1/2">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-500" />
            Оценка
          </h2>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${activeTab === 'analysis' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Анализ чата
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${activeTab === 'tests' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Тест-кейсы
            </button>
          </div>
        </div>
        
        {activeTab === 'analysis' ? (
          <button
            onClick={analyzePrompt}
            disabled={isAnalyzing}
            className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Анализ чата'}
          </button>
        ) : (
          <div className="flex gap-2 items-center">
            {currentPrompt.versions && currentPrompt.versions.length > 0 && (
              <select
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
              >
                <option value="">Текущая версия</option>
                {currentPrompt.versions.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    v{v.version} {v.changeNote ? `- ${v.changeNote.substring(0, 20)}...` : ''}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleCreateTest}
              className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Добавить тест
            </button>
            <button
              onClick={handleRunAllTests}
              disabled={isTesting || testCases.length === 0}
              className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Запустить тесты
            </button>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {activeTab === 'analysis' ? (
          <div className="space-y-6">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                <p>Анализ истории переписки...</p>
              </div>
            ) : evaluation ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">Общая оценка</span>
                  <span className={`text-2xl font-black ${getScoreColor(evaluation.overall_score)}`}>
                    {evaluation.overall_score}/10
                  </span>
                </div>
                
                <div className="space-y-4">
                  {Object.entries(evaluation.evaluation).map(([key, data]: [string, any]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize font-medium">{key}</span>
                        <span className="font-bold">{data.score}/10</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${getScoreBgColor(data.score)}`}
                          style={{ width: `${(data.score / 10) * 100}%` }}
                        />
                      </div>
                      {data.issues?.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {data.issues.map((issue: string, i: number) => (
                            <li key={i} className="text-xs flex items-start gap-1 text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm">
                  <h4 className="font-semibold mb-2">Резюме</h4>
                  <p className="text-slate-600 dark:text-slate-400">{evaluation.summary}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <p>Запустите анализ, чтобы увидеть метрики оценки.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {testResults && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">Результаты тестов</h3>
                  <span className={`text-xl font-black ${getScoreColor(testResults.overallScore)}`}>
                    {testResults.overallScore}/10
                  </span>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Пройдено {testResults.passedCount} из {testResults.totalCount} тестов
                </div>
              </div>
            )}

            {testCases.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p>Пока нет тест-кейсов. Добавьте один, чтобы начать оценку.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {testCases.map((tc) => {
                  const result = testResults?.results.find((r: any) => r.testCaseId === tc.id);
                  const isEditing = editingId === tc.id;

                  return (
                    <div key={tc.id} className="p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Ввод / Переменные</label>
                            <textarea 
                              value={editInput}
                              onChange={e => setEditInput(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 text-sm outline-none focus:border-indigo-500"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Ожидаемый результат / Критерии (Опционально)</label>
                            <textarea 
                              value={editExpected}
                              onChange={e => setEditExpected(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 text-sm outline-none focus:border-indigo-500"
                              rows={2}
                              placeholder="например, Должен быть в формате JSON, должен упоминать X..."
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                              <X className="w-4 h-4" />
                            </button>
                            <button onClick={saveEdit} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded">
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="text-sm font-medium mb-1">Ввод:</div>
                              <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2 rounded">{tc.input}</div>
                            </div>
                            <div className="flex gap-1 ml-4">
                              <button 
                                onClick={() => handleRunSingleTest(tc.id)} 
                                disabled={runningTestId === tc.id || isTesting}
                                className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors disabled:opacity-50"
                                title="Запустить этот тест"
                              >
                                {runningTestId === tc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                              </button>
                              <button onClick={() => startEdit(tc)} className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors" title="Редактировать тест">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => deleteTestCase(tc.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Удалить тест">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {tc.expectedOutput && (
                            <div className="mt-2">
                              <div className="text-xs font-medium text-slate-500 mb-1">Ожидается:</div>
                              <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 p-2 rounded">{tc.expectedOutput}</div>
                            </div>
                          )}

                          {result && (
                            <div className={`mt-4 p-3 rounded-lg border ${result.passed ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' : 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30'}`}>
                              <div className="flex justify-between items-center mb-2">
                                <span className={`text-sm font-bold flex items-center gap-1 ${result.passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                                  {result.passed ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                  Оценка: {result.score}/10
                                </span>
                                {result.metrics && (
                                  <div className="flex gap-3 text-xs">
                                    {result.metrics.relevance !== undefined && (
                                      <span className="text-slate-600 dark:text-slate-400">Релевантность: <strong className="text-slate-900 dark:text-slate-100">{result.metrics.relevance}/10</strong></span>
                                    )}
                                    {result.metrics.clarity !== undefined && (
                                      <span className="text-slate-600 dark:text-slate-400">Ясность: <strong className="text-slate-900 dark:text-slate-100">{result.metrics.clarity}/10</strong></span>
                                    )}
                                    {result.metrics.accuracy !== undefined && (
                                      <span className="text-slate-600 dark:text-slate-400">Точность: <strong className="text-slate-900 dark:text-slate-100">{result.metrics.accuracy}/10</strong></span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs mb-2">
                                <span className="font-semibold">Обоснование:</span> {result.reasoning}
                              </div>
                              <div className="text-xs">
                                <span className="font-semibold">Фактический результат:</span>
                                <div className="mt-1 p-2 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 max-h-32 overflow-y-auto whitespace-pre-wrap">
                                  {result.actualOutput}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getScoreColor(score: number) {
  if (score >= 8.5) return 'text-emerald-500';
  if (score >= 6.0) return 'text-amber-500';
  return 'text-red-500';
}

function getScoreBgColor(score: number) {
  if (score >= 8.5) return 'bg-emerald-500';
  if (score >= 6.0) return 'bg-amber-500';
  return 'bg-red-500';
}
