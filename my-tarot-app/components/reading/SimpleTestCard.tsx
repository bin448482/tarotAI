import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

interface SimpleTestCardProps {
  onDrag?: (id: number, x: number, y: number) => void;
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = 80;
const CARD_HEIGHT = 120;

export function SimpleTestCard({ onDrag }: SimpleTestCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const { t } = useTranslation('reading');

  const gesture = Gesture.Pan()
    .onStart(() => {
      console.log('Pan started');
      scale.value = withSpring(1.1);
    })
    .onUpdate((event) => {
      console.log('Pan update:', event.translationX, event.translationY);
      translateX.value = event.translationX;
      translateY.value = event.translationY;

      if (onDrag) {
        runOnJS(onDrag)(1, event.absoluteX, event.absoluteY);
      }
    })
    .onEnd(() => {
      console.log('Pan ended');
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <Text style={styles.cardText}>{t('shared.components.simpleTestCard.label')}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
  },
  cardText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
