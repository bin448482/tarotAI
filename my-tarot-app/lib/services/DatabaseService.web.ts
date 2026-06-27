/**
 * Web shim for DatabaseService to avoid bundling expo-sqlite WASM on web.
 * Methods return safe defaults so upper layers can gracefully fall back to JSON.
 */

import type {
  DatabaseOperationResult,
  ServiceResponse,
  DatabaseStatus
} from '../types/database';

export class DatabaseService {
  private static instance: DatabaseService;

  // Singleton
  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // No-op initialization on web
  async initialize(): Promise<ServiceResponse<DatabaseStatus>> {
    return {
      success: true,
      data: {
        isInitialized: true,
        version: 1,
        lastSync: new Date().toISOString(),
      },
    };
  }

  async getStatus(): Promise<DatabaseStatus> {
    return {
      isInitialized: true,
      version: 1,
      lastSync: new Date().toISOString(),
    };
  }

  // Return empty rows so callers can use JSON fallback
  async query<T>(_sql: string, _params: any[] = []): Promise<ServiceResponse<T[]>> {
    return { success: true, data: [] };
  }

  async queryFirst<T>(_sql: string, _params: any[] = []): Promise<ServiceResponse<T | null>> {
    return { success: true, data: null };
  }

  // Execute/Batch are no-ops on web
  async execute(_sql: string, _params: any[] = []): Promise<ServiceResponse<DatabaseOperationResult>> {
    return { success: true, data: { success: true, affectedRows: 0 } };
  }

  async executeBatch(_statements: { sql: string; params?: any[] }[]): Promise<ServiceResponse<DatabaseOperationResult>> {
    return { success: true, data: { success: true, affectedRows: 0 } };
  }

  async transaction(callback: () => Promise<void>): Promise<ServiceResponse<void>> {
    try {
      await callback();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Transaction failed' };
    }
  }

  async reset(): Promise<ServiceResponse<void>> {
    return { success: true };
  }

  // No raw DB on web
  getRawDatabase(): any {
    return null;
  }
}

export default DatabaseService;