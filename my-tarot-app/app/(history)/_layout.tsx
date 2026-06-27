import { Stack } from 'expo-router';
import React from 'react';

export default function HistoryLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: '占卜历史',
          headerShown: false, // 隐藏Stack的header，避免重复
        }}
      />
    </Stack>
  );
}