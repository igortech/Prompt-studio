import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { BarChart2, Loader2, AlertTriangle, CheckCircle2, Play, Plus, Trash2, Edit2, Check, X, Split, Target, Eye, ShieldCheck, Minimize2, MessageSquare, Layout, Info, Sparkles } from 'lucide-react';
import { DiffView } from './DiffView';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export function EvaluationPanel({ view }: { view?: 'analysis' | 'tests' }) {
  const { 
    evaluation, isAnalyzing, analyzePrompt, currentPrompt,
    testCases, testResults, isTesting, createTestCase, updateTestCase, deleteTestCase, runTests,
    improvePrompt, isImproving
  } = useStore();
  
  const [internalTab, setInternalTab] = useState<'analysis' | 'tests'>('analysis');
  const activeTab = view || internalTab;
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [editExpected, setEditExpected] = useState('');
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [showDiffId, setShowDiffId] = useState<string | null>(null);

  const chartData = useMemo(() => {
    if (!evaluation?.evaluation) return [];
    
    const selectedVersion = currentPrompt?.versions?.find((v: any) => v.id === selectedVersionId);
    let versionEval = null;
    if (selectedVersion && selectedVersion.analysis) {
      try {
        versionEval = typeof selectedVersion.analysis === 'string' ? JSON.parse(selectedVersion.analysis) : selectedVersion.analysis;
      } catch (e) {
        console.error(e);
      }
    }

    const data = Object.entries(evaluation.evaluation).map(([key, data]: [string, any]) => {
      const translations: Record<string, string> = {
        factual: 'Факты',
        style: 'Стиль',
        safety: 'Безопасность',
        completeness: 'Полнота',
        consistency: 'Логичность',
        clarity: 'Ясность',
        accuracy: 'Точность',
        conciseness: 'Краткость',
        tone: 'Тон',
        format: 'Формат'
      };

      const item: any = {
        subject: translations[key.toLowerCase()] || key.replace(/_/g, ' '),
        'Текущая': data.score,
        fullMark: 10,
      };
      
      if (versionEval && versionEval.evaluation && versionEval.evaluation[key]) {
        item[`Версия ${selectedVersion.version}`] = versionEval.evaluation[key].score;
      }
      
      return item;
    });
    
    return data;
  }, [evaluation, currentPrompt, selectedVersionId]);

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
    <div className="flex flex-col bg-white dark:bg-slate-950 flex-1 relative overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950 shadow-sm">
        <div className="flex items-center gap-4">
          {!view && (
            <>
              <h2 className="font-semibold flex items-center gap-2">
                {activeTab === 'analysis' ? (
                  <><BarChart2 className="w-5 h-5 text-indigo-500" /> Анализ</>
                ) : (
                  <><Target className="w-5 h-5 text-indigo-500" /> Тестирование</>
                )}
              </h2>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setInternalTab('analysis')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${activeTab === 'analysis' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  чата
                </button>
                <button
                  onClick={() => setInternalTab('tests')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${activeTab === 'tests' ? 'bg-white dark:bg-slate-700 shadow-sm font-medium text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  кейсы
                </button>
              </div>
            </>
          )}
        </div>
        
        {activeTab === 'tests' && (
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
              onClick={() => useStore.getState().generateScenarios(5)}
              disabled={isTesting}
              className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors flex items-center gap-2 disabled:opacity-50"
              title="Сгенерировать 5 тестовых сценариев с помощью ИИ"
            >
              <Target className="w-4 h-4" /> Авто-сценарии
            </button>
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

      <div className="p-4 flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
        {activeTab === 'analysis' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3 items-center justify-between bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold">Анализ промпта</h3>
              </div>
              <div className="flex gap-2 items-center">
                {currentPrompt.versions && currentPrompt.versions.length > 0 && (
                  <select
                    value={selectedVersionId}
                    onChange={(e) => setSelectedVersionId(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="">Сравнить с...</option>
                    {currentPrompt.versions.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        v{v.version} {v.changeNote ? `- ${v.changeNote.substring(0, 20)}...` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={analyzePrompt}
                  disabled={isAnalyzing}
                  className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md active:scale-95"
                >
                  {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4" /> Анализ</>}
                </button>
              </div>
            </div>

            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-900/30 rounded-full animate-pulse" />
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="font-medium">Анализ истории переписки...</p>
                <p className="text-xs opacity-60 mt-1 italic">Это может занять несколько секунд</p>
              </div>
            ) : evaluation ? (
              <div className="space-y-6">
                {/* Hero Score Card */}
                <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                  <div className="relative">
                    <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Общая оценка</h3>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-black ${getScoreColor(evaluation.overall_score)}`}>
                        {evaluation.overall_score}
                      </span>
                      <span className="text-slate-400 text-lg">/ 10</span>
                    </div>
                  </div>
                  <div className="relative flex flex-col items-end">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
                      evaluation.overall_score >= 8.5 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      evaluation.overall_score >= 6.0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {evaluation.overall_score >= 8.5 ? 'Отлично' : evaluation.overall_score >= 6.0 ? 'Нужно улучшить' : 'Критично'}
                    </div>
                    <div className="text-[10px] text-slate-400 italic">На основе последних сообщений</div>
                  </div>
                </div>
                
                {/* Radar Chart & Metrics Grid */}
                <div className="flex flex-col gap-6">
                  {/* Detailed Analysis Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Сильные стороны
                        {selectedVersionId && <span className="text-[10px] text-slate-400 normal-case font-normal ml-auto">Сравнение с v{currentPrompt.versions?.find((v: any) => v.id === selectedVersionId)?.version}</span>}
                      </h4>
                      <div className="space-y-4">
                        <ul className="space-y-2">
                          {evaluation.analysis?.strengths?.map((s: string, i: number) => (
                            <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                              <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                              {s}
                            </li>
                          ))}
                          {(!evaluation.analysis?.strengths || evaluation.analysis.strengths.length === 0) && (
                            <li className="text-xs text-slate-400 italic">Не выявлено</li>
                          )}
                        </ul>
                        
                        {selectedVersionId && (
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                            <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase">Версия {currentPrompt.versions?.find((v: any) => v.id === selectedVersionId)?.version}:</div>
                            <ul className="space-y-2 opacity-60">
                              {(() => {
                                const v = currentPrompt.versions?.find((v: any) => v.id === selectedVersionId);
                                if (!v?.analysis) return <li className="text-xs italic">Нет данных</li>;
                                const vEval = typeof v.analysis === 'string' ? JSON.parse(v.analysis) : v.analysis;
                                return vEval.analysis?.strengths?.map((s: string, i: number) => (
                                  <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                    <div className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                                    {s}
                                  </li>
                                )) || <li className="text-xs italic">Нет данных</li>;
                              })()}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Слабые места
                        {selectedVersionId && <span className="text-[10px] text-slate-400 normal-case font-normal ml-auto">Сравнение с v{currentPrompt.versions?.find((v: any) => v.id === selectedVersionId)?.version}</span>}
                      </h4>
                      <div className="space-y-4">
                        <ul className="space-y-2">
                          {evaluation.analysis?.weaknesses?.map((w: string, i: number) => (
                            <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                              <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                              {w}
                            </li>
                          ))}
                          {(!evaluation.analysis?.weaknesses || evaluation.analysis.weaknesses.length === 0) && (
                            <li className="text-xs text-slate-400 italic">Не выявлено</li>
                          )}
                        </ul>

                        {selectedVersionId && (
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                            <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase">Версия {currentPrompt.versions?.find((v: any) => v.id === selectedVersionId)?.version}:</div>
                            <ul className="space-y-2 opacity-60">
                              {(() => {
                                const v = currentPrompt.versions?.find((v: any) => v.id === selectedVersionId);
                                if (!v?.analysis) return <li className="text-xs italic">Нет данных</li>;
                                const vEval = typeof v.analysis === 'string' ? JSON.parse(v.analysis) : v.analysis;
                                return vEval.analysis?.weaknesses?.map((w: string, i: number) => (
                                  <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                    <div className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                                    {w}
                                  </li>
                                )) || <li className="text-xs italic">Нет данных</li>;
                              })()}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {evaluation.analysis?.potential_issues?.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm">
                      <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Потенциальные риски
                      </h4>
                      <ul className="space-y-2">
                        {evaluation.analysis.potential_issues.map((issue: string, i: number) => (
                          <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-red-500 mt-1.5 shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Radar Chart */}
                  {chartData.length > 0 && (
                    <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-80 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                          <Radar name="Текущая" dataKey="Текущая" stroke="#6366f1" fill="#6366f1" fillOpacity={0.5} />
                          {selectedVersionId && (
                            <Radar name={`Версия ${currentPrompt.versions?.find((v: any) => v.id === selectedVersionId)?.version}`} dataKey={`Версия ${currentPrompt.versions?.find((v: any) => v.id === selectedVersionId)?.version}`} stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
                          )}
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }} />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Vertical Indicators */}
                  <div className="flex flex-col gap-4">
                    {Object.entries(evaluation.evaluation).map(([key, data]: [string, any]) => {
                      const translations: Record<string, string> = {
                        factual: 'Факты',
                        style: 'Стиль',
                        safety: 'Безопасность',
                        completeness: 'Полнота',
                        consistency: 'Логичность',
                        clarity: 'Ясность',
                        accuracy: 'Точность',
                        conciseness: 'Краткость',
                        tone: 'Тон',
                        format: 'Формат'
                      };
                      
                      return (
                        <div key={key} className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl ${getScoreBgColor(data.score)} bg-opacity-10 dark:bg-opacity-20`}>
                                {getMetricIcon(key)}
                              </div>
                              <div>
                                <span className="text-sm font-bold capitalize text-slate-800 dark:text-slate-200">
                                  {translations[key.toLowerCase()] || key}
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5">Параметр качества</div>
                              </div>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className={`text-lg font-black ${getScoreColor(data.score)}`}>{data.score}</span>
                              <span className="text-[10px] text-slate-400">/ 10</span>
                            </div>
                          </div>
                          
                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${getScoreBgColor(data.score)}`}
                              style={{ width: `${(data.score / 10) * 100}%` }}
                            />
                          </div>

                          {data.issues?.length > 0 && (
                            <div className="space-y-2 mt-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Замечания и рекомендации:</div>
                              {data.issues.map((issue: string, i: number) => (
                                <div key={i} className="text-xs flex items-start gap-2 text-slate-600 dark:text-slate-400 leading-relaxed">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0 shadow-sm shadow-amber-500/20" />
                                  <span>{issue}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary Section */}
                <div className="space-y-4">
                  <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                    <h4 className="font-bold text-indigo-900 dark:text-indigo-300 text-sm flex items-center gap-2 mb-3">
                      <Info className="w-4 h-4" /> Резюме анализа
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed italic">
                      "{evaluation.summary}"
                    </p>
                  </div>

                  {/* Correct Button */}
                  <div className="space-y-2">
                    <button
                      onClick={async () => {
                        await improvePrompt();
                        useStore.getState().setActiveMiddleTab('improvement');
                      }}
                      disabled={isImproving}
                      className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isImproving ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Корректировка...</>
                      ) : (
                        <><Sparkles className="w-5 h-5" /> Скорректировать промпт</>
                      )}
                    </button>
                    <p className="text-[10px] text-center text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      ИИ сохранит текущие сильные стороны и исправит только слабые места
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <BarChart2 className="w-8 h-8 opacity-20" />
                </div>
                <p className="font-medium">Анализ не запущен</p>
                <p className="text-xs opacity-60 max-w-[200px] mt-2">Нажмите кнопку «Анализ», чтобы ИИ оценил качество вашего промпта на основе текущего чата.</p>
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
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold">Фактический результат:</span>
                                  {tc.expectedOutput && (
                                    <button 
                                      onClick={() => setShowDiffId(showDiffId === tc.id ? null : tc.id)}
                                      className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-colors ${showDiffId === tc.id ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                                    >
                                      <Split className="w-3 h-3" /> {showDiffId === tc.id ? 'Скрыть сравнение' : 'Сравнить с ожидаемым'}
                                    </button>
                                  )}
                                </div>
                                <div className="mt-1 p-2 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 max-h-32 overflow-y-auto whitespace-pre-wrap">
                                  {showDiffId === tc.id && tc.expectedOutput ? (
                                    <DiffView oldText={tc.expectedOutput} newText={result.actualOutput} />
                                  ) : (
                                    result.actualOutput
                                  )}
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

function getMetricIcon(key: string) {
  const k = key.toLowerCase();
  if (k.includes('clarity') || k.includes('ясность')) return <Eye className="w-3.5 h-3.5" />;
  if (k.includes('accuracy') || k.includes('точность')) return <Target className="w-3.5 h-3.5" />;
  if (k.includes('safety') || k.includes('безопасность')) return <ShieldCheck className="w-3.5 h-3.5" />;
  if (k.includes('conciseness') || k.includes('краткость')) return <Minimize2 className="w-3.5 h-3.5" />;
  if (k.includes('tone') || k.includes('стиль')) return <MessageSquare className="w-3.5 h-3.5" />;
  if (k.includes('format') || k.includes('формат')) return <Layout className="w-3.5 h-3.5" />;
  return <BarChart2 className="w-3.5 h-3.5" />;
}
