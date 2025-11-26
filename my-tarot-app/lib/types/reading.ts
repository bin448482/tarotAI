export interface SelectedCard {
  cardId: number;
  position: 'past' | 'present' | 'future';
  direction: 'upright' | 'reversed';
  revealed: boolean;
}

export interface InterpretationData {
  cardId: number;
  position: string;
  direction: string;
  summary: string;
  detail?: string;
  dimensionInterpretations?: {
    dimensionId: number;
    content: string;
    aspect?: string;
    aspectType?: string;
  }[];
}

export interface ReadingFlowState {
  step: number; // 当前步骤 (1-5)
  type: 'offline' | 'ai'; // 占卜类型
  category: string; // 占卜类别
  selectedCards: SelectedCard[]; // 选择的卡牌
  interpretations: InterpretationData[]; // 解读结果
  createdAt: Date; // 创建时间
  isLoading: boolean; // 加载状态
  error: string | null; // 错误信息
}

export const defaultReadingState: ReadingFlowState = {
  step: 1,
  type: 'offline',
  category: '',
  selectedCards: [],
  interpretations: [],
  createdAt: new Date(),
  isLoading: false,
  error: null,
};

export type ReadingAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_TYPE'; payload: 'offline' | 'ai' }
  | { type: 'SET_CATEGORY'; payload: string }
  | { type: 'SET_SELECTED_CARDS'; payload: SelectedCard[] }
  | { type: 'SET_INTERPRETATIONS'; payload: InterpretationData[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_STATE' }
  | { type: 'UPDATE_STATE'; payload: Partial<ReadingFlowState> };