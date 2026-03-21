import React from 'react';
import { useStore } from '../store';
import { PromptEditor } from './PromptEditor';
import { TestChat } from './TestChat';
import { EvaluationPanel } from './EvaluationPanel';
import { ImprovementChat } from './ImprovementChat';
import { SettingsModal } from './SettingsModal';
import { Settings, LogOut, Moon, Sun, LayoutDashboard } from 'lucide-react';

export function Layout() {
  const { prompts, currentPrompt, selectPrompt, createPrompt, user, logout, theme, toggleTheme } = useStore();
  const [showSettings, setShowSettings] = React.useState(false);

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xl">
            <LayoutDashboard className="w-6 h-6" />
            Prompt Debugger
          </div>
          
          <select 
            className="ml-8 bg-slate-100 dark:bg-slate-800 border-none rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            value={currentPrompt?.id || ''}
            onChange={(e) => {
              if (e.target.value === 'new') {
                createPrompt({ name: 'New Prompt', content: '' });
              } else {
                selectPrompt(e.target.value);
              }
            }}
          >
            {prompts.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            <option value="new">+ Создать новый промпт</option>
          </select>
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
      <main className="flex-1 overflow-hidden flex">
        {/* Left Panel: Editor */}
        <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col">
          <PromptEditor />
        </div>

        {/* Middle Panel: Evaluation & Improvement */}
        <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto">
          <EvaluationPanel />
          <ImprovementChat />
        </div>

        {/* Right Panel: Chat */}
        <div className="w-1/3 flex flex-col bg-white dark:bg-slate-950">
          <TestChat />
        </div>
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
