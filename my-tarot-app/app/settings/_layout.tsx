import { Stack } from 'expo-router';
import React from 'react';

export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: '系统说明',
          headerShown: false, // 使用自定义标题栏
        }}
      />
    </Stack>
  );
}