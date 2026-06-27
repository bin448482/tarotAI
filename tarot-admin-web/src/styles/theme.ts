import { ThemeConfig } from 'antd';

// 塔罗牌神秘风格主题配置
export const tarotTheme: ThemeConfig = {
  token: {
    // 主色调 - 深紫色（神秘感）
    colorPrimary: '#6B46C1',
    colorPrimaryHover: '#7C3AED',
    colorPrimaryActive: '#5B21B6',

    // 背景色
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F8FAFC',
    colorBgElevated: '#FFFFFF',

    // 边框色
    colorBorder: '#E5E7EB',
    colorBorderSecondary: '#F3F4F6',

    // 文字色
    colorText: '#1F2937',
    colorTextSecondary: '#6B7280',
    colorTextTertiary: '#9CA3AF',

    // 成功/错误/警告色
    colorSuccess: '#10B981',
    colorWarning: '#F59E0B',
    colorError: '#EF4444',
    colorInfo: '#3B82F6',

    // 字体
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 14,

    // 圆角
    borderRadius: 8,

    // 阴影
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  components: {
    Layout: {
      headerBg: '#FFFFFF',
      siderBg: '#1E293B',
      bodyBg: '#F8FAFC',
    },
    Menu: {
      darkItemBg: '#1E293B',
      darkSubMenuItemBg: '#334155',
      darkItemSelectedBg: '#6B46C1',
      darkItemHoverBg: '#334155',
    },
    Table: {
      headerBg: '#F8FAFC',
      rowHoverBg: '#F1F5F9',
    },
    Card: {
      headerBg: '#FFFFFF',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    },
    Button: {
      primaryShadow: '0 2px 4px rgba(107, 70, 193, 0.2)',
    },
  },
};

// 暗色主题（可选）
export const darkTarotTheme: ThemeConfig = {
  ...tarotTheme,
  algorithm: [],
  token: {
    ...tarotTheme.token,
    colorBgContainer: '#1E293B',
    colorBgLayout: '#0F172A',
    colorBgElevated: '#1E293B',
    colorText: '#F1F5F9',
    colorTextSecondary: '#CBD5E1',
    colorBorder: '#334155',
  },
};