/**
 * 历史记录组件样式文件
 * History components styles
 */

import { StyleSheet } from 'react-native';

// 通用颜色系统
export const HistoryColors = {
  // 基础色
  primary: '#FFD700',
  secondary: '#B8860B',
  accent: '#DAA520',

  // 背景色
  background: '#0F0F1A',
  surface: '#1A1A2E',
  elevated: '#16213E',
  card: '#1A1A2E',

  // 文字色
  text: '#E6E6FA',
  textSecondary: '#8B8878',
  textDisabled: '#555555',

  // 状态色
  success: '#228B22',
  warning: '#CD853F',
  error: '#8B0000',
  ai: '#00CED1',

  // 透明度
  overlay: 'rgba(0, 0, 0, 0.7)',
  glassBg: 'rgba(255, 215, 0, 0.1)',
  glassBorder: 'rgba(255, 215, 0, 0.3)',
};

// 动画时间
export const HistoryAnimations = {
  instant: 150,
  fast: 250,
  normal: 400,
  slow: 600,
  hero: 1000,
};

// 阴影系统
export const HistoryShadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
};

// 通用样式
export const CommonHistoryStyles = StyleSheet.create({
  // 容器样式
  container: {
    flex: 1,
    backgroundColor: HistoryColors.background,
  },

  surface: {
    backgroundColor: HistoryColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },

  card: {
    backgroundColor: HistoryColors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A3E',
    ...HistoryShadows.small,
  },

  // 文字样式
  title: {
    color: HistoryColors.text,
    fontSize: 20,
    fontWeight: '600',
  },

  subtitle: {
    color: HistoryColors.text,
    fontSize: 16,
    fontWeight: '500',
  },

  body: {
    color: HistoryColors.text,
    fontSize: 14,
    lineHeight: 20,
  },

  caption: {
    color: HistoryColors.textSecondary,
    fontSize: 12,
  },

  // 按钮样式
  primaryButton: {
    backgroundColor: HistoryColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    ...HistoryShadows.medium,
  },

  primaryButtonText: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '600',
  },

  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: HistoryColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: HistoryColors.primary,
    fontSize: 16,
    fontWeight: '600',
  },

  // 标签样式
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },

  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // 玻璃效果
  glassCard: {
    backgroundColor: HistoryColors.glassBg,
    borderWidth: 1,
    borderColor: HistoryColors.glassBorder,
    borderRadius: 16,
  },

  // 分隔线
  divider: {
    height: 1,
    backgroundColor: '#2A2A3E',
    marginVertical: 16,
  },

  // 居中内容
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 加载状态
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },

  loadingText: {
    color: HistoryColors.text,
    marginLeft: 8,
    fontSize: 14,
  },

  // 错误状态
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },

  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },

  errorText: {
    color: HistoryColors.error,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },

  // 空状态
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },

  emptyTitle: {
    color: HistoryColors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyDescription: {
    color: HistoryColors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

// 历史列表特定样式
export const HistoryListStyles = StyleSheet.create({
  listContainer: {
    flex: 1,
  },

  listContent: {
    paddingBottom: 20,
  },

  listItem: {
    marginHorizontal: 16,
    marginVertical: 8,
  },

  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  itemTime: {
    color: HistoryColors.text,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },

  itemMode: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  itemPreview: {
    marginBottom: 12,
  },

  itemPreviewText: {
    color: HistoryColors.text,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },

  itemTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  itemTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HistoryColors.glassBg,
    borderColor: HistoryColors.glassBorder,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
});

// 历史详情特定样式
export const HistoryDetailStyles = StyleSheet.create({
  headerContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3E',
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: HistoryColors.glassBg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  backButtonText: {
    color: HistoryColors.primary,
    fontSize: 24,
    fontWeight: '300',
  },

  headerTitle: {
    color: HistoryColors.text,
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },

  actionButtons: {
    flexDirection: 'row',
  },

  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: HistoryColors.glassBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  metaInfo: {
    alignItems: 'center',
  },

  dateTime: {
    color: HistoryColors.text,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },

  sectionContainer: {
    padding: 20,
  },

  sectionTitle: {
    color: HistoryColors.primary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },

  overallContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },

  cardContainer: {
    backgroundColor: HistoryColors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  dimensionContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },

  dimensionName: {
    color: HistoryColors.primary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
});

// 筛选器特定样式
export const HistoryFilterStyles = StyleSheet.create({
  filterContainer: {
    backgroundColor: HistoryColors.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3E',
  },

  filterBar: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },

  filterButton: {
    backgroundColor: HistoryColors.glassBg,
    borderWidth: 1,
    borderColor: HistoryColors.glassBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },

  filterButtonText: {
    color: HistoryColors.text,
    fontSize: 14,
    fontWeight: '500',
  },

  clearButton: {
    backgroundColor: 'rgba(139, 0, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  clearButtonText: {
    color: HistoryColors.error,
    fontSize: 12,
    fontWeight: '500',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: HistoryColors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },

  selectorContainer: {
    backgroundColor: HistoryColors.surface,
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxHeight: '70%',
    minWidth: 280,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },

  selectorTitle: {
    color: HistoryColors.text,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },

  optionsList: {
    maxHeight: 300,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },

  optionIcon: {
    fontSize: 20,
    marginRight: 12,
  },

  optionText: {
    color: HistoryColors.text,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },

  cancelButton: {
    backgroundColor: 'rgba(139, 136, 120, 0.2)',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },

  cancelButtonText: {
    color: HistoryColors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});