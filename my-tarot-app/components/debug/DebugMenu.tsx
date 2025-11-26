/**
 * 开发模式调试菜单
 * Development mode debug menu
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { DatabaseService } from '@/lib/services/DatabaseService';

interface DebugMenuProps {
  visible?: boolean;
}

export const DebugMenu: React.FC<DebugMenuProps> = ({ visible = true }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  // 只在开发模式下显示
  if (__DEV__ !== true || !visible) {
    return null;
  }

  const handleDeleteDatabase = async () => {
    Alert.alert(
      '⚠️ 删除数据库',
      '确定要删除所有数据库数据吗？此操作不可撤销！',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '确定删除',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              console.log('🗑️ Starting database deletion...');
              
              const dbService = DatabaseService.getInstance();
              const result = await dbService.reset();
              
              if (result.success) {
                console.log('✅ Database deleted successfully');
                Alert.alert(
                  '✅ 成功',
                  '数据库已成功删除并重新初始化',
                  [{ text: '确定' }]
                );
              } else {
                console.error('❌ Database deletion failed:', result.error);
                Alert.alert(
                  '❌ 错误',
                  `删除数据库失败: ${result.error}`,
                  [{ text: '确定' }]
                );
              }
            } catch (error) {
              console.error('❌ Database deletion error:', error);
              Alert.alert(
                '❌ 错误',
                `删除数据库时发生错误: ${error}`,
                [{ text: '确定' }]
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleGetDatabaseStatus = async () => {
    try {
      const dbService = DatabaseService.getInstance();
      const status = await dbService.getStatus();
      
      Alert.alert(
        '📊 数据库状态',
        `初始化状态: ${status.isInitialized ? '已初始化' : '未初始化'}\n版本: ${status.version}\n最后同步: ${status.lastSync}`,
        [{ text: '确定' }]
      );
    } catch (error) {
      Alert.alert(
        '❌ 错误',
        `获取数据库状态失败: ${error}`,
        [{ text: '确定' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🛠️ 调试菜单</Text>
        <Text style={styles.subtitle}>开发模式专用</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleDeleteDatabase}
          disabled={isDeleting}
        >
          <Text style={styles.dangerButtonText}>
            {isDeleting ? '🔄 删除中...' : '🗑️ 一键删除数据库'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.infoButton]}
          onPress={handleGetDatabaseStatus}
        >
          <Text style={styles.infoButtonText}>
            📊 查看数据库状态
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 8,
    padding: 12,
    minWidth: 200,
    zIndex: 9999,
  },
  header: {
    marginBottom: 12,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 2,
  },
  buttonContainer: {
    gap: 8,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#ff4444',
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoButton: {
    backgroundColor: '#4444ff',
  },
  infoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});