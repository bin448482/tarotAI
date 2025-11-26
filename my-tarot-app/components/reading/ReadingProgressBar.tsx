import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useReadingFlow } from '@/lib/contexts/ReadingContext';

interface ReadingProgressBarProps {
  height?: number;
}

export function ReadingProgressBar({ height = 4 }: ReadingProgressBarProps) {
  const { state } = useReadingFlow();

  const totalSteps = 4;
  const progress = (state.step / totalSteps) * 100;

  return (
    <View style={[styles.container, { height: height + 8 }]} pointerEvents="none">
      <View style={styles.background} />
      <View
        style={[
          styles.progress,
          { width: `${progress}%` }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    overflow: 'hidden',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  progress: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
});