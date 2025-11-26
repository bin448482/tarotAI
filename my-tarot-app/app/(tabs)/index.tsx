import React from 'react';
import { StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/common/GradientBackground';
import { HeroSection } from '@/components/home/HeroSection';
import { DeclarationCard } from '@/components/home/DeclarationCard';
import { NavigationGrid } from '@/components/home/NavigationGrid';
import { DecorativeSymbols } from '@/components/home/DecorativeSymbols';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" translucent />
      <GradientBackground animated>
        <DecorativeSymbols />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <HeroSection />
          <DeclarationCard />
          <NavigationGrid />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
});
