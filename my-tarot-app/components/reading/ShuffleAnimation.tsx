import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';

interface ShuffleAnimationProps {
  isShuffling: boolean;
  children: React.ReactNode;
}

export function ShuffleAnimation({ isShuffling, children }: ShuffleAnimationProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isShuffling) {
      // 开始洗牌动画
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 200,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 200,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 10 } // 洗牌动画持续2秒
      ).start();
    } else {
      // 停止动画并重置
      animatedValue.stopAnimation();
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isShuffling, animatedValue]);

  const shuffleStyle = {
    transform: [
      {
        translateX: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 5],
        }),
      },
      {
        rotate: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '2deg'],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.container, shuffleStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});