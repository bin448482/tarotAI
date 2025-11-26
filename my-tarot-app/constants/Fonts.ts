import { Platform } from 'react-native';

// 字体权重映射
export const FontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// 跨平台字体配置
export const FontFamilies = {
  serif: Platform.select({
    ios: 'NotoSerifSC-Regular',
    android: 'NotoSerifSC-Regular',
    web: '"Noto Serif SC", "Source Serif Pro", serif',
    default: 'serif',
  }),
  serifBold: Platform.select({
    ios: 'NotoSerifSC-Bold',
    android: 'NotoSerifSC-Bold',
    web: '"Noto Serif SC", "Source Serif Pro", serif',
    default: 'serif',
  }),
  system: Platform.select({
    ios: 'System',
    android: 'Roboto',
    web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'System',
  }),
} as const;

// 字体样式配置
export const FontStyles = {
  // 主标题样式
  heroTitle: {
    fontFamily: FontFamilies.serifBold,
    fontSize: 36,
    fontWeight: FontWeights.bold as any,
    letterSpacing: 2,
    lineHeight: 44,
  },

  // 副标题样式
  heroSubtitle: {
    fontFamily: FontFamilies.serif,
    fontSize: 18,
    fontWeight: FontWeights.regular as any,
    letterSpacing: 1,
    lineHeight: 26,
  },

  // 正文样式
  body: {
    fontFamily: FontFamilies.system,
    fontSize: 16,
    fontWeight: FontWeights.regular as any,
    letterSpacing: 0.5,
    lineHeight: 24,
  },

  // 小标题样式
  subtitle: {
    fontFamily: FontFamilies.serif,
    fontSize: 14,
    fontWeight: FontWeights.medium as any,
    letterSpacing: 0.5,
    lineHeight: 20,
  },
} as const;

// 获取字体样式的辅助函数
export const getTextStyle = (variant: keyof typeof FontStyles) => {
  return FontStyles[variant];
};

// 响应式字体大小
export const getResponsiveFontSize = (baseFontSize: number) => {
  return Platform.select({
    ios: baseFontSize,
    android: baseFontSize - 1,
    web: baseFontSize + 2,
    default: baseFontSize,
  });
};

// 字体颜色配置
export const FontColors = {
  primary: '#ffd790', // 柔和金色
  secondary: '#e0d0f0', // 柔和紫色
  muted: '#b19cd9', // 淡紫色
  accent: '#ffd700', // 强调金色
  text: '#ffffff', // 白色
} as const;