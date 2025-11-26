export class NetworkError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthError extends Error {
  constructor(message: string = '认证失败') {
    super(message);
    this.name = 'AuthError';
  }
}

export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (error instanceof AuthError) {
        throw error;
      }

      if (i === maxRetries - 1) {
        throw lastError;
      }

      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }

  throw lastError!;
};