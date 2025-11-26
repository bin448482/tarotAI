import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Linking, Platform, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { UserTransaction } from '../../lib/services/UserService';
import { apiConfig } from '../../lib/config/api';
import { useTranslation } from '@/lib/hooks/useTranslation';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import UserService from '@/lib/services/UserService';

interface RechargeRecord {
  id: string;
  amount: number;
  credits: number;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
  channel: string;
}

interface RechargePackage {
  amount: number;
  credits: number;
  popular?: boolean;
}

interface RechargeSectionProps {
  currentCredits?: number;
  userEmail?: string;
  rechargeHistory?: UserTransaction[];
  onRefresh?: () => void; // 刷新余额/交易记录
}

interface PackageCardProps {
  package: RechargePackage;
  onPress: () => void;
}

interface HistoryItemProps {
  record: UserTransaction;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ record }) => {
  const { t, i18n } = useTranslation('settings');
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const getStatusColor = (type: string) => {
    switch (type) {
      case 'recharge': return '#27ae60';
      case 'consume': return '#e74c3c';
      case 'refund': return '#f39c12';
      default: return '#8b8878';
    }
  };

  const getStatusText = (type: string) => {
    const key = `recharge.history.status.${type}`;
    const translation = t(key);
    return translation === key ? t('recharge.history.status.other') : translation;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <View style={styles.historyItem}>
      <View style={styles.historyLeft}>
        <Text style={styles.historyDescription}>{record.description}</Text>
        <Text style={styles.historyTime}>{formatDate(record.created_at)}</Text>
      </View>
      <View style={styles.historyRight}>
        <Text style={[
          styles.historyCredits,
          { color: record.credit_change > 0 ? '#27ae60' : '#e74c3c' }
        ]}>
          {t('recharge.history.creditChange', {
            sign: record.credit_change > 0 ? '+' : record.credit_change < 0 ? '-' : '',
            value: Math.abs(record.credit_change),
          })}
        </Text>
        <Text style={[styles.historyStatus, { color: getStatusColor(record.transaction_type) }]}>
          {getStatusText(record.transaction_type)}
        </Text>
      </View>
    </View>
  );
};

const resolveRedeemOrigin = (): string => {
  try {
    const parsed = new URL(apiConfig.baseUrl);
    return `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    const trimmed = apiConfig.baseUrl.trim();
    const match = trimmed.match(/^(https?:\/\/[^/:]+)(?::\d+)?/i);
    return match ? match[1] : trimmed;
  }
};

export const RechargeSection: React.FC<RechargeSectionProps> = ({
  currentCredits = 0,
  userEmail,
  rechargeHistory = [],
  onRefresh,
}) => {
  const { t } = useTranslation('settings');

  // ====== IAP 集成（Android 首版） ======
  const isAndroid = Platform.OS === 'android';
  const iapRef = useRef<any>(null);
  const purchaseUpdateSub = useRef<any>(null);
  const purchaseErrorSub = useRef<any>(null);

  const [isIapReady, setIsIapReady] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [products, setProducts] = useState<Array<{ productId: string; title: string; price: string }>>([]);
  const [purchasingProductId, setPurchasingProductId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [iapError, setIapError] = useState<string | null>(null);
  const [iapSuccess, setIapSuccess] = useState<string | null>(null);

  const productIds = [
    'com.mysixth.tarot.credits_5',
    'com.mysixth.tarot.credits_10',
    'com.mysixth.tarot.credits_20',
    'com.mysixth.tarot.credits_50',
    'com.mysixth.tarot.credits_100',
  ];

  useEffect(() => {
    let mounted = true;
    async function initIap() {
      if (!isAndroid) return;
      setLoadingProducts(true);
      setIapError(null);
      setIapSuccess(null);
      try {
        const mod = await import('react-native-iap').catch(() => null as any);
        if (!mod) {
          setIsIapReady(false);
          return;
        }
        iapRef.current = mod;
        const ok = await mod.initConnection();
        if (!ok) {
          setIsIapReady(false);
          return;
        }

        // 监听购买更新
        purchaseUpdateSub.current = mod.purchaseUpdatedListener(async (purchase: any) => {
          try {
            const token = purchase?.purchaseToken || purchase?.transactionReceipt || null;
            const productId = purchase?.productId || purchasingProductId;
            if (!token || !productId) return;

            setVerifying(true);
            setIapError(null);

            const installationId = Application.androidId || Device.modelName || 'unknown';
            const userService = UserService.getInstance();
            const res = await userService.verifyGooglePurchase({
              installation_id: installationId,
              product_id: productId,
              purchase_token: token,
            });

            if (res?.success) {
              setIapSuccess(t('recharge.iap.success', { credits: res.credits_awarded }));
              onRefresh?.();
            } else {
              setIapError(t('recharge.iap.error.verify'));
            }

            // 完成交易（消耗型）
            try {
              await iapRef.current?.finishTransaction(purchase, true);
            } catch {}
          } finally {
            setVerifying(false);
            setPurchasingProductId(null);
          }
        });

        // 监听错误
        purchaseErrorSub.current = mod.purchaseErrorListener((err: any) => {
          setPurchasingProductId(null);
          if (err?.code === 'E_USER_CANCELLED') {
            setIapError(t('recharge.iap.error.cancelled'));
          } else {
            setIapError(t('recharge.iap.error.failed', { message: err?.message || 'unknown' }));
          }
        });

        const r = await mod.getProducts(productIds);
        if (!mounted) return;
        const mapped = (r || []).map((p: any) => ({
          productId: p?.productId || p?.sku,
          title: p?.title?.split(' (')[0] || p?.title || p?.productId,
          price: p?.localizedPrice || p?.price || '',
        }));
        setProducts(mapped);
        setIsIapReady(mapped.length > 0);
      } catch (e) {
        setIsIapReady(false);
      } finally {
        if (mounted) setLoadingProducts(false);
      }
    }
    initIap();
    return () => {
      try {
        purchaseUpdateSub.current?.remove?.();
        purchaseErrorSub.current?.remove?.();
        iapRef.current?.endConnection?.();
      } catch {}
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePurchase = async (productId: string) => {
    if (!iapRef.current) return;
    try {
      setIapError(null);
      setIapSuccess(null);
      setPurchasingProductId(productId);
      await iapRef.current.requestPurchase({ sku: productId });
    } catch (e: any) {
      setPurchasingProductId(null);
      if (e?.code === 'E_USER_CANCELLED') {
        setIapError(t('recharge.iap.error.cancelled'));
      } else {
        setIapError(t('recharge.iap.error.failed', { message: e?.message || 'unknown' }));
      }
    }
  };

  const handleRedeemCode = async () => {
    try {
      const origin = resolveRedeemOrigin();
      const redeemUrl = new URL(
        '/verify-email?installation_id=23049RAD8C',
        origin
      ).toString();

      const canOpen = await Linking.canOpenURL(redeemUrl);
      if (!canOpen) {
        console.warn('Redeem URL cannot be opened:', redeemUrl);
        return;
      }

      await Linking.openURL(redeemUrl);
    } catch (err) {
      console.error('Failed to open redeem URL:', err);
    }
  };

  const renderHistoryItem = ({ item }: { item: UserTransaction }) => (
    <HistoryItem record={item} />
  );

	  return (
	    <View style={styles.sectionContainer}>
	      <Text style={styles.sectionTitle}>{t('recharge.title')}</Text>

	      <BlurView intensity={20} style={styles.cardContainer}>
	        {/* 用户信息区域 */}
        <View style={styles.userInfoCard}>
          {userEmail && (
            <View style={styles.emailContainer}>
              <Ionicons name="mail" size={16} color="#d4af37" />
              <Text style={styles.emailText}>{userEmail}</Text>
            </View>
          )}
	          <View style={styles.balanceContainer}>
	            <Text style={styles.balanceLabel}>{t('recharge.balance.label')}</Text>
	            <Text style={styles.balanceAmount}>{currentCredits}</Text>
	            <Text style={styles.balanceNote}>{t('recharge.balance.note')}</Text>

	            {/* 手动刷新余额 */}
	            {!!onRefresh && (
	              <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
	                <Ionicons name="refresh" size={16} color="#d4af37" />
	                <Text style={styles.refreshText}>{t('status.retry')}</Text>
	              </TouchableOpacity>
	            )}
	          </View>
	        </View>

	        {/* IAP 状态条幅 */}
	        {!!iapSuccess && (
	          <View style={[styles.banner, styles.bannerSuccess]}>
	            <Text style={styles.bannerTextSuccess}>{iapSuccess}</Text>
	          </View>
	        )}
	        {!!iapError && (
	          <View style={[styles.banner, styles.bannerError]}>
	            <Text style={styles.bannerTextError}>{iapError}</Text>
	          </View>
	        )}
	        {verifying && (
	          <View style={[styles.banner, styles.bannerInfo]}>
	            <Text style={styles.bannerTextInfo}>{t('recharge.iap.verifying')}</Text>
	          </View>
	        )}

	        {/* Google Play 购买区（仅 Android） */}
	        {isAndroid && (
	          <View style={styles.iapContainer}>
	            <Text style={styles.iapTitle}>{t('recharge.iap.title')}</Text>

	            {loadingProducts && (
	              <View style={styles.loadingRow}>
	                <ActivityIndicator color="#d4af37" />
	                <Text style={styles.loadingText}>{t('recharge.iap.loading')}</Text>
	              </View>
	            )}

	            {!loadingProducts && !isIapReady && (
	              <View style={styles.unavailableBox}>
	                <Ionicons name="alert-circle-outline" size={16} color="#e74c3c" />
	                <Text style={styles.unavailableText}>{t('recharge.iap.unavailable')}</Text>
	                <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
	                  <Text style={styles.retryBtnText}>{t('recharge.iap.retry')}</Text>
	                </TouchableOpacity>
	              </View>
	            )}

	            <View style={styles.grid}>
	              {products.slice(0, 6).map((p, idx) => {
	                const highlight = idx === 1 ? 'popular' : idx === products.length - 1 ? 'best' : undefined;
	                const loading = purchasingProductId === p.productId;
	                return (
	                  <TouchableOpacity
	                    key={p.productId}
	                    style={[
	                      styles.pkgCard,
	                      highlight === 'popular' && styles.pkgPopular,
	                      highlight === 'best' && styles.pkgBestValue,
	                    ]}
	                    disabled={!isIapReady || verifying || loading}
	                    onPress={() => handlePurchase(p.productId)}
	                  >
	                    {highlight && (
	                      <View style={styles.badge}>
	                        <Text style={styles.badgeText}>
	                          {highlight === 'popular' ? t('recharge.iap.popular') : t('recharge.iap.bestValue')}
	                        </Text>
	                      </View>
	                    )}
	                    <Text style={styles.pkgTitle}>{p.title}</Text>
	                    <Text style={styles.pkgPrice}>{p.price}</Text>
	                    <View style={styles.buyRow}>
	                      {loading ? (
	                        <ActivityIndicator color="#d4af37" />
	                      ) : (
	                        <>
	                          <Ionicons name="cart" size={14} color="#d4af37" />
	                          <Text style={styles.buyText}>{t('recharge.iap.buy') || 'Buy'}</Text>
	                        </>
	                      )}
	                    </View>
	                  </TouchableOpacity>
	                );
	              })}
	            </View>
	          </View>
	        )}

	        {/* 兑换码充值按钮 */}
	        <TouchableOpacity
	          style={styles.redeemButton}
	          onPress={handleRedeemCode}
	          activeOpacity={0.7}
        >
          <View style={styles.redeemButtonContent}>
            <View style={styles.redeemButtonLeft}>
              <Ionicons name="gift" size={20} color="#d4af37" />
              <Text style={styles.redeemButtonTitle}>{t('recharge.redeem.title')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#8b8878" />
          </View>
        </TouchableOpacity>

        {/* 充值记录（按需求暂时隐藏最近交易记录内容） */}
        {/*
        {rechargeHistory.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.subsectionTitle}>{t('recharge.history.title')}</Text>
            <FlatList
              data={rechargeHistory.slice(0, 5)} // 只显示最近5条
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
            {rechargeHistory.length > 5 && (
              <TouchableOpacity style={styles.viewMoreButton}>
                <Text style={styles.viewMoreText}>{t('recharge.history.viewMore')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        */}
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#d4af37',
    marginBottom: 16,
    textAlign: 'center',
  },

  cardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 20, 40, 0.6)',
    padding: 16,
  },

  subsectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#d4af37',
    marginBottom: 12,
  },

  // 用户信息卡片
  userInfoCard: {
    paddingVertical: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.1)',
  },

  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },

  emailText: {
    fontSize: 14,
    color: '#e6e6fa',
    marginLeft: 8,
    fontFamily: 'monospace',
  },

  balanceContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  balanceLabel: {
    fontSize: 14,
    color: '#8b8878',
    marginBottom: 8,
  },

  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 4,
  },

  balanceNote: {
    fontSize: 12,
    color: '#8b8878',
  },

  // 刷新按钮
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
  },
  refreshText: { fontSize: 12, color: '#d4af37' },

  // IAP 样式
  iapContainer: { marginTop: 16 },
  iapTitle: { fontSize: 16, fontWeight: '600', color: '#e6e6fa', marginBottom: 8 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  loadingText: { fontSize: 14, color: '#8b8878', marginLeft: 8 },
  unavailableBox: {
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
    backgroundColor: 'rgba(231, 76, 60, 0.08)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 8,
  },
  unavailableText: { fontSize: 13, color: '#e74c3c' },
  retryBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryBtnText: { color: '#d4af37', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 },
  pkgCard: {
    width: '48%',
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  pkgPopular: { borderColor: 'rgba(212, 175, 55, 0.5)' },
  pkgBestValue: { borderColor: 'rgba(39, 174, 96, 0.5)' },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, color: '#d4af37' },
  pkgTitle: { fontSize: 16, color: '#e6e6fa', fontWeight: '600', marginBottom: 4 },
  pkgPrice: { fontSize: 14, color: '#d4af37', marginBottom: 8 },
  buyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  buyText: { fontSize: 14, color: '#d4af37', fontWeight: '500' },

  // 顶部条幅
  banner: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginTop: 8 },
  bannerInfo: { backgroundColor: 'rgba(212, 175, 55, 0.08)', borderColor: 'rgba(212, 175, 55, 0.3)' },
  bannerSuccess: { backgroundColor: 'rgba(39, 174, 96, 0.1)', borderColor: 'rgba(39, 174, 96, 0.3)' },
  bannerError: { backgroundColor: 'rgba(231, 76, 60, 0.1)', borderColor: 'rgba(231, 76, 60, 0.3)' },
  bannerTextInfo: { fontSize: 13, color: '#d4af37' },
  bannerTextSuccess: { fontSize: 13, color: '#2ecc71' },
  bannerTextError: { fontSize: 13, color: '#e74c3c' },

  // 兑换码充值按钮
  redeemButton: {
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    marginBottom: 20,
  },

  redeemButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  redeemButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  redeemButtonTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#d4af37',
    marginLeft: 12,
  },

  // 交易记录
  historyContainer: {
    marginTop: 8,
  },

  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },

  historyLeft: {
    flex: 1,
  },

  historyDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e6e6fa',
    marginBottom: 2,
  },

  historyTime: {
    fontSize: 12,
    color: '#8b8878',
  },

  historyRight: {
    alignItems: 'flex-end',
  },

  historyCredits: {
    fontSize: 14,
    fontWeight: '500',
    color: '#d4af37',
    marginBottom: 2,
  },

  historyStatus: {
    fontSize: 12,
    fontWeight: '500',
  },

  viewMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },

  viewMoreText: {
    fontSize: 14,
    color: '#d4af37',
    textDecorationLine: 'underline',
  },
});
