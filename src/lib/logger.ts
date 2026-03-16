/**
 * lib/logger.ts
 * 간단한 레벨별 로거
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const currentLevel: Level =
  (process.env.LOG_LEVEL as Level) ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function log(level: Level, tag: string, msg: string, data?: unknown): void {
  if (LEVELS[level] < LEVELS[currentLevel]) return;
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.toUpperCase()}] [${tag}] ${msg}`;
  if (data !== undefined) {
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](line, data);
  } else {
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](line);
  }
}

export const logger = {
  debug: (tag: string, msg: string, data?: unknown) => log('debug', tag, msg, data),
  info:  (tag: string, msg: string, data?: unknown) => log('info',  tag, msg, data),
  warn:  (tag: string, msg: string, data?: unknown) => log('warn',  tag, msg, data),
  error: (tag: string, msg: string, data?: unknown) => log('error', tag, msg, data),
};
