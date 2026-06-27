import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { CardSlot } from './CardSlot';
import { DraggableCard } from './DraggableCard';
import { useTranslation } from 'react-i18next';
import type { DimensionData } from '@/lib/contexts/ReadingContext';

interface DrawnCard {
  cardId: number;
  name: string;
  displayName?: string;
  imageUrl: string;
  position: string;
  dimension: DimensionData;
  direction: 'upright' | 'reversed';
  revealed: boolean;
  basicSummary?: string;
}

interface DragDropContainerProps {
  dimensions: DimensionData[];
  drawnCards: DrawnCard[];
  onCardPlacement: (cardId: number, slotIndex: number) => void;
  onAllCardsPlaced: () => void;
  onCardPress?: (card: DrawnCard) => void;
  canTriggerStars?: boolean; // 新增：控制特效触发
}

interface SlotPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const SLOT_WIDTH = Math.min(screenWidth * 0.28, 110);
const SLOT_HEIGHT = SLOT_WIDTH * 1.6;

export function DragDropContainer({
  dimensions,
  drawnCards,
  onCardPlacement,
  onAllCardsPlaced,
  onCardPress,
  canTriggerStars = false, // 新增：默认值为false
}: DragDropContainerProps) {
  const [draggedCardId, setDraggedCardId] = useState<number | null>(null);
  const [highlightedSlot, setHighlightedSlot] = useState<number | null>(null);
  const [cardPlacements, setCardPlacements] = useState<{ [cardId: number]: number }>({});
  const [slotPositions, setSlotPositions] = useState<SlotPosition[]>([]);
  const { t } = useTranslation('reading');

  const containerRef = useRef<View>(null);
  const slotRefs = useRef<(View | null)[]>([]);

  // 计算卡槽位置
  useEffect(() => {
    const measureSlots = () => {
      const positions: SlotPosition[] = [];

      slotRefs.current.forEach((ref, index) => {
        if (ref) {
          ref.measureInWindow((x, y, width, height) => {
            positions[index] = { x, y, width, height };

            if (positions.length === dimensions.length) {
              setSlotPositions(positions);
            }
          });
        }
      });
    };

    // 延迟测量以确保布局完成
    const timer = setTimeout(measureSlots, 100);
    return () => clearTimeout(timer);
  }, [dimensions.length]);

  // 检查拖拽位置是否在某个卡槽内
  const checkDropZone = (x: number, y: number): number => {
    for (let i = 0; i < slotPositions.length; i++) {
      const slot = slotPositions[i];
      if (
        x >= slot.x &&
        x <= slot.x + slot.width &&
        y >= slot.y &&
        y <= slot.y + slot.height
      ) {
        return i;
      }
    }
    return -1;
  };

  // 处理拖拽进行中的实时检测
  const handleDragActive = (cardId: number, x: number, y: number) => {
    const dropZone = checkDropZone(x, y);
    setHighlightedSlot(dropZone !== -1 ? dropZone : null);
  };

  // 处理拖拽开始
  const handleDragStart = (cardId: number) => {
    setDraggedCardId(cardId);
  };

  // 处理拖拽结束
  const handleDragEnd = (cardId: number, x: number, y: number) => {
    const dropZone = checkDropZone(x, y);

    if (dropZone !== -1) {
      // 检查目标卡槽是否已被占用
      const isSlotOccupied = Object.values(cardPlacements).includes(dropZone);

      if (!isSlotOccupied) {
        // 成功放置
        const newPlacements = { ...cardPlacements, [cardId]: dropZone };
        setCardPlacements(newPlacements);
        onCardPlacement(cardId, dropZone);

        // 检查是否所有卡牌都已放置
        if (Object.keys(newPlacements).length === drawnCards.length) {
          onAllCardsPlaced();
        }
      } else {
        // 卡槽已被占用
        Alert.alert(
          t('shared.components.dragDrop.slotOccupiedTitle'),
          t('shared.components.dragDrop.slotOccupiedMessage')
        );
      }
    }

    setDraggedCardId(null);
    setHighlightedSlot(null);
  };

  // 获取未放置的卡牌
  const getUnplacedCards = () => {
    return drawnCards.filter(card => !(card.cardId in cardPlacements));
  };

  // 获取指定卡槽中的卡牌
  const getCardInSlot = (slotIndex: number): DrawnCard | undefined => {
    const cardId = Object.keys(cardPlacements).find(
      id => cardPlacements[parseInt(id)] === slotIndex
    );
    return cardId ? drawnCards.find(card => card.cardId === parseInt(cardId)) : undefined;
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* 卡槽区域 */}
        <View style={styles.slotsContainer}>
          {dimensions.map((dimension, index) => (
            <View
              key={dimension.id}
              ref={ref => { slotRefs.current[index] = ref; }}
            >
              <CardSlot
                dimension={dimension}
                slotIndex={index}
                droppedCard={getCardInSlot(index)}
                isHighlighted={highlightedSlot === index}
                onCardPress={onCardPress}
                canTriggerStars={canTriggerStars} // 传递特效触发状态
              />
            </View>
          ))}
        </View>

        {/* 可拖拽卡牌区域 */}
        <View style={styles.cardsContainer}>
          {getUnplacedCards().map((card, index) => (
            <View key={card.cardId} style={styles.cardWrapper}>
              <DraggableCard
                card={{
                  id: card.cardId,
                  name: card.name,
                  displayName: card.displayName ?? card.name,
                  imageUrl: card.imageUrl,
                  direction: card.direction,
                  revealed: card.revealed,
                }}
                isDraggable={true}
                onDragStart={handleDragStart}
                onDragActive={handleDragActive}
                onDragEnd={handleDragEnd}
                onPress={() => onCardPress?.(card)}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  slotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',  // 改为center确保居中
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 40,
    gap: 16,  // 使用gap确保一致的间距
  },
  // slotWrapper 样式已移除 - CardSlot自己处理居中
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 16,
  },
  cardWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
});
