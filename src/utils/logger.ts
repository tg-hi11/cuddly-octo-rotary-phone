type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function log(level: LogLevel, module: string, message: string, error?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [${module}]`;

  if (level === 'ERROR') {
    console.error(`${prefix} ${message}`, error ?? '');
  } else if (level === 'WARN') {
    console.warn(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export const logger = {
  info: (module: string, message: string) => log('INFO', module, message),
  warn: (module: string, message: string) => log('WARN', module, message),
  error: (module: string, message: string, error?: unknown) => log('ERROR', module, message, error),
  debug: (module: string, message: string) => log('DEBUG', module, message),
};
