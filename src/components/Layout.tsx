import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '../store';
import { PromptEditor } from './PromptEditor';
import { TestChat } from './TestChat';
import { EvaluationPanel } from './EvaluationPanel';
import { HistoryPanel } from './HistoryPanel';
import { ImprovementChat } from './ImprovementChat';
import { SettingsModal } from './SettingsModal';
import { CreatePromptModal } from './CreatePromptModal';
import { EditPromptModal } from './EditPromptModal';
import { Settings, LogOut, Moon, Sun, LayoutDashboard, Download, Upload, PlusCircle, Trash2, Edit2, Sparkles, BarChart2, Target, History, Bot, ChevronUp, ChevronDown } from 'lucide-react';

function TestingView() {
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Tests View */}
      <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${showChat ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="flex-1 overflow-hidden flex flex-col">
          <EvaluationPanel view="tests" />
        </div>
        {/* Bottom Bar to open Chat */}
        <div 
          className="h-12 shrink-0 bg-indigo-50 dark:bg-indigo-900/20 border-t border-indigo-100 dark:border-indigo-800/30 flex items-center justify-center cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors group"
          onClick={() => setShowChat(true)}
        >
          <span className="font-semibold text-sm text-indigo-700 dark:text-indigo-300 flex items-center gap-2 group-hover:-translate-y-0.5 transition-transform">
            <Bot className="w-5 h-5" /> Тестовый чат <ChevronUp className="w-4 h-4 ml-1 opacity-50" />
          </span>
        </div>
      </div>

      {/* Chat View */}
      <div className={`absolute inset-0 flex flex-col transition-transform duration-300 ${showChat ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* Top Bar to open Tests */}
        <div 
          className="h-12 shrink-0 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/30 flex items-center justify-center cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors group"
          onClick={() => setShowChat(false)}
        >
          <span className="font-semibold text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2 group-hover:translate-y-0.5 transition-transform">
            <ChevronDown className="w-4 h-4 mr-1 opacity-50" /> Выполнение тестов <Target className="w-5 h-5" />
          </span>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          <TestChat />
        </div>
      </div>
    </div>
  );
}

export function Layout() {
  const { 
    prompts, currentPrompt, selectPrompt, createPrompt, deletePrompt, 
    user, logout, theme, toggleTheme, exportPrompt, importPrompt,
    activeMiddleTab, setActiveMiddleTab
  } = useStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasInitialChecked, setHasInitialChecked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically open create modal if no prompts exist on initial load
  useEffect(() => {
    if (user && prompts.length === 0 && !showCreateModal && user.hasGeminiKey && !hasInitialChecked) {
      setShowCreateModal(true);
      setHasInitialChecked(true);
    } else if (prompts.length > 0) {
      setHasInitialChecked(true);
    }
  }, [prompts.length, user, showCreateModal, hasInitialChecked]);

  // Automatically open settings if no API keys exist
  useEffect(() => {
    if (user && !user.hasGeminiKey && !user.hasOllamaKey && !showSettings) {
      setShowSettings(true);
    }
  }, [user, showSettings]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importPrompt(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xl">
            <LayoutDashboard className="w-6 h-6" />
            Студия Промптов
          </div>
          
          <div className="flex items-center gap-2 ml-8">
            <select 
              className="bg-slate-100 dark:bg-slate-800 border-none rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px] truncate"
              value={currentPrompt?.id || ''}
              onChange={(e) => selectPrompt(e.target.value)}
            >
              <option value="" disabled>Выберите промпт</option>
              {prompts.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1 text-sm font-medium px-3"
                title="Создать новый промпт"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden md:inline">Создать</span>
              </button>

              {currentPrompt && (
                <>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
                    title="Редактировать название и описание"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                    title="Удалить промпт"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {currentPrompt && (
            <div className="flex items-center gap-2 ml-4 border-l border-slate-200 dark:border-slate-800 pl-4">
              <button
                onClick={() => exportPrompt(currentPrompt.id)}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 flex items-center gap-1 text-sm"
                title="Экспорт промпта"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Экспорт</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 flex items-center gap-1 text-sm"
                title="Импорт промпта"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Импорт</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImport} 
                accept=".json" 
                className="hidden" 
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Настройки"
          >
            <Settings className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-800">
            {user?.picture ? (
              <img src={user.picture} alt="Avatar" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <button 
              onClick={logout}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-red-500"
              title="Выйти"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex relative">
        {/* Left Panel: Editor (60%) */}
        <div className="flex-[6] border-r border-slate-200 dark:border-slate-800 flex flex-col min-w-0">
          <PromptEditor />
        </div>

        {/* Right Panel: Evaluation & Improvement & Testing (40%) */}
        <div className="flex-[4] flex flex-col overflow-hidden bg-white dark:bg-slate-950 min-w-0">
          {/* Tabs Header */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-1">
            <button
              onClick={() => setActiveMiddleTab('history')}
              className={`flex items-center justify-center px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeMiddleTab === 'history' 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="История версий"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveMiddleTab('analysis')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                activeMiddleTab === 'analysis' 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span className="hidden lg:inline">Анализ</span>
            </button>
            <button
              onClick={() => setActiveMiddleTab('testing')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                activeMiddleTab === 'testing' 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Target className="w-4 h-4" />
              <span className="hidden lg:inline">Тестирование</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeMiddleTab === 'history' && <HistoryPanel />}
            {activeMiddleTab === 'analysis' && <EvaluationPanel view="analysis" />}
            {activeMiddleTab === 'testing' && <TestingView />}
            {activeMiddleTab === 'improvement' && <EvaluationPanel view="analysis" />}
          </div>
        </div>
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showCreateModal && <CreatePromptModal onClose={() => setShowCreateModal(false)} />}
      {showEditModal && <EditPromptModal onClose={() => setShowEditModal(false)} />}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && currentPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-950 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 scale-in-center">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Удалить промпт?</h3>
            </div>
            
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Вы уверены, что хотите удалить промпт <span className="font-bold text-slate-900 dark:text-slate-100">"{currentPrompt.name}"</span>? 
              Это действие необратимо и удалит всю историю версий и тесты.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  deletePrompt(currentPrompt.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
              >
                Удалить навсегда
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
