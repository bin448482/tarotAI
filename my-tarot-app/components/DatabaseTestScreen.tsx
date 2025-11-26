/**
 * 数据库测试页面
 * Database test page for development
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useDatabase } from '../hooks/useDatabase';

export function DatabaseTestScreen() {
  const { 
    isInitializing, 
    isInitialized, 
    error, 
    status, 
    spreads, 
    initialize, 
    reset, 
    refresh 
  } = useDatabase();

  const handleReset = () => {
    Alert.alert(
      '重置数据库',
      '确定要重置数据库吗？这将清空所有数据并重新初始化。',
      [
        { text: '取消', style: 'cancel' },
        { text: '确定', style: 'destructive', onPress: reset }
      ]
    );
  };

  if (isInitializing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ffd700" />
        <Text style={styles.loadingText}>正在初始化数据库...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>数据库测试页面</Text>
      
      {/* 错误显示 */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>错误: {error}</Text>
        </View>
      )}

      {/* 数据库状态 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>数据库状态</Text>
        <View style={styles.statusItem}>
          <Text style={styles.label}>初始化状态:</Text>
          <Text style={[styles.value, { color: isInitialized ? '#4CAF50' : '#f44336' }]}>
            {isInitialized ? '已初始化' : '未初始化'}
          </Text>
        </View>
        
        {status && (
          <>
            <View style={styles.statusItem}>
              <Text style={styles.label}>数据库版本:</Text>
              <Text style={styles.value}>{status.version}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.label}>最后同步:</Text>
              <Text style={styles.value}>{status.lastSync || '未同步'}</Text>
            </View>
          </>
        )}
      </View>

      {/* 牌阵数据 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>牌阵数据</Text>
        <View style={styles.statusItem}>
          <Text style={styles.label}>牌阵数量:</Text>
          <Text style={styles.value}>{spreads.length}</Text>
        </View>
        
        {spreads.map((spread, index) => (
          <View key={spread.id || index} style={styles.spreadItem}>
            <Text style={styles.spreadName}>{spread.name}</Text>
            <Text style={styles.spreadDescription}>{spread.description}</Text>
            <Text style={styles.spreadCardCount}>卡牌数量: {spread.card_count}</Text>
          </View>
        ))}
      </View>

      {/* 操作按钮 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={initialize}>
          <Text style={styles.buttonText}>重新初始化</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={refresh}>
          <Text style={styles.buttonText}>刷新状态</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleReset}>
          <Text style={styles.buttonText}>重置数据库</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffd700',
    textAlign: 'center',
    marginBottom: 24,
  },
  loadingText: {
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#16213e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  label: {
    color: '#cccccc',
    fontSize: 14,
  },
  value: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  spreadItem: {
    backgroundColor: '#1a1a2e',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  spreadName: {
    color: '#ffd700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  spreadDescription: {
    color: '#cccccc',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  spreadCardCount: {
    color: '#ffffff',
    fontSize: 12,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#ffd700',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
});