import { Image } from 'expo-image';
import { Platform, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useState } from 'react';

import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { DatabaseService } from '@/lib/services/DatabaseService';
import { TestDataService } from '@/lib/services/TestDataService';
import { UserDatabaseService } from '@/lib/database/user-db';
import { DatabaseConnectionManager } from '@/lib/database/connection';

export default function TabTwoScreen() {
  const [isReloading, setIsReloading] = useState(false);
  const [isGeneratingData, setIsGeneratingData] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isCheckingSchema, setIsCheckingSchema] = useState(false);
  const [isDeletingDB, setIsDeletingDB] = useState(false);
  const [isDetectingDB, setIsDetectingDB] = useState(false);

  const checkDatabaseStatus = async () => {
    setIsReloading(true);
    try {
      const dbService = DatabaseService.getInstance();

      // 检查数据库状态（不执行初始化）
      const status = await dbService.getStatus();

      Alert.alert(
        '数据库状态',
        `数据库已初始化: ${status.isInitialized ? '是' : '否'}\n版本: ${status.version}`,
        [{ text: '确定' }]
      );
    } catch (error) {
      console.error('Error checking database:', error);
      Alert.alert(
        '错误',
        `数据库检查失败: ${error instanceof Error ? error.message : '未知错误'}`,
        [{ text: '确定' }]
      );
    } finally {
      setIsReloading(false);
    }
  };

  const viewRecentUserData = async () => {
    setIsGeneratingData(true);
    try {
      const userDbService = UserDatabaseService.getInstance();

      // 获取全局统计数据
      const globalStatsResult = await userDbService.getAllUserDataStats();

      if (globalStatsResult.success && globalStatsResult.data) {
        const stats = globalStatsResult.data;

        if (stats.totalRecords === 0) {
          Alert.alert(
            '用户数据',
            '数据库中没有任何用户记录',
            [{ text: '确定' }]
          );
        } else {
          Alert.alert(
            '全局用户数据统计',
            `📊 总记录数: ${stats.totalRecords} 条\n` +
            `👥 总用户数: ${stats.totalUsers} 个\n` +
            `🔹 离线解读: ${stats.offlineRecords} 条\n` +
            `🤖 AI解读: ${stats.aiRecords} 条\n\n` +
            `⏰ 最新记录: ${stats.latestRecord || '无'}`,
            [{ text: '确定' }]
          );
        }
      } else {
        throw new Error(globalStatsResult.error || '获取用户数据失败');
      }
    } catch (error) {
      console.error('Error viewing user data:', error);
      Alert.alert(
        '错误',
        `查看用户数据失败: ${error instanceof Error ? error.message : '未知错误'}`,
        [{ text: '确定' }]
      );
    } finally {
      setIsGeneratingData(false);
    }
  };

  const clearUserData = async () => {
    Alert.alert(
      '确认清除',
      '确定要清除所有用户数据吗？此操作不可恢复。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            setIsClearingData(true);
            try {
              const userDbService = UserDatabaseService.getInstance();

              // 清除所有用户数据
              const clearResult = await userDbService.clearAllUserData();

              if (clearResult.success) {
                Alert.alert(
                  '清除完成',
                  '所有用户数据已清除',
                  [{ text: '确定' }]
                );
              } else {
                throw new Error(clearResult.error || '清除用户数据失败');
              }
            } catch (error) {
              console.error('Error clearing user data:', error);
              Alert.alert(
                '错误',
                `清除用户数据失败: ${error instanceof Error ? error.message : '未知错误'}`,
                [{ text: '确定' }]
              );
            } finally {
              setIsClearingData(false);
            }
          }
        }
      ]
    );
  };

  // 数据库检测功能
  const detectDatabaseFiles = async () => {
    setIsDetectingDB(true);
    try {
      const connectionManager = DatabaseConnectionManager.getInstance();

      // 检查数据库状态
      const status = await connectionManager.getStatus();

      Alert.alert(
        '数据库文件检测',
        `连接管理器状态:\n` +
        `• 是否已初始化: ${status.isInitialized ? '✅ 是' : '❌ 否'}\n` +
        `• 版本: ${status.version}\n` +
        `• 最后同步: ${status.lastSync}\n\n` +
        `双数据库架构:\n` +
        `• 配置数据库: tarot_config.db\n` +
        `• 用户数据库: tarot_user_data.db`,
        [{ text: '确定' }]
      );
    } catch (error) {
      console.error('Error detecting databases:', error);
      Alert.alert(
        '错误',
        `数据库检测失败: ${error instanceof Error ? error.message : '未知错误'}`,
        [{ text: '确定' }]
      );
    } finally {
      setIsDetectingDB(false);
    }
  };

  // 数据库删除功能
  const deleteDatabaseFiles = async () => {
    Alert.alert(
      '危险操作确认',
      '⚠️ 确定要删除所有数据库文件吗？\n\n这将删除:\n• 配置数据库 (tarot_config.db)\n• 用户数据库 (tarot_user_data.db)\n\n此操作不可恢复！',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定删除',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingDB(true);
            try {
              const connectionManager = DatabaseConnectionManager.getInstance();

              // 执行完全重置
              const resetResult = await connectionManager.fullReset();

              if (resetResult.success) {
                Alert.alert(
                  '删除完成',
                  '✅ 所有数据库文件已删除\n\n应用将在下次启动时重新创建数据库',
                  [{ text: '确定' }]
                );
              } else {
                throw new Error(resetResult.error || '删除数据库失败');
              }
            } catch (error) {
              console.error('Error deleting databases:', error);
              Alert.alert(
                '错误',
                `删除数据库失败: ${error instanceof Error ? error.message : '未知错误'}`,
                [{ text: '确定' }]
              );
            } finally {
              setIsDeletingDB(false);
            }
          }
        }
      ]
    );
  };

  // 表结构检测功能
  const checkTableSchema = async () => {
    setIsCheckingSchema(true);
    try {
      const connectionManager = DatabaseConnectionManager.getInstance();

      // 获取用户数据库连接
      const userDb = connectionManager.getUserDatabase();

      // 检查user_history表结构
      const tableInfo = userDb.getAllSync<{cid: number, name: string, type: string, pk: number}>(
        "PRAGMA table_info(user_history)"
      );

      if (tableInfo.length === 0) {
        Alert.alert(
          '表结构检测',
          '❌ user_history 表不存在',
          [{ text: '确定' }]
        );
        return;
      }

      // 检查id字段类型
      const idField = tableInfo.find(field => field.name === 'id');
      const isCorrectSchema = idField && idField.type === 'TEXT' && idField.pk === 1;

      const schemaDetails = tableInfo.map(field =>
        `• ${field.name}: ${field.type}${field.pk ? ' (主键)' : ''}`
      ).join('\n');

      Alert.alert(
        '表结构检测结果',
        `user_history 表结构:\n${schemaDetails}\n\n` +
        `主键类型检测: ${isCorrectSchema ? '✅ 正确 (TEXT)' : '❌ 错误 (应为TEXT)'}\n\n` +
        `${isCorrectSchema ? '✅ 表结构符合UUID主键要求' : '⚠️ 表结构需要修复'}`,
        [{ text: '确定' }]
      );

    } catch (error) {
      console.error('Error checking table schema:', error);
      Alert.alert(
        '错误',
        `表结构检测失败: ${error instanceof Error ? error.message : '未知错误'}`,
        [{ text: '确定' }]
      );
    } finally {
      setIsCheckingSchema(false);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          Explore
        </ThemedText>
      </ThemedView>
      <ThemedText>This app includes example code to help you get started.</ThemedText>

      <Collapsible title="数据管理">
        <ThemedText>管理应用数据和设置。</ThemedText>

        {/* 数据库状态检查 */}
        <TouchableOpacity
          style={styles.reloadButton}
          onPress={checkDatabaseStatus}
          disabled={isReloading}
        >
          <ThemedText style={styles.reloadButtonText}>
            {isReloading ? '正在检查...' : '检查数据库状态'}
          </ThemedText>
        </TouchableOpacity>

        {/* 用户数据统计 */}
        <TouchableOpacity
          style={[styles.reloadButton, styles.viewDataButton]}
          onPress={viewRecentUserData}
          disabled={isGeneratingData}
        >
          <ThemedText style={styles.reloadButtonText}>
            {isGeneratingData ? '正在查看...' : '查看全局数据统计'}
          </ThemedText>
        </TouchableOpacity>

        {/* 清除用户数据 */}
        <TouchableOpacity
          style={[styles.reloadButton, styles.clearDataButton]}
          onPress={clearUserData}
          disabled={isClearingData}
        >
          <ThemedText style={styles.reloadButtonText}>
            {isClearingData ? '正在清除...' : '清除用户数据'}
          </ThemedText>
        </TouchableOpacity>

        {/* 数据库文件检测 */}
        <TouchableOpacity
          style={[styles.reloadButton, styles.detectDBButton]}
          onPress={detectDatabaseFiles}
          disabled={isDetectingDB}
        >
          <ThemedText style={styles.reloadButtonText}>
            {isDetectingDB ? '正在检测...' : '🔍 检测数据库文件'}
          </ThemedText>
        </TouchableOpacity>

        {/* 表结构检测 */}
        <TouchableOpacity
          style={[styles.reloadButton, styles.schemaButton]}
          onPress={checkTableSchema}
          disabled={isCheckingSchema}
        >
          <ThemedText style={styles.reloadButtonText}>
            {isCheckingSchema ? '正在检测...' : '🔬 检测表结构'}
          </ThemedText>
        </TouchableOpacity>

        {/* 删除数据库文件 */}
        <TouchableOpacity
          style={[styles.reloadButton, styles.deleteDBButton]}
          onPress={deleteDatabaseFiles}
          disabled={isDeletingDB}
        >
          <ThemedText style={styles.reloadButtonText}>
            {isDeletingDB ? '正在删除...' : '🗑️ 删除数据库文件'}
          </ThemedText>
        </TouchableOpacity>
      </Collapsible>
      <Collapsible title="File-based routing">
        <ThemedText>
          This app has two screens:{' '}
          <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> and{' '}
          <ThemedText type="defaultSemiBold">app/(tabs)/explore.tsx</ThemedText>
        </ThemedText>
        <ThemedText>
          The layout file in <ThemedText type="defaultSemiBold">app/(tabs)/_layout.tsx</ThemedText>{' '}
          sets up the tab navigator.
        </ThemedText>
        <ExternalLink href="https://docs.expo.dev/router/introduction">
          <ThemedText type="link">Learn more</ThemedText>
        </ExternalLink>
      </Collapsible>
      <Collapsible title="Android, iOS, and web support">
        <ThemedText>
          You can open this project on Android, iOS, and the web. To open the web version, press{' '}
          <ThemedText type="defaultSemiBold">w</ThemedText> in the terminal running this project.
        </ThemedText>
      </Collapsible>
      <Collapsible title="Images">
        <ThemedText>
          For static images, you can use the <ThemedText type="defaultSemiBold">@2x</ThemedText> and{' '}
          <ThemedText type="defaultSemiBold">@3x</ThemedText> suffixes to provide files for
          different screen densities
        </ThemedText>
        <Image
          source={require('@/assets/images/react-logo.png')}
          style={{ width: 100, height: 100, alignSelf: 'center' }}
        />
        <ExternalLink href="https://reactnative.dev/docs/images">
          <ThemedText type="link">Learn more</ThemedText>
        </ExternalLink>
      </Collapsible>
      <Collapsible title="Light and dark mode components">
        <ThemedText>
          This template has light and dark mode support. The{' '}
          <ThemedText type="defaultSemiBold">useColorScheme()</ThemedText> hook lets you inspect
          what the user&apos;s current color scheme is, and so you can adjust UI colors accordingly.
        </ThemedText>
        <ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
          <ThemedText type="link">Learn more</ThemedText>
        </ExternalLink>
      </Collapsible>
      <Collapsible title="Animations">
        <ThemedText>
          This template includes an example of an animated component. The{' '}
          <ThemedText type="defaultSemiBold">components/HelloWave.tsx</ThemedText> component uses
          the powerful{' '}
          <ThemedText type="defaultSemiBold" style={{ fontFamily: Fonts.mono }}>
            react-native-reanimated
          </ThemedText>{' '}
          library to create a waving hand animation.
        </ThemedText>
        {Platform.select({
          ios: (
            <ThemedText>
              The <ThemedText type="defaultSemiBold">components/ParallaxScrollView.tsx</ThemedText>{' '}
              component provides a parallax effect for the header image.
            </ThemedText>
          ),
        })}
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  reloadButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  reloadButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  viewDataButton: {
    backgroundColor: '#34C759',
    marginTop: 8,
  },
  clearDataButton: {
    backgroundColor: '#FF3B30',
    marginTop: 8,
  },
  detectDBButton: {
    backgroundColor: '#5856D6',
    marginTop: 8,
  },
  schemaButton: {
    backgroundColor: '#FF9500',
    marginTop: 8,
  },
  deleteDBButton: {
    backgroundColor: '#8E8E93',
    marginTop: 8,
  },
});
