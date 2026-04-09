import React, { useState } from 'react';
import { useStore } from '../store';
import { X, Sparkles, FileText, Layout, Loader2 } from 'lucide-react';

interface CreatePromptModalProps {
  onClose: () => void;
}

export function CreatePromptModal({ onClose }: CreatePromptModalProps) {
  const { createPrompt, generatePromptFromFields, extractFieldsFromText, extractMetadataFromPrompt } = useStore();
  const [activeTab, setActiveTab] = useState<'structured' | 'description' | 'ready'>('description');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Structured fields
  const [fields, setFields] = useState({
    topic: '',
    role: '',
    audience: '',
    goal: '',
    constraints: '',
    tone: 'Профессиональный'
  });

  // Free text / Description
  const [descriptionText, setDescriptionText] = useState('');
  const [clarification, setClarification] = useState<string | null>(null);

  // Ready prompt
  const [readyText, setReadyText] = useState('');

  const handleCreateStructured = async () => {
    setIsGenerating(true);
    const result = await generatePromptFromFields(fields);
    if (result) {
      await createPrompt({
        name: result.name,
        description: result.description,
        content: result.content
      });
      onClose();
    }
    setIsGenerating(false);
  };

  const handleCreateDescription = async () => {
    setIsGenerating(true);
    setClarification(null);
    const result = await extractFieldsFromText(descriptionText);
    if (result) {
      if (result.needs_clarification) {
        setClarification(result.clarification_message);
      } else {
        await createPrompt({
          name: result.name,
          description: result.description,
          content: result.content
        });
        onClose();
      }
    }
    setIsGenerating(false);
  };

  const handleCreateReady = async () => {
    setIsGenerating(true);
    const result = await extractMetadataFromPrompt(readyText);
    if (result) {
      await createPrompt({
        name: result.name,
        description: result.description,
        content: readyText
      });
      onClose();
    }
    setIsGenerating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      const isDisabled = isGenerating || 
        (activeTab === 'description' ? !descriptionText.trim() : 
         activeTab === 'structured' ? !fields.topic.trim() : 
         !readyText.trim());
      
      if (!isDisabled) {
        e.preventDefault();
        if (activeTab === 'description') handleCreateDescription();
        else if (activeTab === 'structured') handleCreateStructured();
        else handleCreateReady();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-500" />
            Создать новый промпт
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('description')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'description' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Описание промпта
          </button>
          <button
            onClick={() => setActiveTab('structured')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'structured' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Layout className="w-4 h-4" />
            Конструктор
          </button>
          <button
            onClick={() => setActiveTab('ready')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'ready' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Готовый промпт
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'description' ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Опишите вашу идею</label>
                <textarea
                  value={descriptionText}
                  onKeyDown={handleKeyDown}
                  onChange={(e) => {
                    setDescriptionText(e.target.value);
                    if (clarification) setClarification(null);
                  }}
                  placeholder="Напр.: Мне нужен помощник, который будет проверять мои тексты на ошибки и предлагать более профессиональные формулировки для бизнес-переписки."
                  className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-h-[250px] transition-all ${
                    clarification ? 'border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/20' : 'border-slate-200 dark:border-slate-800'
                  }`}
                />
              </div>
              
              {clarification && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Нужно больше деталей:
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {clarification}
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-500 italic">
                AI проанализирует ваш текст и автоматически заполнит все необходимые поля для создания качественного промпта.
              </p>
            </div>
          ) : activeTab === 'structured' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Тема / Задача</label>
                  <input
                    type="text"
                    value={fields.topic}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => setFields({ ...fields, topic: e.target.value })}
                    placeholder="Напр., Генерация кода или Напиши статью"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Роль AI</label>
                  <input
                    type="text"
                    value={fields.role}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => setFields({ ...fields, role: e.target.value })}
                    placeholder="Напр., Senior Developer"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Аудитория</label>
                  <input
                    type="text"
                    value={fields.audience}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => setFields({ ...fields, audience: e.target.value })}
                    placeholder="Напр., Новички"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Тон</label>
                  <select
                    value={fields.tone}
                    onChange={(e) => setFields({ ...fields, tone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option>Профессиональный</option>
                    <option>Дружелюбный</option>
                    <option>Строгий</option>
                    <option>Творческий</option>
                    <option>Лаконичный</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Цель</label>
                <textarea
                  value={fields.goal}
                  onKeyDown={handleKeyDown}
                  onChange={(e) => setFields({ ...fields, goal: e.target.value })}
                  placeholder="Чего должен достичь этот промпт?"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Ограничения</label>
                <textarea
                  value={fields.constraints}
                  onKeyDown={handleKeyDown}
                  onChange={(e) => setFields({ ...fields, constraints: e.target.value })}
                  placeholder="Что AI НЕ должен делать?"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Вставьте готовый промпт</label>
                <textarea
                  value={readyText}
                  onKeyDown={handleKeyDown}
                  onChange={(e) => setReadyText(e.target.value)}
                  placeholder="Вставьте сюда полный текст вашего системного промпта..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-h-[250px]"
                />
              </div>
              <p className="text-xs text-slate-500 italic">
                AI проанализирует ваш промпт, чтобы извлечь метаданные и правильно классифицировать его в системе.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={
              activeTab === 'description' ? handleCreateDescription : 
              activeTab === 'structured' ? handleCreateStructured : 
              handleCreateReady
            }
            disabled={
              isGenerating || 
              (activeTab === 'description' ? !descriptionText.trim() : 
               activeTab === 'structured' ? !fields.topic.trim() : 
               !readyText.trim())
            }
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20 active:scale-95"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Обработка...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Создать промпт
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
