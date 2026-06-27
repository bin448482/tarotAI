import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientBackgroundProps {
  children?: React.ReactNode;
  animated?: boolean;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  animated = true,
}) => {
  const animationProgress = useSharedValue(0);

  React.useEffect(() => {
    if (animated) {
      animationProgress.value = withRepeat(
        withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [animated]);

  const animatedStyle = useAnimatedStyle(() => {
    if (!animated) return {};

    return {
      transform: [
        {
          scale: 1 + animationProgress.value * 0.1,
        },
      ],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.gradientContainer, animatedStyle]}>
        <LinearGradient
          colors={[
            '#0a0a1a',
            '#1a1a2e',
            '#16213e',
            '#2c1810',
            '#1a1a2e',
          ]}
          locations={[0, 0.25, 0.5, 0.75, 1]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
      {children && <View style={styles.content}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  gradientContainer: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});