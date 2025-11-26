import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const symbols = ['✦', '◈', '※', '☆', '◇', '✧'];

const SymbolItem: React.FC<{ symbol: string; delay: number; size: number; position: { top: number; left: number } }> = ({
  symbol,
  delay,
  size,
  position,
}) => {
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0.3);
  const scale = useSharedValue(0.8);

  React.useEffect(() => {
    rotation.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, { duration: 20000, easing: Easing.linear }),
        -1,
        false
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0.8, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );

    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1.2, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text
      style={[
        styles.symbol,
        {
          fontSize: size,
          position: 'absolute',
          top: position.top,
          left: position.left,
        },
        animatedStyle,
      ]}
    >
      {symbol}
    </Animated.Text>
  );
};

export const DecorativeSymbols: React.FC = () => {
  const symbolConfigs = [
    { symbol: '✦', delay: 0, size: 20, position: { top: 20, left: 30 } },
    { symbol: '◈', delay: 500, size: 16, position: { top: 60, left: '80%' } },
    { symbol: '※', delay: 1000, size: 18, position: { top: 100, left: 50 } },
    { symbol: '☆', delay: 1500, size: 22, position: { top: 140, left: '75%' } },
    { symbol: '◇', delay: 2000, size: 14, position: { top: 180, left: 40 } },
    { symbol: '✧', delay: 2500, size: 20, position: { top: 220, left: '70%' } },
  ];

  return (
    <View style={styles.container}>
      {symbolConfigs.map((config, index) => (
        <SymbolItem
          key={index}
          symbol={config.symbol}
          delay={config.delay}
          size={config.size}
          position={config.position}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  symbol: {
    color: '#ffd700',
    opacity: 0.3,
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});