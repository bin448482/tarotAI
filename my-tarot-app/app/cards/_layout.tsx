import { Stack } from 'expo-router';
import React from 'react';

export default function CardsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: '卡牌说明',
          headerShown: false, // 隐藏Stack的header，避免重复
        }}
      />
    </Stack>
  );
}