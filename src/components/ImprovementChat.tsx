import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Sparkles, Loader2, Check, X, ArrowRight, Send, Bot, User, Split, FileText, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { DiffView } from './DiffView';
import { motion, AnimatePresence } from 'motion/react';

export function ImprovementChat({ hideHeader = false, floating = false }: { hideHeader?: boolean, floating?: boolean }) {
  const { improvementMessages, sendImprovementMessage, rejectImprovement, isImproving, currentPrompt, updatePrompt, improvePrompt, evaluation, addNotification, activeMiddleTab, setActiveMiddleTab } = useStore();
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (activeMiddleTab === 'improvement' && floating) {
      setIsExpanded(true);
    }
  }, [activeMiddleTab, floating]);

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
    }
  }, [improvementMessages, isImproving, isExpanded]);

  // Close on click outside if floating
  useEffect(() => {
    if (!floating || !isExpanded) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        if (activeMiddleTab === 'improvement') {
          useStore.getState().setActiveMiddleTab('analysis');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [floating, isExpanded, activeMiddleTab]);

  const handleSend = async () => {
    if (!input.trim() || !currentPrompt) return;
    const msg = input.trim();
    setInput('');

    await sendImprovementMessage(msg);
  };

  if (!currentPrompt) return null;

  const chatContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {!hideHeader && (
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950 sticky top-0 z-10 shadow-sm">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Чат улучшений
          </h2>
          {floating && (
            <button 
              onClick={() => {
                setIsExpanded(false);
                if (activeMiddleTab === 'improvement') {
                  useStore.getState().setActiveMiddleTab('analysis');
                }
              }}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

        <div ref={scrollContainerRef} className="p-4 flex-1 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {improvementMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-slate-500 text-center">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Чат улучшений промпта</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-md">
                Ваш интеллектуальный помощник для управления и оптимизации промпта. 
                Я могу не только корректировать текст, но и запускать анализ, проводить тесты и управлять интерфейсом.
              </p>
              
              <div className="w-full max-w-md bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800 text-left">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Что я умею:</h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                      <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 prose prose-sm dark:prose-invert max-w-none">
                      <Markdown>**Оптимизация**: Улучшение структуры, логики и безопасности промпта.</Markdown>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <FileText className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 prose prose-sm dark:prose-invert max-w-none">
                      <Markdown>**Анализ**: Поиск ошибок и слабых мест в реальном времени.</Markdown>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Split className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 prose prose-sm dark:prose-invert max-w-none">
                      <Markdown>**Тестирование**: Запуск сценариев и проверка качества ответов.</Markdown>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <ArrowRight className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 prose prose-sm dark:prose-invert max-w-none">
                      <Markdown>**Управление**: Переключение вкладок и навигация по приложению.</Markdown>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            improvementMessages.map((msg, i) => (
              <ImprovementMessageBubble 
                key={msg.id || i} 
                message={msg} 
                currentPrompt={currentPrompt} 
                updatePrompt={updatePrompt} 
                rejectImprovement={rejectImprovement}
                addNotification={addNotification}
                onApply={() => {
                  setIsExpanded(false);
                  if (activeMiddleTab === 'improvement') {
                    setActiveMiddleTab('analysis');
                  }
                }}
              />
            ))
          )}
        
        {isImproving && (
          <div className="flex items-center gap-2 text-slate-500 p-2 text-xs">
            <Loader2 className="w-3 h-3 animate-spin text-indigo-500" /> ИИ думает...
          </div>
        )}
      </div>
    </div>
  );

  if (floating) {
    return (
      <motion.div 
        ref={containerRef}
        layout
        initial={false}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className="absolute z-50 bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        style={{ 
          width: isExpanded ? '100%' : 'calc(100% - 2rem)',
          height: isExpanded ? '100%' : 'auto',
          top: isExpanded ? '0' : 'auto',
          bottom: isExpanded ? '0' : '0.5rem',
          left: isExpanded ? '0' : '1rem',
          right: isExpanded ? '0' : '1rem',
          maxHeight: isExpanded ? '100%' : '85vh',
          borderRadius: isExpanded ? '0' : '1rem'
        }}
      >
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="flex-1 overflow-hidden flex flex-col min-h-0"
          >
            {chatContent}
          </motion.div>
        )}

        <motion.div layout="position" className="p-3 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Попросите ИИ улучшить промпт..."
              className="flex-1 resize-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
              rows={isExpanded ? 3 : 1}
            />
            <div className="flex flex-col gap-2">
              {isExpanded && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                    if (activeMiddleTab === 'improvement') {
                      useStore.getState().setActiveMiddleTab('analysis');
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Свернуть"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleSend}
                disabled={isImproving || !input.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl p-3 flex items-center justify-center transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {chatContent}
      <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Попросите ИИ улучшить промпт..."
            className="flex-1 resize-none bg-slate-100 dark:bg-slate-800 border-none rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={isImproving || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 flex items-center justify-center transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ImprovementMessageBubble({ message, currentPrompt, updatePrompt, rejectImprovement, addNotification, onApply }: { message: any, currentPrompt: any, updatePrompt: any, rejectImprovement: any, addNotification: any, onApply?: () => void }) {
  const isUser = message.role === 'user';
  const isAlreadyApplied = currentPrompt.content === message.improvedPrompt;
  const [showDiff, setShowDiff] = useState(true);

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`flex gap-3 max-w-[95%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-indigo-500' : 'bg-amber-500'}`}>
          {isUser ? <User className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
        </div>
        
        <div className="flex flex-col gap-2 w-full">
          <div className={`p-4 rounded-2xl ${isUser ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-sm'}`}>
            <div className="markdown-body prose dark:prose-invert max-w-none text-sm break-words overflow-hidden">
              <Markdown>{message.content}</Markdown>
            </div>
          </div>
          
          {!isUser && message.hasChanges && message.improvedPrompt && (
            <div className="mt-2 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30 w-full shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-300 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Предложенные изменения
                </h4>
                <div className="flex bg-white/50 dark:bg-black/20 rounded-lg p-0.5">
                  <button 
                    onClick={() => setShowDiff(false)}
                    className={`p-1 rounded transition-colors ${!showDiff ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
                    title="Показать текст"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setShowDiff(true)}
                    className={`p-1 rounded transition-colors ${showDiff ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
                    title="Показать отличия"
                  >
                    <Split className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              {message.diffSummary && (
                <div className="bg-white/40 dark:bg-black/10 rounded p-2 mb-3 border border-indigo-100/50 dark:border-indigo-900/30">
                  <p className="text-[11px] text-indigo-800 dark:text-indigo-400 font-medium">{message.diffSummary}</p>
                </div>
              )}
              
              <div className="relative mb-4">
                <div className="max-h-80 overflow-y-auto rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                  {showDiff ? (
                    <DiffView oldText={currentPrompt.content} newText={message.improvedPrompt} />
                  ) : (
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-3">
                      {message.improvedPrompt}
                    </pre>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => rejectImprovement(message.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-95"
                >
                  <X className="w-4 h-4" /> Отклонить
                </button>
                <button 
                  onClick={async () => {
                    if (isAlreadyApplied) return;
                    await updatePrompt(currentPrompt.id, { 
                      content: message.improvedPrompt,
                      saveVersion: true,
                      changeNote: message.diffSummary || 'Применены предложения ИИ',
                      analysis: null
                    });
                    addNotification('success', 'Промпт успешно обновлен');
                    if (onApply) onApply();
                  }}
                  disabled={isAlreadyApplied}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isAlreadyApplied 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-default' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg active:scale-95'
                  }`}
                >
                  {isAlreadyApplied ? <><Check className="w-4 h-4" /> Применено</> : <><Check className="w-4 h-4" /> Применить изменения</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
