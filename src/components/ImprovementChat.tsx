import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Sparkles, Loader2, Check, X, ArrowRight, Send, Bot, User, Split, FileText } from 'lucide-react';
import Markdown from 'react-markdown';
import { DiffView } from './DiffView';

export function ImprovementChat() {
  const { improvementMessages, sendImprovementMessage, isImproving, currentPrompt, updatePrompt, improvePrompt, evaluation, addNotification } = useStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [improvementMessages, isImproving]);

  const handleSend = async () => {
    if (!input.trim() || !currentPrompt) return;
    const msg = input.trim();
    setInput('');

    if (msg === '/apply') {
      const lastChange = [...improvementMessages].reverse().find(m => m.hasChanges && m.improvedPrompt);
      if (lastChange && lastChange.improvedPrompt) {
        await updatePrompt(currentPrompt.id, { 
          content: lastChange.improvedPrompt,
          changeNote: lastChange.diffSummary || 'Применены предложения ИИ'
        });
        addNotification('success', 'Изменения применены');
      }
      return;
    }

    await sendImprovementMessage(msg);
  };

  if (!currentPrompt) return null;

  return (
    <div className="flex flex-col flex-1 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950">
        <h2 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          Чат улучшений
        </h2>
        <button
          onClick={improvePrompt}
          disabled={isImproving || !evaluation}
          className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          title={!evaluation ? "Сначала запустите оценку" : "Получить предложения ИИ на основе оценки"}
        >
          {isImproving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Получить предложения'}
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        {improvementMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-center">
            <Sparkles className="w-8 h-8 mb-4 text-indigo-400 opacity-50" />
            <p className="mb-2">Общайтесь с ИИ, чтобы улучшить ваш промпт.</p>
            <p className="text-sm opacity-75 mb-4">Попробуйте сказать: "Сделай его более кратким" или "Добавь правило о форматировании".</p>
            <div className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-left inline-block">
              <p className="font-semibold mb-1">Доступные команды:</p>
              <ul className="space-y-1 opacity-80">
                <li><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">/apply</code> - Применить последние предложенные изменения</li>
                <li><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">/reject</code> - Отклонить изменения</li>
                <li><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">/explain</code> - Запросить подробное объяснение</li>
                <li><code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">/variations</code> - Получить альтернативные версии</li>
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
              addNotification={addNotification}
            />
          ))
        )}
        
        {isImproving && (
          <div className="flex items-center gap-2 text-slate-500 p-4">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> ИИ думает...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

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

function ImprovementMessageBubble({ message, currentPrompt, updatePrompt, addNotification }: { message: any, currentPrompt: any, updatePrompt: any, addNotification: any }) {
  const isUser = message.role === 'user';
  const [applied, setApplied] = useState(false);
  const [showDiff, setShowDiff] = useState(true);

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`flex gap-3 max-w-[95%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-indigo-500' : 'bg-amber-500'}`}>
          {isUser ? <User className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
        </div>
        
        <div className="flex flex-col gap-2 w-full">
          <div className={`p-4 rounded-2xl ${isUser ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-sm'}`}>
            <div className="markdown-body prose dark:prose-invert max-w-none text-sm">
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
                    <pre className="text-xs font-mono whitespace-pre-wrap text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-3">
                      {message.improvedPrompt}
                    </pre>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button 
                  onClick={async () => {
                    await updatePrompt(currentPrompt.id, { 
                      content: message.improvedPrompt,
                      changeNote: message.diffSummary || 'Применены предложения ИИ'
                    });
                    setApplied(true);
                    addNotification('success', 'Промпт успешно обновлен');
                  }}
                  disabled={applied}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    applied 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-default' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg active:scale-95'
                  }`}
                >
                  {applied ? <><Check className="w-4 h-4" /> Применено</> : <><Check className="w-4 h-4" /> Применить изменения</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
