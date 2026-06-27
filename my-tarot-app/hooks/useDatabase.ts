/**
 * 数据库状态管理Hook
 * Database state management hook
 */

import { useState, useEffect, useCallback } from 'react';
import { DatabaseInitializer } from '../lib/database/initializer';
import type { DatabaseStatus, Spread } from '../lib/types/database';

interface DatabaseState {
  isInitializing: boolean;
  isInitialized: boolean;
  error: string | null;
  status: DatabaseStatus | null;
  spreads: Spread[];
}

interface UseDatabaseReturn extends DatabaseState {
  initialize: () => Promise<void>;
  reset: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useDatabase(): UseDatabaseReturn {
  const [state, setState] = useState<DatabaseState>({
    isInitializing: false,
    isInitialized: false,
    error: null,
    status: null,
    spreads: []
  });

  const initializer = new DatabaseInitializer();

  /**
   * 初始化数据库
   */
  const initialize = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isInitializing: true,
      error: null
    }));

    try {
      const success = await initializer.initialize();
      if (success) {
        const status = await initializer.getStatus();
        setState(prev => ({
          ...prev,
          isInitializing: false,
          isInitialized: true,
          status: status?.database || null,
          spreads: status?.spreads.data || []
        }));
      } else {
        setState(prev => ({
          ...prev,
          isInitializing: false,
          error: 'Database initialization failed'
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isInitializing: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  /**
   * 重置数据库
   */
  const reset = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isInitializing: true,
      error: null
    }));

    try {
      const success = await initializer.reset();
      if (success) {
        const status = await initializer.getStatus();
        setState(prev => ({
          ...prev,
          isInitializing: false,
          isInitialized: true,
          status: status?.database || null,
          spreads: status?.spreads.data || []
        }));
      } else {
        setState(prev => ({
          ...prev,
          isInitializing: false,
          error: 'Database reset failed'
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isInitializing: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  /**
   * 刷新数据库状态
   */
  const refresh = useCallback(async () => {
    try {
      const status = await initializer.getStatus();
      if (status) {
        setState(prev => ({
          ...prev,
          status: status.database,
          spreads: status.spreads.data,
          isInitialized: status.database.isInitialized
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh status'
      }));
    }
  }, []);

  /**
   * 组件挂载时自动初始化
   */
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    ...state,
    initialize,
    reset,
    refresh
  };
}