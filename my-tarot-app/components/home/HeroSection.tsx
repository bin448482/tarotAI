import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FontStyles, FontColors } from '@/constants/Fonts';
import { useCustomFonts } from '@/hooks/useCustomFonts';
import { useTranslation } from '@/lib/hooks/useTranslation';

export const HeroSection: React.FC = () => {
  const { fontsLoaded } = useCustomFonts();
  const { t, i18n } = useTranslation('home');
  const resolvedLocale = i18n.resolvedLanguage ?? i18n.language;
  const isEnglish = resolvedLocale?.toLowerCase().startsWith('en');
  const shimmerOpacity = useSharedValue(0.3);

  // 确保 useAnimatedStyle 总是被调用，不管字体是否加载
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  React.useEffect(() => {
    shimmerOpacity.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  // 始终使用动画组件，避免切换导致的闪烁
  return (
    <View style={[styles.container, isEnglish && styles.containerEn]}>
      <LinearGradient
        colors={['#0a0a1a', '#1a1a2e', '#16213e']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View
        entering={FadeInUp.delay(200).duration(800)}
        style={[styles.titleContainer, isEnglish && styles.titleContainerEn]}
      >
        <Text
          style={[
            styles.mainTitle,
            isEnglish && styles.mainTitleEn,
            !fontsLoaded && styles.fallbackFont,
          ]}
          numberOfLines={isEnglish ? 1 : 2}
          adjustsFontSizeToFit
          minimumFontScale={isEnglish ? 0.7 : 0.85}
        >
          {t('hero.title')}
        </Text>
        {fontsLoaded && <Animated.View style={[styles.shimmer, shimmerStyle]} />}
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(400).duration(600)}
        style={[styles.subtitleContainer, isEnglish && styles.subtitleContainerEn]}
      >
        <Text
          style={[
            styles.subtitle,
            isEnglish && styles.subtitleEn,
            !fontsLoaded && styles.fallbackFont,
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.9}
        >
          {t('hero.subtitle')}
        </Text>
        <Text
          style={[
            styles.description,
            isEnglish && styles.descriptionEn,
            !fontsLoaded && styles.fallbackFont,
          ]}
        >
          {t('hero.tagline')}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  containerEn: {
    height: 220,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  titleContainer: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
    width: '90%',
    maxWidth: 360,
  },
  titleContainerEn: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: 12,
  },
  mainTitle: {
    ...FontStyles.heroTitle,
    color: FontColors.primary,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 215, 144, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  mainTitleEn: {
    fontSize: 32,
    letterSpacing: 0.35,
    lineHeight: 38,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: -20,
    right: -20,
    bottom: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 20,
  },
  subtitleContainer: {
    alignItems: 'center',
  },
  subtitleContainerEn: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
  },
  subtitle: {
    ...FontStyles.heroSubtitle,
    color: FontColors.secondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitleEn: {
    fontSize: 15,
    letterSpacing: 0.4,
    lineHeight: 22,
  },
  description: {
    ...FontStyles.subtitle,
    color: FontColors.muted,
    textAlign: 'center',
  },
  descriptionEn: {
    fontSize: 12.5,
    letterSpacing: 0.2,
    lineHeight: 18,
    alignSelf: 'stretch',
    paddingHorizontal: 16,
  },
  fallbackFont: {
    fontFamily: 'System',
  },
});
