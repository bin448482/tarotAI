import { Tabs } from 'expo-router';
import React from 'react';
import Constants from 'expo-constants';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// 获取标签页配置
const getTabsConfig = () => {
  const fullConfig = Constants.expoConfig?.extra?.tabsConfig || {};
  
  // 默认配置，如果没有找到配置文件
  const defaultConfig = {
    tabBarEnabled: true,
    tabs: {
      home: {
        enabled: true,
        title: 'Home',
        icon: 'house.fill'
      },
      explore: {
        enabled: true,
        title: 'Explore',
        icon: 'paperplane.fill'
      }
    }
  };
  
  // 合并默认配置和用户配置
  return {
    tabBarEnabled: fullConfig.tabBarEnabled ?? defaultConfig.tabBarEnabled,
    tabs: fullConfig.tabs || defaultConfig.tabs
  };
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const tabsConfig = getTabsConfig();

  // 如果配置中禁用了标签栏，则不渲染任何标签
  if (tabsConfig.tabBarEnabled === false) {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}>
        {/* 仍然保留所有标签页，但不显示 */}
        <Tabs.Screen name="index" options={{ headerShown: false }} />
        <Tabs.Screen name="explore" options={{ headerShown: false }} />
      </Tabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      {/* Home 标签页 */}
      {tabsConfig.tabs.home?.enabled && (
        <Tabs.Screen
          name="index"
          options={{
            title: tabsConfig.tabs.home.title,
            tabBarIcon: ({ color }) => <IconSymbol size={28} name={tabsConfig.tabs.home.icon} color={color} />,
          }}
        />
      )}
      
      
      {/* Explore 标签页 */}
      {tabsConfig.tabs.explore?.enabled && (
        <Tabs.Screen
          name="explore"
          options={{
            title: tabsConfig.tabs.explore.title,
            tabBarIcon: ({ color }) => <IconSymbol size={28} name={tabsConfig.tabs.explore.icon} color={color} />,
          }}
        />
      )}
    </Tabs>
  );
}
