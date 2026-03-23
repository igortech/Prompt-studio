import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Send, Bot, User, Code, ChevronDown, ChevronUp, Loader2, RotateCcw } from 'lucide-react';
import Markdown from 'react-markdown';
import { GOOGLE_MODELS, OLLAMA_MODELS } from '../constants/models';

export function TestChat() {
  const { messages, sendMessage, currentPrompt, user, replayHistory, isTesting } = useStore();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [provider, setProvider] = useState(user?.testProvider || 'google');
  const [model, setModel] = useState(user?.testModel || GOOGLE_MODELS[0].id);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      setProvider(user.testProvider || 'google');
      setModel(user.testModel || (user.testProvider === 'ollama' ? OLLAMA_MODELS[0].id : GOOGLE_MODELS[0].id));
    }
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-x border-slate-200 dark:border-slate-800">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-500" />
            Тестовый чат
          </h2>
          {messages.length > 0 && (
            <button
              onClick={() => replayHistory()}
              disabled={isTesting || isSending}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 flex items-center gap-1 text-sm disabled:opacity-50"
              title="Перетестировать историю с текущим промптом"
            >
              <RotateCcw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Перетестировать</span>
            </button>
          )}
        </div>
        <div className="flex gap-2 text-sm">
          <select 
            value={provider}
            onChange={e => {
              const newProvider = e.target.value;
              setProvider(newProvider);
              setModel(newProvider === 'google' ? GOOGLE_MODELS[0].id : OLLAMA_MODELS[0].id);
            }}
            className="bg-slate-100 dark:bg-slate-800 border-none rounded px-2 py-1 outline-none"
          >
            <option value="google">Google Gemini</option>
            <option value="ollama">Ollama Cloud</option>
          </select>
          <select 
            value={model}
            onChange={e => setModel(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 border-none rounded px-2 py-1 outline-none"
          >
            {(provider === 'google' ? GOOGLE_MODELS : OLLAMA_MODELS).map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, i) => (
          <MessageBubble key={msg.id || i} message={msg} />
        ))}
        {isSending && (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> ИИ думает...
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

function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === 'user';
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`flex gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
          {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
        </div>
        
        <div className="flex flex-col gap-1">
          <div className={`p-4 rounded-2xl ${isUser ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-sm'}`}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="markdown-body prose dark:prose-invert max-w-none text-sm">
                <Markdown>{message.content}</Markdown>
              </div>
            )}
          </div>
          
          {!isUser && (message.debugInfo || message.totalTokens || message.latencyMs) && (
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
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
    </div>
  );
}
