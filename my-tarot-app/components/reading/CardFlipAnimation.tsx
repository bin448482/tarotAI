import React, { useState, useEffect, useRef } from 'react';
import { Image } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getCardImage } from '@/lib/utils/cardImages';
import { useTranslation } from 'react-i18next';

interface CardFlipAnimationProps {
  card: {
    id: number;
    name: string;
    displayName?: string;
    imageUrl: string;
    direction: 'upright' | 'reversed';
    revealed: boolean;
  };
  onPress?: () => void;
  disabled?: boolean;
  showName?: boolean;
  isInSlot?: boolean;
  canTriggerStars?: boolean; // 新增：外部控制是否可以触发特效
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = Math.min(screenWidth * 0.25, 120);
const CARD_HEIGHT = CARD_WIDTH * 1.7;

export function CardFlipAnimation({
  card,
  onPress,
  disabled = false,
  showName = false,
  isInSlot = false,
  canTriggerStars = false, // 新增：从外部接收状态
}: CardFlipAnimationProps) {
  const [animatedValue] = useState(new Animated.Value(0));
  const [isFlipped, setIsFlipped] = useState(false);
  const { t } = useTranslation('reading');
  
  // 星星特效动画
  const starsOpacity = useRef(new Animated.Value(0)).current;
  // 为每颗星星创建独立的闪烁动画
  const starAnimations = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(0))
  ).current;
  
  // 为每颗星星创建位置动画
  const starPositionAnimations = useRef(
    Array.from({ length: 6 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
    }))
  ).current;

  // 闪电特效动画
  const lightningOpacity = useRef(new Animated.Value(0)).current;
  
  // 星星位置状态，会动态更新
  const [starPositions, setStarPositions] = useState(() =>
    generateRandomPositions()
  );
  
  // 特效触发状态
  const [shouldShowStars, setShouldShowStars] = useState(false);
  const [hasCheckedTrigger, setHasCheckedTrigger] = useState(false);

  // 生成随机位置的函数
  function generateRandomPositions() {
    const positions: { x: number; y: number }[] = [];
    const minDistance = 25; // 稍微减少最小距离，给更多空间
    const maxAttempts = 30; // 减少尝试次数，提高性能
    
    for (let i = 0; i < 6; i++) {
      let attempts = 0;
      let newPosition: { x: number; y: number };
      
      do {
        newPosition = {
          x: Math.random() * (CARD_WIDTH - 30) + 15,
          y: Math.random() * (CARD_HEIGHT - 30) + 15,
        };
        attempts++;
      } while (
        attempts < maxAttempts &&
        positions.some(pos => {
          const distance = Math.sqrt(
            Math.pow(pos.x - newPosition.x, 2) + Math.pow(pos.y - newPosition.y, 2)
          );
          return distance < minDistance;
        })
      );
      
      positions.push(newPosition);
    }
    
    return positions;
  }

  // 根据card.revealed状态自动翻转
  useEffect(() => {
    if (card.revealed && !isFlipped) {
      // 自动翻转到正面
      Animated.spring(animatedValue, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start(() => {
        setIsFlipped(true);
      });
    }
  }, [card.revealed, isFlipped, animatedValue]);

  // 当卡牌放入卡槽时检查是否触发星星特效
  useEffect(() => {
    if (isInSlot && canTriggerStars && !hasCheckedTrigger) {
      setHasCheckedTrigger(true);
      
      // 1/4的几率触发特效
      const shouldTrigger = Math.random() < 0.25; // 20% = 1/5
      if (shouldTrigger) {
        setShouldShowStars(true);
        startStarsEffect();
      }
    }
  }, [isInSlot, canTriggerStars, hasCheckedTrigger]);

  // 闪电特效函数
  const startLightningEffect = () => {
    // 闪电特效：快速闪烁3次
    const lightningFlash = () => {
      Animated.sequence([
        // 第一次闪光
        Animated.timing(lightningOpacity, {
          toValue: 0.8,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(lightningOpacity, {
          toValue: 0,
          duration: 60,
          useNativeDriver: true,
        }),
        // 短暂暂停
        Animated.delay(40),
        // 第二次闪光（更强烈）
        Animated.timing(lightningOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(lightningOpacity, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
        // 短暂暂停
        Animated.delay(30),
        // 第三次闪光（最微弱）
        Animated.timing(lightningOpacity, {
          toValue: 0.6,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(lightningOpacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    };

    lightningFlash();
  };

  // 星星特效函数
  const startStarsEffect = () => {
    // 先触发闪电特效
    startLightningEffect();

    // 初始化星星位置动画
    starPositions.forEach((pos, index) => {
      starPositionAnimations[index].x.setValue(pos.x);
      starPositionAnimations[index].y.setValue(pos.y);
    });

    // 星星淡入
    Animated.timing(starsOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // 为每颗星星创建随机闪烁动画，每次闪烁后换位置
    starAnimations.forEach((animation, index) => {
      const startRandomTwinkle = () => {
        // 每颗星星不同的随机延迟开始时间 (0-3秒)
        const randomDelay = Math.random() * 3000 + index * 500; // 加上索引偏移，确保不同步
        // 每颗星星不同的随机闪烁持续时间 (150-500毫秒)
        const randomDuration = 150 + Math.random() * 350 + index * 50; // 加上索引偏移
        
        setTimeout(() => {
          const twinkleSequence = () => {
            Animated.sequence([
              // 闪烁亮起
              Animated.timing(animation, {
                toValue: 1,
                duration: randomDuration,
                useNativeDriver: true,
              }),
              // 闪烁熄灭
              Animated.timing(animation, {
                toValue: 0,
                duration: randomDuration,
                useNativeDriver: true,
              }),
            ]).start(() => {
              // 闪烁完成后，为当前星星生成新的随机位置
              const newPos = {
                x: Math.random() * (CARD_WIDTH - 30) + 15,
                y: Math.random() * (CARD_HEIGHT - 30) + 15,
              };
              
              // 瞬间跳跃到新位置（恢复跳跃效果）
              starPositionAnimations[index].x.setValue(newPos.x);
              starPositionAnimations[index].y.setValue(newPos.y);
              
              // 每颗星星独立的随机暂停时间后继续下一次闪烁
              setTimeout(() => {
                twinkleSequence();
              }, 800 + Math.random() * 2000); // 增加随机范围，让节奏更分散
            });
          };
          
          twinkleSequence();
        }, randomDelay);
      };
      
      startRandomTwinkle();
    });
  };

  // 点击处理 - 只在已翻开时触发onPress
  const handlePress = () => {
    if (disabled) return;
    
    // 如果卡牌已经翻开，直接调用onPress显示牌意
    if (card.revealed && onPress) {
      onPress();
    }
  };

  // 正面旋转
  const frontAnimatedStyle = {
    transform: [
      {
        rotateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg'],
        }),
      },
    ],
  };

  // 背面旋转
  const backAnimatedStyle = {
    transform: [
      {
        rotateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['180deg', '360deg'],
        }),
      },
    ],
  };

  // 逆位旋转
  const cardRotation = card.direction === 'reversed' ? '180deg' : '0deg';

  // 获取卡牌图片资源
  const cardImageSource = getCardImage(card.imageUrl);

  // 星星容器样式
  const starsContainerStyle = {
    opacity: starsOpacity,
  };

  // 获取单个星星的闪烁样式
  const getStarTwinkleStyle = (index: number) => ({
    opacity: starAnimations[index]?.interpolate({
      inputRange: [0, 1],
      outputRange: [0.2, 1],
    }) || 0.2,
    transform: [
      {
        scale: starAnimations[index]?.interpolate({
          inputRange: [0, 1],
          outputRange: [0.6, 1.4],
        }) || 0.6,
      },
    ],
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.9}
    >
      <View style={[styles.cardContainer, { width: CARD_WIDTH, height: CARD_HEIGHT }]} >
        {/* 闪电特效层 - 全屏白色闪光 */}
        <Animated.View
          style={[
            styles.lightningOverlay,
            {
              opacity: lightningOpacity,
            }
          ]}
          pointerEvents="none"
        />

        {/* 星星特效层 - 只在满足条件时显示 */}
        {card.revealed && shouldShowStars && (
          <Animated.View style={[styles.starsContainer, starsContainerStyle]}>
            {/* 创建6颗星星随机分布在卡牌内 */}
            {starPositions.map((position, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.star,
                  getStarTwinkleStyle(index),
                  {
                    position: 'absolute',
                    transform: [
                      { translateX: starPositionAnimations[index].x },
                      { translateY: starPositionAnimations[index].y },
                    ],
                  },
                ]}
              >
                <Text style={styles.starText}>★</Text>
              </Animated.View>
            ))}
          </Animated.View>
        )}
        {/* 卡背 */}
        <Animated.View
          style={[
            styles.card,
            isInSlot ? styles.cardBackInSlot : styles.cardBack,
            frontAnimatedStyle,
            { backfaceVisibility: 'hidden' },
          ]}
        >
          <LinearGradient
            colors={['#1A1A2E', '#16213E']}
            style={styles.cardBackGradient}
          >
            <View style={styles.cardBackContent}>
              <Text style={styles.cardBackText}>TAROT</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* 卡牌正面 */}
        <Animated.View
          style={[
            styles.card,
            isInSlot ? styles.cardFrontInSlot : styles.cardFront,
            backAnimatedStyle,
            { transform: [...backAnimatedStyle.transform, { rotate: cardRotation }] },
            { backfaceVisibility: 'hidden' },
          ]}
        >
          <LinearGradient
            colors={['#16213E', '#0F0F1A']}
            style={styles.cardFrontGradient}
          >
            <View style={styles.cardImageContainer}>
              <Image
                source={cardImageSource}
                style={styles.cardImage}
                resizeMode="cover"
              />
            </View>
            {showName && (
              <Text style={styles.cardTitle} numberOfLines={2}>
                {card.displayName ?? card.name}
              </Text>
            )}
          </LinearGradient>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 8,
  },
  cardContainer: {
    position: 'relative',
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  cardBack: {
    backgroundColor: '#1A1A2E',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  cardBackInSlot: {
    backgroundColor: '#1A1A2E',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  cardBackGradient: {
    flex: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBackContent: {
    borderWidth: 1,
    borderColor: '#FFD700',
    padding: 20,
    borderRadius: 8,
  },
  cardBackText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 2,
  },
  cardFront: {
    backgroundColor: '#16213E',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  cardFrontInSlot: {
    backgroundColor: '#16213E',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  cardFrontGradient: {
    flex: 1,
    borderRadius: 12,
    padding: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
  },
  cardImage: {
    width: CARD_WIDTH - 16,
    height: CARD_HEIGHT - 40,
    borderRadius: 8,
  },
  cardName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 4,
  },
  // 星星特效样式
  starsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    zIndex: 5, // 确保星星在卡牌上方但不会遮挡交互
  },
  star: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starText: {
    fontSize: 12,
    color: '#87CEEB', // 淡蓝色 (SkyBlue)
    textShadowColor: '#E0F6FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
    fontWeight: 'bold',
  },
  // 闪电特效样式
  lightningOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    zIndex: 10, // 确保闪电在最上层
  },
});
