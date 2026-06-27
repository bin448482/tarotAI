import React from 'react';
import { Stack } from 'expo-router';
import { ReadingProvider } from '@/lib/contexts/ReadingContext';
import { ReadingProgressBar } from '@/components/reading/ReadingProgressBar';
import { View, StyleSheet } from 'react-native';

export default function ReadingLayout() {
  return (
    <ReadingProvider>
      <View style={styles.container}>
        <ReadingProgressBar />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: styles.content,
          }}
        >
          <Stack.Screen name="type" options={{ title: '选择占卜类型' }} />
          <Stack.Screen name="category" options={{ title: '选择占卜类别' }} />
          <Stack.Screen name="ai-input" options={{ title: 'AI问题输入' }} />
          <Stack.Screen name="draw" options={{ title: '抽取塔罗牌' }} />
          <Stack.Screen name="basic" options={{ title: '基础解读' }} />
          <Stack.Screen name="ai-result" options={{ title: 'AI解读结果' }} />
        </Stack>
      </View>
    </ReadingProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  content: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
});