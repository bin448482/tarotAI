/**
 * API配置文件
 * 统一管理所有API相关的配置
 */

import Constants from 'expo-constants';

interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

const DOCKER_API_PORT = 8000;
const FALLBACK_LOCAL_IP = '192.168.71.8'; // 确保始终使用局域网IP

const disallowedHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

type ExtraRecord = Record<string, unknown>;

const getExtraValue = (key: string): string | undefined => {
  const manifest2Extra =
    ((Constants as unknown as { manifest2?: { extra?: ExtraRecord } }).manifest2?.extra ?? {}) as ExtraRecord;
  const legacyManifestExtra =
    ((Constants.manifest as { extra?: ExtraRecord } | undefined)?.extra ?? {}) as ExtraRecord;
  const expoExtra = (Constants.expoConfig?.extra ?? {}) as ExtraRecord;
  // Expo Go 在本地调试时可能通过 expoGoConfig 暴露额外信息
  const expoGoExtra =
    ((Constants as unknown as { expoGoConfig?: { extra?: ExtraRecord } }).expoGoConfig?.extra ?? {}) as ExtraRecord;

  const value = manifest2Extra[key] ?? legacyManifestExtra[key] ?? expoExtra[key] ?? expoGoExtra[key];

  return typeof value === 'string' ? value : undefined;
};

const normaliseUrl = (value: string): string | null => {
  if (!value) {
    return null;
  }

  let url = value.trim();
  if (!url) {
    return null;
  }

  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }

  try {
    const parsed = new URL(url);
    if (disallowedHosts.has(parsed.hostname)) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
};

const extractHostIpFromExpo = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    // @ts-expect-error - legacy manifest shape
    Constants.manifest?.hostUri ||
    // @ts-expect-error - Expo Go config shape
    Constants.expoGoConfig?.hostUri ||
    '';

  const match = hostUri.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
  if (!match) {
    return null;
  }

  const ip = match[1];
  if (disallowedHosts.has(ip)) {
    return null;
  }

  return ip;
};

const resolveDevelopmentBaseUrl = (): string => {
  const envUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL ||
    // Expo extra config
    getExtraValue('API_BASE_URL');

  const normalisedEnv = envUrl ? normaliseUrl(envUrl) : null;
  if (normalisedEnv) {
    return normalisedEnv;
  }

  const inferredIp = extractHostIpFromExpo();
  if (inferredIp && inferredIp.startsWith('192.')) {
    return `http://${inferredIp}:${DOCKER_API_PORT}`;
  }

  // Expo hostUri 可能返回 10.x 或 172.x 的局域网地址，按需接受
  if (inferredIp && !disallowedHosts.has(inferredIp)) {
    return `http://${inferredIp}:${DOCKER_API_PORT}`;
  }

  return `http://${FALLBACK_LOCAL_IP}:${DOCKER_API_PORT}`;
};

const resolveProductionBaseUrl = (): string => {
  const candidates: Array<string | undefined> = [
    process.env.EXPO_PUBLIC_API_BASE_URL,
    process.env.PUBLIC_API_BASE_URL,
    process.env.API_BASE_URL,
    getExtraValue('PUBLIC_API_BASE_URL'),
    getExtraValue('API_BASE_URL'),
  ];

  for (const candidate of candidates) {
    const normalised = candidate ? normaliseUrl(candidate) : null;
    if (normalised) {
      return normalised;
    }
  }

  // 默认生产地址占位，部署前需覆盖
  return 'https://your-production-api.com';
};

let isFetchLoggingInjected = false;

const isRequestLike = (value: unknown): value is Request => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'url' in value &&
    typeof (value as { url: unknown }).url === 'string' &&
    'method' in value &&
    typeof (value as { method: unknown }).method === 'string'
  );
};

const resolveRequestUrl = (input: RequestInfo | URL): string => {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  if (isRequestLike(input)) {
    return input.url;
  }

  try {
    return String(input);
  } catch {
    return '[unserializable-request]';
  }
};

const resolveRequestMethod = (init?: RequestInit, input?: RequestInfo | URL): string => {
  if (init?.method) {
    return init.method.toUpperCase();
  }

  if (input && isRequestLike(input)) {
    return input.method.toUpperCase();
  }

  return 'GET';
};

const injectFetchLogging = () => {
  if (isFetchLoggingInjected) {
    return;
  }

  if (typeof globalThis.fetch !== 'function') {
    return;
  }

  const originalFetch: typeof fetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = resolveRequestUrl(input);
    const method = resolveRequestMethod(init, input);
    console.log(`[TarotApp][API] → ${method} ${url}`);

    try {
      const response = await originalFetch(input, init);
      console.log(`[TarotApp][API] ← ${method} ${url} :: ${response.status}`);
      return response;
    } catch (error) {
      console.warn(`[TarotApp][API] ✖ ${method} ${url}`, error);
      throw error;
    }
  }) as typeof fetch;

  isFetchLoggingInjected = true;
};

const createApiConfig = (): ApiConfig => {
  if (__DEV__) {
    return {
      baseUrl: resolveDevelopmentBaseUrl(),
      timeout: 10000,
    };
  }

  return {
    baseUrl: resolveProductionBaseUrl(),
    timeout: 15000,
  };
};

export const apiConfig: ApiConfig = createApiConfig();

// 常用的API端点
export const endpoints = {
  // 认证相关
  auth: {
    register: '/api/v1/users/register',
  },
  // AI解读相关
  readings: {
    analyze: '/api/v1/readings/analyze',
    generate: '/api/v1/readings/generate',
  },
  // 健康检查
  health: '/health',
  // 支付相关
  payments: {
    checkout: '/api/v1/payments/checkout',
  },
} as const;

// 辅助函数：构建完整的API URL
export const buildApiUrl = (endpoint: string): string => {
  return `${apiConfig.baseUrl}${endpoint}`;
};

// 辅助函数：获取请求配置
export const getRequestConfig = (options: RequestInit = {}): RequestInit => {
  return {
    timeout: apiConfig.timeout,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
    ...options,
  };
};

// 初始化API配置（简化版本，不依赖额外的包）
export const initializeApiConfig = async (): Promise<void> => {
  injectFetchLogging();
  console.log('🌐 API配置初始化完成，使用地址:', apiConfig.baseUrl);
  console.log('💡 可通过 EXPO_PUBLIC_API_BASE_URL 或 app.json extra.API_BASE_URL 自定义后端地址');
};
