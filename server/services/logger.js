"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOG_FILE = path_1.default.join(process.cwd(), 'session.log');
const IS_PROD = process.env.NODE_ENV === 'production';
// Clear log on startup (when this module is loaded)
if (!IS_PROD) {
    try {
        fs_1.default.writeFileSync(LOG_FILE, `--- New Session Started: ${new Date().toISOString()} ---\n`);
    }
    catch (err) {
        console.error('Failed to initialize session log:', err);
    }
}
exports.logger = {
    info: (action, details) => {
        if (IS_PROD)
            return;
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] INFO: ${action}${details ? ' | ' + JSON.stringify(details) : ''}\n`;
        console.log(`INFO: ${action}`, details || '');
        try {
            fs_1.default.appendFileSync(LOG_FILE, entry);
        }
        catch (err) {
            console.error('Failed to write to session log:', err);
        }
    },
    warn: (action, details) => {
        if (IS_PROD)
            return;
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] WARN: ${action}${details ? ' | ' + JSON.stringify(details) : ''}\n`;
        console.warn(`WARN: ${action}`, details || '');
        try {
            fs_1.default.appendFileSync(LOG_FILE, entry);
        }
        catch (err) {
            console.error('Failed to write to session log:', err);
        }
    },
    error: (action, error, details) => {
        if (IS_PROD)
            return;
        const timestamp = new Date().toISOString();
        const errorMsg = error instanceof Error ? error.message : String(error);
        const entry = `[${timestamp}] ERROR: ${action} | ${errorMsg}${details ? ' | ' + JSON.stringify(details) : ''}\n`;
        console.error(`ERROR: ${action} | ${errorMsg}`, details || '');
        try {
            fs_1.default.appendFileSync(LOG_FILE, entry);
        }
        catch (err) {
            console.error('Failed to write to session log:', err);
        }
    }
};
