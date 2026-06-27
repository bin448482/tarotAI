type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isLogLevel = (value: string): value is LogLevel => {
  return value === 'debug' || value === 'info' || value === 'warn' || value === 'error';
};

const resolveEnvConfig = () => {
  const rawLevel = (process.env.EXPO_PUBLIC_LOG_LEVEL ?? '').toLowerCase();
  const envLevel = isLogLevel(rawLevel) ? rawLevel : undefined;
  const includeStackEnv = (process.env.EXPO_PUBLIC_LOG_INCLUDE_STACK ?? '').toLowerCase();
  const includeStack = includeStackEnv === '1' || includeStackEnv === 'true';
  const tag = process.env.EXPO_PUBLIC_LOG_TAG || 'TarotApp';

  return { envLevel, includeStack, tag };
};

type LoggerConfig = {
  level?: LogLevel;
  includeStack?: boolean;
  tag?: string;
};

const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const envConfig = resolveEnvConfig();

const defaultConfig: Required<LoggerConfig> = {
  level: envConfig.envLevel ?? (__DEV__ ? 'info' : 'warn'),
  includeStack: __DEV__ ? envConfig.includeStack : false,
  tag: envConfig.tag,
};

let currentConfig: Required<LoggerConfig> = { ...defaultConfig };
let isInitialized = false;

const originalConsole = {
  debug: console.debug.bind(console),
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

const serialize = (input: unknown, includeStack: boolean): string => {
  if (input instanceof Error) {
    if (includeStack && input.stack) {
      return `${input.name}: ${input.message}\n${input.stack}`;
    }
    return `${input.name}: ${input.message}`;
  }

  if (typeof input === 'string') {
    return input;
  }

  if (typeof input === 'number' || typeof input === 'boolean') {
    return String(input);
  }

  if (input === undefined) {
    return 'undefined';
  }

  if (input === null) {
    return 'null';
  }

  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
};

const formatMessage = (level: LogLevel, args: unknown[]): string => {
  const serialized = args
    .map((arg) => serialize(arg, currentConfig.includeStack))
    .filter((arg) => arg.length > 0);

  if (serialized.length === 0) {
    return '';
  }

  const prefix = `[${currentConfig.tag}] [${level.toUpperCase()}]`;
  return `${prefix} ${serialized.join(' ')}`;
};

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVEL_WEIGHT[level] >= LOG_LEVEL_WEIGHT[currentConfig.level];
};

const logThrough = (level: LogLevel, message: string) => {
  if (!message) {
    return;
  }

  switch (level) {
    case 'debug':
    case 'info':
      originalConsole.log(message);
      break;
    case 'warn':
      originalConsole.warn(message);
      break;
    case 'error':
      // Use warn channel to avoid React Native stack spam while still highlighting errors.
      originalConsole.warn(message);
      break;
    default:
      originalConsole.log(message);
  }
};

const createLoggerMethod =
  (level: LogLevel) =>
  (...args: unknown[]) => {
    if (!shouldLog(level)) {
      return;
    }
    const message = formatMessage(level, args);
    logThrough(level, message);
  };

export const logger = {
  debug: (...args: unknown[]) => createLoggerMethod('debug')(...args),
  info: (...args: unknown[]) => createLoggerMethod('info')(...args),
  warn: (...args: unknown[]) => createLoggerMethod('warn')(...args),
  error: (...args: unknown[]) => createLoggerMethod('error')(...args),
};

const proxyConsole = () => {
  console.debug = (...args: unknown[]) => logger.debug(...args);
  console.log = (...args: unknown[]) => logger.info(...args);
  console.info = (...args: unknown[]) => logger.info(...args);
  console.warn = (...args: unknown[]) => logger.warn(...args);
  console.error = (...args: unknown[]) => logger.error(...args);
};

export const setupLogging = (config?: LoggerConfig) => {
  if (config) {
    currentConfig = { ...currentConfig, ...config };
  }

  if (isInitialized) {
    return;
  }

  proxyConsole();
  isInitialized = true;

  originalConsole.log(
    `[${currentConfig.tag}] Logging initialized with level=${currentConfig.level}, includeStack=${currentConfig.includeStack}`,
  );
};

export const setLogLevel = (level: LogLevel) => {
  currentConfig = { ...currentConfig, level };
};

export const setIncludeStack = (includeStack: boolean) => {
  currentConfig = { ...currentConfig, includeStack };
};
