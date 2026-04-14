# Prompt Studio

Веб-приложение для создания, тестирования, анализа и улучшения промптов для AI-моделей.

## Возможности

- **Создание промптов** — удобный редактор с поддержкой переменных
- **Тестирование** — интерактивный чат для проверки промптов в реальном времени
- **Анализ** — оценка качества промптов с метриками и рекомендациями
- **Улучшение** — AI-помощник для оптимизации промптов
- **История версий** — отслеживание изменений и сравнение версий
- **Тест-кейсы** — создание набора тестов для регрессионного тестирования
- **Множественные провайдеры** — поддержка Google Gemini и Ollama
- **Экспорт/Импорт** — сохранение и загрузка промптов в JSON

## Технологии

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Zustand
- **Backend:** Express.js, Prisma ORM
- **Database:** SQLite
- **AI:** Google Gemini API, Ollama
- **Auth:** JWT + Google OAuth

## Установка

### Требования

- Node.js 18+
- npm или yarn

### Настройка

1. Клонируйте репозиторий:
   ```bash
   git clone <repo-url>
   cd Prompt-studio
   ```

2. Установите зависимости:
   ```bash
   npm install
   ```

3. Настройте переменные окружения:
   ```bash
   cp .env.example .env
   ```

4. Отредактируйте `.env` файл:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   JWT_SECRET=your_random_secret
   OLLAMA_ENDPOINT=http://localhost:11434
   ```

5. Инициализируйте базу данных:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

## Запуск

### Режим разработки

```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:3000`

### Сборка для production

```bash
npm run build
npm run start
```

## Скрипты

| Скрипт | Описание |
|--------|----------|
| `npm run dev` | Запуск в режиме разработки |
| `npm run build` | Сборка production-версии |
| `npm run preview` | Предпросмотр сборки |
| `npm run start` | Запуск production-сервера |
| `npm run lint` | Проверка TypeScript |

## Структура проекта

```
Prompt-studio/
├── src/
│   ├── components/        # React компоненты
│   │   ├── Layout.tsx     # Основной layout приложения
│   │   ├── PromptEditor.tsx
│   │   ├── TestChat.tsx
│   │   ├── EvaluationPanel.tsx
│   │   ├── ImprovementChat.tsx
│   │   ├── HistoryPanel.tsx
│   │   └── ...
│   ├── store.ts          # Zustand store
│   ├── App.tsx           # Корневой компонент
│   └── main.tsx          # Точка входа
├── server/               # Express сервер
├── prisma/
│   └── schema.prisma     # Схема базы данных
├── server.ts             # Серверный entry point
├── init-db.js            # Скрипт инициализации БД
└── package.json
```
