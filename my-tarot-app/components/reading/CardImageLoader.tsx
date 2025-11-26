import React, { useState, useEffect } from 'react';
import { Image, ActivityIndicator, View, StyleSheet } from 'react-native';
import { getCardImage } from '@/lib/utils/cardImages';

interface CardImageLoaderProps {
  imageUrl: string;
  width?: number;
  height?: number;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
}

export function CardImageLoader({
  imageUrl,
  width = 120,
  height = 200,
  style,
  resizeMode = 'contain',
}: CardImageLoaderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageSource, setImageSource] = useState<any>(null);

  useEffect(() => {
    loadCardImage();
  }, [imageUrl]);

  const loadCardImage = () => {
    try {
      setLoading(true);
      setError(false);

      // 使用统一的图片加载器
      const source = getCardImage(imageUrl);
      setImageSource(source);
      setLoading(false);
    } catch (error) {
      console.warn(`Failed to load card image: ${imageUrl}`, error);
      setError(true);
      setLoading(false);
      // 使用默认卡背图片
      const defaultSource = getCardImage('major/00-fool.jpg');
      setImageSource(defaultSource);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { width, height }, style]}>
        <ActivityIndicator size="small" color="#FFD700" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }, style]}>
      <Image
        source={imageSource}
        style={[styles.image, { width, height }]}
        resizeMode={resizeMode}
        onError={() => {
          setError(true);
          const defaultSource = getCardImage('major/00-fool.jpg');
          setImageSource(defaultSource);
        }}
      />
      {error && (
        <View style={styles.errorOverlay}>
          <ActivityIndicator size="small" color="#FFD700" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16213E',
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    borderRadius: 8,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});