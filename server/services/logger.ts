import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'session.log');
const IS_PROD = process.env.NODE_ENV === 'production';

// Clear log on startup (when this module is loaded)
if (!IS_PROD) {
  try {
    fs.writeFileSync(LOG_FILE, `--- New Session Started: ${new Date().toISOString()} ---\n`);
  } catch (err) {
    console.error('Failed to initialize session log:', err);
  }
}

export const logger = {
  info: (action: string, details?: any) => {
    if (IS_PROD) return;
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] INFO: ${action}${details ? ' | ' + JSON.stringify(details) : ''}\n`;
    console.log(`INFO: ${action}`, details || '');
    try {
      fs.appendFileSync(LOG_FILE, entry);
    } catch (err) {
      console.error('Failed to write to session log:', err);
    }
  },
  warn: (action: string, details?: any) => {
    if (IS_PROD) return;
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] WARN: ${action}${details ? ' | ' + JSON.stringify(details) : ''}\n`;
    console.warn(`WARN: ${action}`, details || '');
    try {
      fs.appendFileSync(LOG_FILE, entry);
    } catch (err) {
      console.error('Failed to write to session log:', err);
    }
  },
  error: (action: string, error: any, details?: any) => {
    if (IS_PROD) return;
    const timestamp = new Date().toISOString();
    const errorMsg = error instanceof Error ? error.message : String(error);
    const entry = `[${timestamp}] ERROR: ${action} | ${errorMsg}${details ? ' | ' + JSON.stringify(details) : ''}\n`;
    console.error(`ERROR: ${action} | ${errorMsg}`, details || '');
    try {
      fs.appendFileSync(LOG_FILE, entry);
    } catch (err) {
      console.error('Failed to write to session log:', err);
    }
  }
};
