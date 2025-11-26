import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../tamagui.config';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProvider, useAppContext } from '@/lib/contexts/AppContext';
import { initializeApiConfig } from '@/lib/config/api';
import { setupLogging, logger } from '@/lib/utils/logger';

setupLogging();

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const { actions } = useAppContext();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.info('App initialization started');
        await initializeApiConfig();
        await actions.initializeApp();
        logger.info('App initialization completed');
      } catch (error) {
        logger.error('App initialization error', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={tamaguiConfig}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(reading)" />
            <Stack.Screen name="(history)" />
            <Stack.Screen name="cards" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootLayoutContent />
    </AppProvider>
  );
}
