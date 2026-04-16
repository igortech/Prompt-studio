"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const envPath = path_1.default.resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);
const result = dotenv_1.default.config({ path: envPath });
if (result.error) {
    console.warn('No .env file found, using default values');
}
else {
    console.log('.env loaded successfully');
}
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const vite_1 = require("vite");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_js_1 = __importDefault(require("./server/routes/auth.js"));
const prompts_js_1 = __importDefault(require("./server/routes/prompts.js"));
const testCases_js_1 = __importDefault(require("./server/routes/testCases.js"));
const chat_js_1 = __importDefault(require("./server/routes/chat.js"));
require("./server/cron/cleanup.js");
async function startServer() {
    const app = (0, express_1.default)();
    const PORT = parseInt(process.env.PORT || '3000', 10);
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use((0, cookie_parser_1.default)());
    // API Routes
    app.use('/api/auth', auth_js_1.default);
    app.use('/auth', auth_js_1.default); // Handle /auth/callback from OAuth provider
    app.use('/api/prompts', prompts_js_1.default);
    app.use('/api/test-cases', testCases_js_1.default);
    app.use('/api/chat', chat_js_1.default);
    // Vite middleware for development
    if (process.env.NODE_ENV !== 'production') {
        const vite = await (0, vite_1.createServer)({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    }
    else {
        const distPath = path_1.default.join(process.cwd(), 'dist');
        app.use(express_1.default.static(distPath));
        app.get('*', (req, res) => {
            res.sendFile(path_1.default.join(distPath, 'index.html'));
        });
    }
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
startServer();
