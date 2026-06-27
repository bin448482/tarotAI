import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReadingService } from '../services/ReadingService';
import { useAppContext } from './AppContext';

export interface SelectedCard {
  cardId: number;
  name: string;
  displayName?: string;
  imageUrl: string;
  position: 'past' | 'present' | 'future';
  dimension: DimensionData;
  direction: 'upright' | 'reversed';
  revealed: boolean;
  basicSummary?: string;
}

export interface DimensionData {
  id: number;
  name: string;
  category: string;
  description: string;
  aspect: string;
  aspect_type: number;
  localizedAspect?: string;
  localizedCategoryName?: string;
}

const formatCategoryLabel = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const separators = ['-', '—', '：', ':', '–'];
  let candidate = trimmed;
  for (const separator of separators) {
    if (trimmed.includes(separator)) {
      const parts = trimmed
        .split(separator)
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length > 0) {
        candidate = parts[0];
        break;
      }
    }
  }

  if (!candidate) return undefined;

  if (/[A-Za-z]/.test(candidate)) {
    return candidate
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return candidate;
};

const deriveCategoryDisplayName = (
  dimension?: Partial<DimensionData> | null,
  fallback?: string | null
): string | undefined => {
  if (!dimension) {
    return formatCategoryLabel(fallback ?? undefined);
  }

  return dimension.localizedCategoryName
    ?? formatCategoryLabel(dimension.name)
    ?? formatCategoryLabel(dimension.category)
    ?? formatCategoryLabel(fallback ?? undefined);
};

export interface ReadingFlowState {
  step: number;
  type: 'offline' | 'ai';
  category: string;
  categoryDisplayName?: string;
  // 选中的维度列表（由步骤2选择的类别映射得到，用于后续匹配）
  dimensions: DimensionData[];
  // AI占卜专用字段
  userDescription?: string;         // AI模式：用户问题描述
  aiDimensions?: DimensionData[];   // AI模式：推荐的维度
  aiResult?: {                      // AI解读结果
    dimension_summaries: Record<string, string>;
    overall_summary: string;
    insights: string[];
  };
  selectedCards: SelectedCard[];
  interpretations: any[];
  createdAt: Date;
  isLoading: boolean;
  error: string | null;
  savedToHistory: boolean;          // 新增：标记是否已保存到历史记录
}

interface ReadingContextType {
  state: ReadingFlowState;
  updateStep: (step: number) => void;
  updateType: (type: 'offline' | 'ai') => void;
  updateCategory: (category: string, displayName?: string) => void;
  updateDimensions: (dimensions: DimensionData[]) => void;
  updateUserDescription: (description: string) => void;
  updateAIDimensions: (dimensions: DimensionData[]) => void;
  updateAIResult: (result: any) => void;
  updateCards: (cards: SelectedCard[]) => void;
  updateInterpretations: (interpretations: any[]) => void;
  resetFlow: () => void;
  saveToHistory: () => Promise<number>;
  restoreState: () => Promise<void>;
}

const initialState: ReadingFlowState = {
  step: 1,
  type: 'offline',
  category: '',
  categoryDisplayName: undefined,
  dimensions: [],
  userDescription: undefined,
  aiDimensions: undefined,
  aiResult: undefined,
  selectedCards: [],
  interpretations: [],
  createdAt: new Date(),
  isLoading: false,
  error: null,
  savedToHistory: false,            // 初始化为未保存状态
};

type ReadingAction =
  | { type: 'UPDATE_STEP'; payload: number }
  | { type: 'UPDATE_TYPE'; payload: 'offline' | 'ai' }
  | { type: 'UPDATE_CATEGORY'; payload: { value: string; displayName?: string } }
  | { type: 'UPDATE_DIMENSIONS'; payload: DimensionData[] }
  | { type: 'UPDATE_USER_DESCRIPTION'; payload: string }
  | { type: 'UPDATE_AI_DIMENSIONS'; payload: DimensionData[] }
  | { type: 'UPDATE_AI_RESULT'; payload: any }
  | { type: 'UPDATE_CARDS'; payload: SelectedCard[] }
  | { type: 'UPDATE_INTERPRETATIONS'; payload: any[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SAVED_TO_HISTORY'; payload: boolean }
  | { type: 'RESET_STATE' }
  | { type: 'RESTORE_STATE'; payload: ReadingFlowState };

function readingReducer(state: ReadingFlowState, action: ReadingAction): ReadingFlowState {
  switch (action.type) {
    case 'UPDATE_STEP':
      return { ...state, step: action.payload };
    case 'UPDATE_TYPE':
      return { ...state, type: action.payload };
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        category: action.payload.value,
        categoryDisplayName: action.payload.displayName ?? action.payload.value,
      };
    case 'UPDATE_CARDS':
      return { ...state, selectedCards: action.payload };
    case 'UPDATE_DIMENSIONS':
      return { ...state, dimensions: action.payload };
    case 'UPDATE_USER_DESCRIPTION':
      return { ...state, userDescription: action.payload };
    case 'UPDATE_AI_DIMENSIONS':
      return { ...state, aiDimensions: action.payload };
    case 'UPDATE_AI_RESULT':
      return { ...state, aiResult: action.payload };
    case 'UPDATE_INTERPRETATIONS':
      return { ...state, interpretations: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SAVED_TO_HISTORY':
      return { ...state, savedToHistory: action.payload };
    case 'RESET_STATE':
      return { ...initialState, createdAt: new Date() };
    case 'RESTORE_STATE': {
      const dimensionSource = action.payload.dimensions?.[0] ?? null;
      const restored = {
        ...state,
        ...action.payload,
        createdAt: new Date(action.payload.createdAt),
      };
      const derivedName = deriveCategoryDisplayName(
        dimensionSource,
        action.payload.category ?? restored.category
      );
      restored.categoryDisplayName =
        restored.categoryDisplayName ?? derivedName ?? restored.category ?? '';
      return restored;
    }
    default:
      return state;
  }
}

const ReadingContext = createContext<ReadingContextType | undefined>(undefined);

export function ReadingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(readingReducer, initialState);
  const {
    state: { userId: appUserId, locale: appLocale },
  } = useAppContext();

  const updateStep = useCallback((step: number) => {
    dispatch({ type: 'UPDATE_STEP', payload: step });
  }, []);

  const updateType = useCallback((type: 'offline' | 'ai') => {
    dispatch({ type: 'UPDATE_TYPE', payload: type });
  }, []);

  const updateCategory = useCallback((category: string, displayName?: string) => {
    const resolvedDisplayName =
      displayName ?? deriveCategoryDisplayName(state.dimensions?.[0], category) ?? category;

    dispatch({
      type: 'UPDATE_CATEGORY',
      payload: { value: category, displayName: resolvedDisplayName },
    });
  }, [state.dimensions]);

  const updateCards = useCallback((cards: SelectedCard[]) => {
    dispatch({ type: 'UPDATE_CARDS', payload: cards });
  }, []);

  const updateDimensions = useCallback((dimensions: DimensionData[]) => {
    dispatch({ type: 'UPDATE_DIMENSIONS', payload: dimensions });
  }, []);

  const updateUserDescription = useCallback((description: string) => {
    dispatch({ type: 'UPDATE_USER_DESCRIPTION', payload: description });
  }, []);

  const updateAIDimensions = useCallback((dimensions: DimensionData[]) => {
    dispatch({ type: 'UPDATE_AI_DIMENSIONS', payload: dimensions });
  }, []);

  const updateAIResult = useCallback((result: any) => {
    dispatch({ type: 'UPDATE_AI_RESULT', payload: result });
  }, []);

  const updateInterpretations = useCallback((interpretations: any[]) => {
    dispatch({ type: 'UPDATE_INTERPRETATIONS', payload: interpretations });
  }, []);

  const resetFlow = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
    AsyncStorage.removeItem('reading_state');
  }, []);

  const saveToHistory = useCallback(async () => {
    try {
      console.log('开始保存占卜记录到历史...');

      const readingService = ReadingService.getInstance();
      const userId = appUserId ?? 'anonymous_user';
      const result = await readingService.saveReadingFromState(state, userId, appLocale);

      if (result.success) {
        console.log('占卜记录保存成功，ID:', result.data);
        // 设置保存标记
        dispatch({ type: 'SET_SAVED_TO_HISTORY', payload: true });
        return result.data; // 返回保存的记录ID
      } else {
        const errorMessage = result.error || '保存失败，原因未知';
        console.error('保存占卜记录失败:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存占卜记录时出现未知错误';
      console.error('保存占卜记录时出错:', errorMessage);
      throw new Error(errorMessage);
    }
  }, [state, appUserId, appLocale]);

  const restoreState = useCallback(async () => {
    try {
      const savedState = await AsyncStorage.getItem('reading_state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        dispatch({ type: 'RESTORE_STATE', payload: parsedState });
      }
    } catch (error) {
      console.error('Failed to restore reading state:', error);
    }
  }, []);

  // 状态变化时自动保存
  useEffect(() => {
    AsyncStorage.setItem('reading_state', JSON.stringify(state));
  }, [state]);

  // 应用启动时恢复状态
  useEffect(() => {
    restoreState();
  }, [restoreState]);

  const value: ReadingContextType = {
    state,
    updateStep,
    updateType,
    updateCategory,
    updateDimensions,
    updateUserDescription,
    updateAIDimensions,
    updateAIResult,
    updateCards,
    updateInterpretations,
    resetFlow,
    saveToHistory,
    restoreState,
  };

  return <ReadingContext.Provider value={value}>{children}</ReadingContext.Provider>;
}

export function useReadingFlow() {
  const context = useContext(ReadingContext);
  if (context === undefined) {
    throw new Error('useReadingFlow must be used within a ReadingProvider');
  }
  return context;
}
