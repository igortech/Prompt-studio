import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Send, Bot, User, Code, ChevronDown, ChevronUp, Loader2, RotateCcw, ChevronLeft, ChevronRight, Trash2, PlusCircle } from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { GOOGLE_MODELS, OLLAMA_MODELS } from '../constants/models';

export function TestChat() {
  const { messages, sendMessage, currentPrompt, user, replayHistory, clearMessages, isTesting } = useStore();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [provider, setProvider] = useState(user?.testProvider || 'google');
  const [model, setModel] = useState(user?.testModel || GOOGLE_MODELS[0].id);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleClear = async () => {
    await clearMessages();
    setShowClearConfirm(false);
  };

  useEffect(() => {
    if (user) {
      setProvider(user.testProvider || 'google');
      setModel(user.testModel || (user.testProvider === 'ollama' ? OLLAMA_MODELS[0].id : GOOGLE_MODELS[0].id));
    }
  }, [user]);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !currentPrompt) return;
    setIsSending(true);
    await sendMessage(input, undefined, provider, model);
    setInput('');
    setIsSending(false);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950 h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3 bg-white dark:bg-slate-950">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold flex items-center gap-2 whitespace-nowrap min-w-0">
            <Bot className="w-5 h-5 text-indigo-500 shrink-0" />
            <span className="truncate">Тестовый чат</span>
          </h2>
          <div className="flex items-center gap-1 shrink-0 relative">
            {messages.length > 0 && (
              <>
                <button
                  onClick={() => replayHistory()}
                  disabled={isTesting || isSending}
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 flex items-center gap-1 text-xs disabled:opacity-50 transition-colors"
                  title="Перетестировать историю с текущим промптом"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Перетестировать</span>
                </button>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={isTesting || isSending}
                  className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-500 transition-colors disabled:opacity-50"
                  title="Очистить чат"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <AnimatePresence>
                  {showClearConfirm && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl w-48"
                    >
                      <p className="text-xs font-medium mb-3">Очистить историю чата?</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleClear}
                          className="flex-1 bg-red-600 text-white py-1.5 rounded-lg text-[10px] font-bold hover:bg-red-700 transition-colors"
                        >
                          Очистить
                        </button>
                        <button 
                          onClick={() => setShowClearConfirm(false)}
                          className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-1.5 rounded-lg text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          Отмена
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2 text-sm w-full">
          <select 
            value={provider}
            onChange={e => {
              const newProvider = e.target.value;
              setProvider(newProvider);
              setModel(newProvider === 'google' ? GOOGLE_MODELS[0].id : OLLAMA_MODELS[0].id);
            }}
            className="bg-slate-100 dark:bg-slate-800 border-none rounded px-2 py-1.5 outline-none flex-1 min-w-0"
          >
            <option value="google">Google Gemini</option>
            <option value="ollama">Ollama</option>
          </select>
          <select 
            value={model}
            onChange={e => setModel(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 border-none rounded px-2 py-1.5 outline-none flex-1 min-w-0"
          >
            {(provider === 'google' ? GOOGLE_MODELS : OLLAMA_MODELS).map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble key={msg.id || i} message={msg} index={i} messages={messages} />
          ))}
        </AnimatePresence>
        {isSending && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-slate-500"
          >
            <Loader2 className="w-4 h-4 animate-spin" /> ИИ думает...
          </motion.div>
        )}
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
            placeholder="Введите сообщение..."
            className="flex-1 resize-none bg-slate-100 dark:bg-slate-800 border-none rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 flex items-center justify-center transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, index, messages }: { message: any, index: number, messages: any[] }) {
  const { createTestCase, addNotification } = useStore();
  const isUser = message.role === 'user';
  const [showDebug, setShowDebug] = useState(false);
  const [isCreatingTest, setIsCreatingTest] = useState(false);

  const handleCreateTest = async () => {
    const prevUserMsg = messages.slice(0, index).reverse().find(m => m.role === 'user');
    if (!prevUserMsg) {
      addNotification('error', 'Не найден исходный запрос пользователя');
      return;
    }
    setIsCreatingTest(true);
    await createTestCase({
      input: prevUserMsg.content,
      expectedOutput: message.content
    });
    addNotification('success', 'Тест-кейс успешно создан');
    setIsCreatingTest(false);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
    >
      <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
          {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
        </div>
        
        <div className="flex flex-col gap-1">
          <div className={`p-4 rounded-2xl ${isUser ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-sm'}`}>
            {isUser ? (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            ) : (
              <div className="markdown-body prose dark:prose-invert max-w-none text-sm break-words overflow-hidden">
                <Markdown>{message.content}</Markdown>
              </div>
            )}
          </div>
          
          {!isUser && (
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium flex-wrap">
                {message.totalTokens !== undefined && (
                  <span className="flex items-center gap-1">
                    <Code className="w-3 h-3" /> {message.totalTokens} токенов
                  </span>
                )}
                {message.latencyMs !== undefined && (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3" /> {message.latencyMs} мс
                  </span>
                )}
                {message.debugInfo && (
                  <button 
                    onClick={() => setShowDebug(!showDebug)}
                    className="flex items-center gap-1 text-indigo-500 hover:text-indigo-600 transition-colors"
                  >
                    {showDebug ? 'Скрыть детали' : 'Детали'} {showDebug ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
                <button
                  onClick={handleCreateTest}
                  disabled={isCreatingTest}
                  className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 transition-colors ml-auto"
                  title="Создать тест-кейс из этого ответа"
                >
                  {isCreatingTest ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlusCircle className="w-3 h-3" />}
                  Создать тест
                </button>
              </div>
              
              {showDebug && message.debugInfo && (
                <div className="p-3 bg-slate-100 dark:bg-slate-900/50 text-slate-800 dark:text-slate-300 rounded-lg text-[10px] font-mono overflow-x-auto max-w-full border border-slate-200 dark:border-slate-800 shadow-inner">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(JSON.parse(message.debugInfo), null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
