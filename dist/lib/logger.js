"use strict";
/**
 * lib/logger.ts
 * 간단한 레벨별 로거
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
function log(level, tag, msg, data) {
    if (LEVELS[level] < LEVELS[currentLevel])
        return;
    const ts = new Date().toISOString();
    const line = `[${ts}] [${level.toUpperCase()}] [${tag}] ${msg}`;
    if (data !== undefined) {
        console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](line, data);
    }
    else {
        console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](line);
    }
}
exports.logger = {
    debug: (tag, msg, data) => log('debug', tag, msg, data),
    info: (tag, msg, data) => log('info', tag, msg, data),
    warn: (tag, msg, data) => log('warn', tag, msg, data),
    error: (tag, msg, data) => log('error', tag, msg, data),
};
