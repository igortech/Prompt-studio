import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Send, Bot, User, Code, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';

export function TestChat() {
  const { messages, sendMessage, currentPrompt } = useStore();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [provider, setProvider] = useState('google');
  const [model, setModel] = useState('gemini-3-flash-preview');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        <h2 className="font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-500" />
          Тестовый чат
        </h2>
        <div className="flex gap-2 text-sm">
          <select 
            value={provider}
            onChange={e => {
              setProvider(e.target.value);
              setModel(e.target.value === 'google' ? 'gemini-3-flash-preview' : 'llama3');
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
            {provider === 'google' ? (
              <>
                <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
                <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
              </>
            ) : (
              <>
                <option value="llama3">llama3</option>
                <option value="mistral">mistral</option>
                <option value="gemma">gemma</option>
              </>
            )}
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
          
          {!isUser && message.debugInfo && (
            <div className="mt-1">
              <button 
                onClick={() => setShowDebug(!showDebug)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-500 transition-colors"
              >
                <Code className="w-3 h-3" /> Отладочная информация {showDebug ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              
              {showDebug && (
                <div className="mt-2 p-3 bg-slate-900 text-slate-300 rounded-lg text-xs font-mono overflow-x-auto max-w-full border border-slate-700">
                  <pre>{JSON.stringify(JSON.parse(message.debugInfo), null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
