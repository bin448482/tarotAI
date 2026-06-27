import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  FlatList,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate
} from 'react-native-reanimated';

import { CardInfoService } from '@/lib/services/card-info';
import type { CardSummary, CardDetail, TarotHistory, CardFilters, CardSide } from '@/lib/types/cards';
import { Colors } from '@/constants/theme';
import { useAppContext } from '@/lib/contexts/AppContext';
import { useTranslation } from '@/lib/hooks/useTranslation';

const { width: screenWidth } = Dimensions.get('window');

const SUIT_KEY_MAP = {
  wands: 'filters.suit.wands',
  cups: 'filters.suit.cups',
  swords: 'filters.suit.swords',
  pentacles: 'filters.suit.pentacles',
  权杖: 'filters.suit.wands',
  圣杯: 'filters.suit.cups',
  宝剑: 'filters.suit.swords',
  星币: 'filters.suit.pentacles',
  钱币: 'filters.suit.pentacles',
} as const;

interface FilterButtonProps {
  title: string;
  active: boolean;
  onPress: () => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({ title, active, onPress }) => (
  <TouchableOpacity
    style={[styles.filterButton, active && styles.filterButtonActive]}
    onPress={onPress}
  >
    <Text style={[styles.filterButtonText, active && styles.filterButtonTextActive]}>
      {title}
    </Text>
  </TouchableOpacity>
);

interface TarotHistoryPanelProps {
  history: TarotHistory;
  expanded: boolean;
  onToggle: () => void;
}

const TarotHistoryPanel: React.FC<TarotHistoryPanelProps> = ({ history, expanded, onToggle }) => {
  const { t } = useTranslation('cards');

  return (
    <View style={styles.historyPanel}>
      <TouchableOpacity style={styles.historyHeader} onPress={onToggle}>
        <Text style={styles.historyTitle}>{t('history.title')}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={Colors.light.tint}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.historyContent}>
          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>{t('history.sections.overview')}</Text>
            <Text style={styles.historySectionText}>{history.overview}</Text>
          </View>

          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>{t('history.sections.origins')}</Text>
            <Text style={styles.historySectionText}>{history.origins}</Text>
          </View>

          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>{t('history.sections.majorMinor')}</Text>
            <Text style={styles.historySectionText}>{history.major_minor}</Text>
          </View>

          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>{t('history.sections.usage')}</Text>
            <Text style={styles.historySectionText}>{history.usage_notes}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

interface CardItemProps {
  card: CardSummary;
  onPress: (cardId: number) => void;
}

const CardItem: React.FC<CardItemProps> = ({ card, onPress }) => {
  const { t } = useTranslation('cards');

  const arcanaLabel = card.arcana === 'major' ? t('arcana.major') : t('arcana.minor');
  const normalizedSuit = card.suit ? card.suit.toLowerCase() : undefined;
  const suitKey = card.suit
    ? SUIT_KEY_MAP[card.suit as keyof typeof SUIT_KEY_MAP] ??
      (normalizedSuit ? SUIT_KEY_MAP[normalizedSuit as keyof typeof SUIT_KEY_MAP] : undefined)
    : undefined;
  const suitLabel = suitKey ? t(suitKey) : card.suit;

  const metaParts = [arcanaLabel];
  if (suitLabel) {
    metaParts.push(suitLabel);
  }
  if (card.number !== undefined) {
    metaParts.push(String(card.number));
  }

  return (
    <TouchableOpacity
      style={styles.cardItem}
      onPress={() => onPress(card.id)}
      activeOpacity={0.7}
    >
      <View style={styles.cardImageContainer}>
        <Image
          source={card.image}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.cardOverlay}>
          <Text style={styles.cardName}>{card.name}</Text>
          <Text style={styles.cardInfo}>{metaParts.join(' • ')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface SideToggleProps {
  side: CardSide;
  onSideChange: (side: CardSide) => void;
}

const SideToggle: React.FC<SideToggleProps> = ({ side, onSideChange }) => {
  const { t } = useTranslation('cards');
  const animatedValue = useSharedValue(side === 'upright' ? 0 : 1);

  useEffect(() => {
    animatedValue.value = withTiming(side === 'upright' ? 0 : 1, { duration: 300 });
  }, [side, animatedValue]);

  const containerStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolate(
        animatedValue.value,
        [0, 1],
        [0x4b0082aa, 0x8b0000aa]
      ),
    };
  });

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: interpolate(
            animatedValue.value,
            [0, 1],
            [0, 80]
          )
        }
      ],
    };
  });

  return (
    <View style={styles.sideToggleContainer}>
      <Text style={styles.sideToggleLabel}>{t('sideToggle.label')}</Text>
      <Animated.View style={[styles.toggleContainer, containerStyle]}>
        <TouchableOpacity
          style={styles.toggleOption}
          onPress={() => onSideChange('upright')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.toggleText,
            side === 'upright' && styles.toggleTextActive
          ]}>
            {t('sideToggle.upright')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toggleOption}
          onPress={() => onSideChange('reversed')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.toggleText,
            side === 'reversed' && styles.toggleTextActive
          ]}>
            {t('sideToggle.reversed')}
          </Text>
        </TouchableOpacity>

        <Animated.View style={[styles.toggleIndicator, indicatorStyle]} />
      </Animated.View>
    </View>
  );
};

interface InterpretationContentProps {
  card: CardDetail;
  side: CardSide;
}

const InterpretationContent: React.FC<InterpretationContentProps> = ({ card, side }) => {
  const { t } = useTranslation('cards');
  const interpretation = card.interpretations[side];

  const title = side === 'upright' ? t('sideToggle.uprightTitle') : t('sideToggle.reversedTitle');
  const directionLabel = side === 'upright' ? t('sideToggle.upright') : t('sideToggle.reversed');

  return (
    <View style={styles.interpretationContainer}>
      <View style={styles.interpretationHeader}>
        <Text style={styles.interpretationTitle}>{title}</Text>
        <View style={[
          styles.directionBadge,
          side === 'upright' ? styles.uprightBadge : styles.reversedBadge
        ]}>
          <Text style={styles.directionBadgeText}>{directionLabel}</Text>
        </View>
      </View>

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryLabel}>{t('interpretation.summary')}</Text>
        <Text style={styles.summaryText}>{interpretation.summary}</Text>
      </View>

      <View style={styles.detailContainer}>
        <Text style={styles.detailLabel}>{t('interpretation.detail')}</Text>
        <Text style={styles.detailText}>{interpretation.detail}</Text>
      </View>
    </View>
  );
};

export default function CardsIndexScreen() {
  const { state: appState } = useAppContext();
  const { t } = useTranslation('cards');
  const [cards, setCards] = useState<CardSummary[]>([]);
  const [history, setHistory] = useState<TarotHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [filters, setFilters] = useState<CardFilters>({
    arcana: 'all',
    suit: 'all',
    search: ''
  });

  // 卡牌详情相关状态
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardDetail | null>(null);
  const [cardDetailLoading, setCardDetailLoading] = useState(false);
  const [cardSide, setCardSide] = useState<CardSide>('upright');

  const cardInfoService = CardInfoService.getInstance();

  const loadData = async (showRefreshIndicator = false) => {
    try {
      // 检查数据库是否已初始化
      if (!appState.isDatabaseInitialized) {
        console.log('[CardsIndexScreen] Waiting for database initialization...');
        setLoading(true);
        return;
      }

      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // 并行加载卡牌和历史数据
      const [cardsResponse, historyResponse] = await Promise.all([
        cardInfoService.listCards(filters),
        cardInfoService.getTarotHistory()
      ]);

      if (cardsResponse.success && cardsResponse.data) {
        setCards(cardsResponse.data);
      } else {
        Alert.alert(t('alerts.errorTitle'), cardsResponse.error || t('alerts.loadCardsFailed'));
      }

      if (historyResponse.success && historyResponse.data) {
        setHistory(historyResponse.data);
      } else {
        console.warn('Failed to load tarot history:', historyResponse.error);
      }

    } catch (error) {
      console.error('Error loading cards data:', error);
      Alert.alert(t('alerts.errorTitle'), t('alerts.loadDataFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleFilterChange = async (newFilters: Partial<CardFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);

    try {
      const cardsResponse = await cardInfoService.listCards(updatedFilters);
      if (cardsResponse.success && cardsResponse.data) {
        setCards(cardsResponse.data);
      }
    } catch (error) {
      console.error('Error filtering cards:', error);
    }
  };

  const handleCardPress = async (cardId: number) => {
    setSelectedCardId(cardId);
    setCardDetailLoading(true);

    try {
      const cardResponse = await cardInfoService.getCardDetail(cardId);
      if (cardResponse.success && cardResponse.data) {
        setSelectedCard(cardResponse.data);
        setCardSide('upright'); // 重置为正位
      } else {
        Alert.alert(t('alerts.errorTitle'), cardResponse.error || t('alerts.loadCardDetailFailed'));
        setSelectedCardId(null);
      }
    } catch (error) {
      console.error('Error loading card detail:', error);
      Alert.alert(t('alerts.errorTitle'), t('alerts.loadCardDetailError'));
      setSelectedCardId(null);
    } finally {
      setCardDetailLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedCardId(null);
    setSelectedCard(null);
  };

  const handleRefresh = () => {
    loadData(true);
  };

  useEffect(() => {
    // 当数据库初始化完成后加载数据
    if (appState.isDatabaseInitialized) {
      loadData();
    }
  }, [appState.isDatabaseInitialized]);

  const renderCard = ({ item }: { item: CardSummary }) => (
    <CardItem card={item} onPress={handleCardPress} />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* 塔罗历史面板 */}
      {history && (
        <TarotHistoryPanel
          history={history}
          expanded={historyExpanded}
          onToggle={() => setHistoryExpanded(!historyExpanded)}
        />
      )}

      {/* 筛选器 */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filtersTitle}>{t('filters.title')}</Text>

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>{t('filters.arcanaLabel')}</Text>
          <View style={styles.filterButtons}>
            <FilterButton
              title={t('filters.arcana.all')}
              active={filters.arcana === 'all'}
              onPress={() => handleFilterChange({ arcana: 'all' })}
            />
            <FilterButton
              title={t('filters.arcana.major')}
              active={filters.arcana === 'major'}
              onPress={() => handleFilterChange({ arcana: 'major' })}
            />
            <FilterButton
              title={t('filters.arcana.minor')}
              active={filters.arcana === 'minor'}
              onPress={() => handleFilterChange({ arcana: 'minor' })}
            />
          </View>
        </View>

        {filters.arcana === 'minor' && (
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>{t('filters.suitLabel')}</Text>
            <View style={styles.filterButtons}>
              <FilterButton
                title={t('filters.suit.all')}
                active={filters.suit === 'all'}
                onPress={() => handleFilterChange({ suit: 'all' })}
              />
              <FilterButton
                title={t('filters.suit.wands')}
                active={filters.suit === 'wands'}
                onPress={() => handleFilterChange({ suit: 'wands' })}
              />
              <FilterButton
                title={t('filters.suit.cups')}
                active={filters.suit === 'cups'}
                onPress={() => handleFilterChange({ suit: 'cups' })}
              />
              <FilterButton
                title={t('filters.suit.swords')}
                active={filters.suit === 'swords'}
                onPress={() => handleFilterChange({ suit: 'swords' })}
              />
              <FilterButton
                title={t('filters.suit.pentacles')}
                active={filters.suit === 'pentacles'}
                onPress={() => handleFilterChange({ suit: 'pentacles' })}
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.cardsHeader}>
        <Text style={styles.cardsTitle}>
          {t('list.title', { count: cards.length })}
        </Text>
      </View>
    </View>
  );

  if (loading || !appState.isDatabaseInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={styles.loadingText}>
            {appState.databaseError
              ? t('status.dbInitFailed')
              : appState.isInitializingDatabase
                ? t('status.dbInitializing')
                : t('status.loadingCards')}
          </Text>
          {appState.databaseError && (
            <Text style={styles.errorText}>{appState.databaseError}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // 显示卡牌详情
  if (selectedCardId && selectedCard) {
    const arcanaLabel = selectedCard.arcana === 'major' ? t('arcana.major') : t('arcana.minor');
    const normalizedSuit = selectedCard.suit ? selectedCard.suit.toLowerCase() : undefined;
    const suitKey = selectedCard.suit
      ? SUIT_KEY_MAP[selectedCard.suit as keyof typeof SUIT_KEY_MAP] ??
        (normalizedSuit ? SUIT_KEY_MAP[normalizedSuit as keyof typeof SUIT_KEY_MAP] : undefined)
      : undefined;
    const suitLabel = suitKey ? t(suitKey) : selectedCard.suit;
    const numberLabel = selectedCard.number !== undefined ? t('detail.number', { number: selectedCard.number }) : null;
    const metaText = [arcanaLabel, suitLabel, numberLabel].filter(Boolean).join(' • ');
    const deckText = selectedCard.deck ? t('detail.deck', { deck: selectedCard.deck }) : null;

    return (
      <SafeAreaView style={styles.container}>
        {/* 卡牌详情页面的自定义标题栏 */}
        <View style={styles.customHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToList}
          >
            <Ionicons name="arrow-back" size={24} color="#d4af37" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedCard.name}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* 卡牌图片和基本信息 */}
          <View style={styles.heroSection}>
            <View style={styles.cardDetailImageContainer}>
              <Image
                source={selectedCard.image}
                style={styles.cardDetailImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.cardDetailInfo}>
              <Text style={styles.cardDetailName}>{selectedCard.name}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.cardMetaText}>{metaText}</Text>
              </View>
              {deckText && (
                <Text style={styles.deckInfo}>{deckText}</Text>
              )}
            </View>
          </View>

          {/* 正逆位切换器 */}
          <SideToggle side={cardSide} onSideChange={setCardSide} />

          {/* 解读内容 */}
          <InterpretationContent card={selectedCard} side={cardSide} />

          {/* 底部间距 */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 显示卡牌详情加载状态
  if (selectedCardId && cardDetailLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.customHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToList}
          >
            <Ionicons name="arrow-back" size={24} color="#d4af37" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('detail.detailHeader')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={styles.loadingText}>{t('status.loadingDetail')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 自定义标题栏 */}
      <View style={styles.customHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#d4af37" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('detail.header')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.light.tint]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  // 自定义标题栏样式
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60, // 确保最小高度一致
    backgroundColor: 'rgba(20, 20, 40, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.3)',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d4af37',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // 与backButton保持平衡
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#ff6b6b',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 24,
  },

  // 历史面板样式
  historyPanel: {
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d4af37',
  },
  historyContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  historySection: {
    marginBottom: 16,
  },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d4af37',
    marginBottom: 8,
  },
  historySectionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#ccc',
  },

  // 筛选器样式
  filtersContainer: {
    backgroundColor: 'rgba(75, 0, 130, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.3)',
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8a2be2',
    marginBottom: 16,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterButtonActive: {
    backgroundColor: '#8a2be2',
    borderColor: '#8a2be2',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#ccc',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '500',
  },

  // 卡牌列表样式
  cardsHeader: {
    marginBottom: 16,
  },
  cardsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#d4af37',
  },
  row: {
    justifyContent: 'space-between',
  },
  cardItem: {
    flex: 0.48,
    marginBottom: 16,
  },
  cardImageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    aspectRatio: 0.6, // 塔罗牌标准比例
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  cardInfo: {
    fontSize: 12,
    color: '#ccc',
  },

  // 卡牌详情页面样式
  heroSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(20, 20, 40, 0.8)',
  },
  cardDetailImageContainer: {
    width: screenWidth * 0.5,
    aspectRatio: 0.6,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardDetailImage: {
    width: '100%',
    height: '100%',
  },
  cardDetailInfo: {
    alignItems: 'center',
  },
  cardDetailName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#d4af37',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardMetaText: {
    fontSize: 16,
    color: '#ccc',
  },
  deckInfo: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },

  // Side Toggle
  sideToggleContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  sideToggleLabel: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 25,
    padding: 4,
    position: 'relative',
  },
  toggleOption: {
    width: 80,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  toggleText: {
    fontSize: 16,
    color: '#ccc',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  toggleIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 80,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    zIndex: 1,
  },

  // Interpretation Content
  interpretationContainer: {
    margin: 16,
    backgroundColor: 'rgba(40, 40, 60, 0.6)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  interpretationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  interpretationTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#d4af37',
  },
  directionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  uprightBadge: {
    backgroundColor: 'rgba(75, 0, 130, 0.8)',
  },
  reversedBadge: {
    backgroundColor: 'rgba(139, 0, 0, 0.8)',
  },
  directionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  summaryContainer: {
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8a2be2',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 18,
    lineHeight: 26,
    color: '#fff',
    fontWeight: '500',
  },

  detailContainer: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8a2be2',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#ccc',
  },

  bottomSpacer: {
    height: 40,
  },
});
