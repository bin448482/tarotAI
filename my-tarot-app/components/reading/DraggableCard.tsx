import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { CardFlipAnimation } from './CardFlipAnimation';
import { DraggableCardView } from './DraggableCardView';

interface DraggableCardProps {
  card: {
    id: number;
    name: string;
    displayName?: string;
    imageUrl: string;
    direction: 'upright' | 'reversed';
    revealed: boolean;
  };
  isDraggable: boolean;
  onDragStart?: (cardId: number) => void;
  onDragActive?: (cardId: number, x: number, y: number) => void;
  onDragEnd?: (cardId: number, x: number, y: number) => void;
  onPress?: () => void;
  slotIndex?: number;
  isInSlot?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = Math.min(screenWidth * 0.25, 120);
const CARD_HEIGHT = CARD_WIDTH * 1.7;

export function DraggableCard({
  card,
  isDraggable,
  onDragStart,
  onDragActive,
  onDragEnd,
  onPress,
  slotIndex,
  isInSlot = false,
}: DraggableCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const zIndex = useSharedValue(1);

  const gestureRef = useRef(null);

  const gesture = Gesture.Pan()
    .enabled(isDraggable && !isInSlot)
    .onStart(() => {
      if (!isDraggable || isInSlot) return;

      // 开始拖拽
      scale.value = withSpring(1.1);
      opacity.value = withTiming(0.9);
      zIndex.value = 1000;

      if (onDragStart) {
        runOnJS(onDragStart)(card.id);
      }
    })
    .onUpdate((event) => {
      if (!isDraggable || isInSlot) return;

      translateX.value = event.translationX;
      translateY.value = event.translationY;

      // 实时检测拖拽位置
      if (onDragActive) {
        runOnJS(onDragActive)(card.id, event.absoluteX, event.absoluteY);
      }
    })
    .onEnd((event) => {
      if (!isDraggable || isInSlot) return;

      // 结束拖拽，传递最终位置
      if (onDragEnd) {
        runOnJS(onDragEnd)(
          card.id,
          event.absoluteX,
          event.absoluteY
        );
      }

      // 重置动画
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      opacity.value = withTiming(1);
      zIndex.value = 1;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
    zIndex: zIndex.value,
  }));

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <View style={[
          styles.cardWrapper,
          { width: CARD_WIDTH, height: CARD_HEIGHT }
        ]}>
          {isDraggable ? (
            // 拖拽模式：使用纯视图版本，避免TouchableOpacity干扰
            <DraggableCardView
              card={card}
              showName={true}
              isInSlot={isInSlot}
            />
          ) : (
            // 非拖拽模式：使用正常的CardFlipAnimation
            <CardFlipAnimation
              card={card}
              onPress={handlePress}
              showName={true}
              disabled={false}
            />
          )}
          {isDraggable && !isInSlot && (
            <View style={styles.dragIndicator}>
              <View style={styles.dragDots}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            </View>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.8)',
    borderRadius: 8,
    padding: 2,
  },
  dragDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#0F0F1A',
    marginHorizontal: 1,
  },
});
