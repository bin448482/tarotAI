import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import Constants from 'expo-constants';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface SupportButtonProps {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

interface SupportActionButton {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  action: string;
}

interface SupportGroup {
  id: string;
  title: string;
  buttons: SupportActionButton[];
}

interface VersionInfoLabels {
  appVersion: string;
  buildNumber: string;
  updatedAt: string;
}

interface VersionInfoTranslation {
  title?: string;
  labels?: VersionInfoLabels;
  updatedAt?: string;
}

const SupportButton: React.FC<SupportButtonProps> = ({ icon, title, subtitle, onPress }) => {
  return (
    <TouchableOpacity style={styles.supportButton} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.buttonLeft}>
        <Text style={styles.buttonIcon}>{icon}</Text>
        <View style={styles.buttonContent}>
          <Text style={styles.buttonTitle}>{title}</Text>
          <Text style={styles.buttonSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Text style={styles.buttonArrow}>›</Text>
    </TouchableOpacity>
  );
};

export const SupportSection: React.FC = () => {
  const { t } = useTranslation('settings');
  const supportGroups = (t('support.groups', { returnObjects: true }) as SupportGroup[]) ?? [];
  const versionInfo = (t('support.version', { returnObjects: true }) as VersionInfoTranslation) ?? {};
  const versionLabels: VersionInfoLabels = versionInfo.labels ?? {
    appVersion: '',
    buildNumber: '',
    updatedAt: '',
  };
  const emailAddress = t('support.contact.email');
  const feedbackEmail = t('support.contact.feedbackEmail');
  const okText = t('support.common.ok');
  const cancelText = t('support.common.cancel');
  const sendEmailText = t('support.common.sendEmail');

  const handleContact = (type: string) => {
    switch (type) {
      case 'email':
        handleEmailContact();
        break;
      case 'feedback':
        handleFeedback();
        break;
      case 'update':
        handleCheckUpdate();
        break;
      case 'help':
        handleHelp();
        break;
      case 'faq':
        handleFAQ();
        break;
      default:
        break;
    }
  };

  const handleEmailContact = async () => {
    const email = emailAddress;
    const version = Constants.expoConfig?.version || '1.0.0';
    const device = Constants.deviceName || 'Unknown';
    const subject = t('support.alerts.email.subject');
    const body = t('support.alerts.email.body', { version, device });

    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          t('support.alerts.email.errorTitle'),
          t('support.alerts.email.errorMessage', { email }),
          [{ text: okText }]
        );
      }
    } catch (error) {
      console.warn('Failed to open support email link', error);
      Alert.alert(
        t('support.alerts.email.errorTitle'),
        t('support.alerts.email.errorMessage', { email }),
        [{ text: okText }]
      );
    }
  };

  const handleFeedback = () => {
    Alert.alert(
      t('support.alerts.feedback.title'),
      t('support.alerts.feedback.message', { email: feedbackEmail }),
      [
        { text: sendEmailText, onPress: () => handleContact('email') },
        { text: cancelText, style: 'cancel' }
      ]
    );
  };

  const handleCheckUpdate = () => {
    const version = Constants.expoConfig?.version || '1.0.0';
    Alert.alert(
      t('support.alerts.update.title'),
      t('support.alerts.update.message', { version }),
      [{ text: okText }]
    );
  };

  const handleHelp = () => {
    Alert.alert(
      t('support.alerts.help.title'),
      t('support.alerts.help.message'),
      [{ text: okText }]
    );
  };

  const handleFAQ = () => {
    Alert.alert(
      t('support.alerts.faq.title'),
      t('support.alerts.faq.message'),
      [{ text: okText }]
    );
  };

  return (
    <CollapsibleSection
      title={t('support.title')}
      icon="🆘"
      defaultExpanded={false}
    >
      {supportGroups.map(group => (
        <View key={group.id} style={styles.supportGroup}>
          {!!group.title && <Text style={styles.groupTitle}>{group.title}</Text>}
          {group.buttons?.map(button => (
            <SupportButton
              key={`${group.id}-${button.id}`}
              icon={button.icon}
              title={button.title}
              subtitle={button.subtitle}
              onPress={() => handleContact(button.action)}
            />
          ))}
        </View>
      ))}

      {/* 版本信息 */}
      <View style={styles.versionInfo}>
        {!!versionInfo.title && <Text style={styles.versionTitle}>{versionInfo.title}</Text>}
        <View style={styles.versionDetails}>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>{versionLabels.appVersion}</Text>
            <Text style={styles.versionValue}>{Constants.expoConfig?.version || '1.0.0'}</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>{versionLabels.buildNumber}</Text>
            <Text style={styles.versionValue}>
              {Constants.expoConfig?.android?.versionCode ?? Constants.expoConfig?.ios?.buildNumber ?? '1'}
            </Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>{versionLabels.updatedAt}</Text>
            <Text style={styles.versionValue}>{versionInfo.updatedAt ?? ''}</Text>
          </View>
        </View>
      </View>
    </CollapsibleSection>
  );
};

const styles = StyleSheet.create({
  // 支持分组
  supportGroup: {
    marginBottom: 24,
  },

  groupTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#d4af37',
    marginBottom: 12,
  },

  // 支持按钮
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.1)',
    marginBottom: 8,
  },

  buttonLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  buttonIcon: {
    fontSize: 20,
    marginRight: 12,
  },

  buttonContent: {
    flex: 1,
  },

  buttonTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e6e6fa',
    marginBottom: 2,
  },

  buttonSubtitle: {
    fontSize: 14,
    color: '#8b8878',
    lineHeight: 18,
  },

  buttonArrow: {
    fontSize: 20,
    color: '#d4af37',
    fontWeight: '300',
  },

  // 版本信息
  versionInfo: {
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.1)',
    padding: 16,
  },

  versionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#d4af37',
    marginBottom: 12,
  },

  versionDetails: {
    gap: 8,
  },

  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  versionLabel: {
    fontSize: 14,
    color: '#8b8878',
  },

  versionValue: {
    fontSize: 14,
    color: '#e6e6fa',
    fontWeight: '500',
  },
});
