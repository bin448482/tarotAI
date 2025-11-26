'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App,
  Typography,
  Card,
  Space,
  Button,
  Tag,
  Spin,
  Result,
  Divider,
  Row,
  Col,
} from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  AndroidOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { AppRelease } from '@/types';
import { appReleaseApi } from '@/lib/api';
import styles from './styles.module.css';

const { Title, Text, Paragraph } = Typography;

const formatFileSize = (bytes?: number) => {
  if (!bytes || Number.isNaN(bytes)) {
    return '未知';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatDateTime = (isoString?: string) => {
  if (!isoString) return '未知';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function ClientPortalPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [release, setRelease] = useState<AppRelease | null>(null);

  const loadLatestRelease = useCallback(async () => {
    setLoading(true);
    try {
      const latest = await appReleaseApi.getLatestRelease();
      setRelease(latest);
    } catch (error) {
      console.error('获取最新应用发布信息失败:', error);
      message.error('获取最新版本信息失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void loadLatestRelease();
  }, [loadLatestRelease]);

  return (
    <div className={styles.portalWrapper}>
      <div className={styles.overlay} />
      <main className={styles.content}>
        <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 960 }}>
          <Card
            className={styles.heroCard}
            bordered={false}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Tag color="purple" style={{ alignSelf: 'flex-start' }}>
                塔罗牌应用 · 客户端发布中心
              </Tag>
              <Title level={2} style={{ color: '#fff', marginBottom: 0 }}>
                获取最新安卓客户端
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.85)', maxWidth: 640 }}>
                欢迎使用塔罗牌应用客户端发布中心。下载最新版本，体验最新功能与优化。
                如果在安装或使用过程中遇到问题，请联系 76626123@qq.com。
              </Paragraph>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={() => void loadLatestRelease()}
                loading={loading}
                className={styles.heroButton}
              >
                刷新版本信息
              </Button>
            </Space>
          </Card>

          <Card className={styles.releaseCard}>
            {loading ? (
              <div className={styles.centered}>
                <Spin size="large" />
              </div>
            ) : release ? (
              <Row gutter={[24, 24]}>
                <Col xs={24} md={14}>
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Space align="center">
                      <AndroidOutlined style={{ fontSize: 28, color: '#6B46C1' }} />
                      <div>
                        <Title level={3} style={{ margin: 0 }}>
                          版本 {release.version}
                        </Title>
                        <Text type="secondary">构建号：{release.build_number || '未提供'}</Text>
                      </div>
                    </Space>
                    <Space size="large" wrap>
                      <div>
                        <Text type="secondary">发布时间</Text>
                        <div>{formatDateTime(release.uploaded_at)}</div>
                      </div>
                      <div>
                        <Text type="secondary">文件大小</Text>
                        <div>{formatFileSize(release.file_size)}</div>
                      </div>
                      <div>
                        <Text type="secondary">校验值</Text>
                        <div style={{ wordBreak: 'break-all', maxWidth: 260 }}>
                          {release.checksum || '未提供'}
                        </div>
                      </div>
                    </Space>
                    <Divider style={{ margin: '12px 0' }} />
                    <div>
                      <Text strong>更新说明</Text>
                      <Paragraph style={{ marginTop: 8 }}>
                        {release.release_notes || '此版本暂无额外说明。'}
                      </Paragraph>
                      {release.notes_url ? (
                        <Button
                          type="link"
                          icon={<FileTextOutlined />}
                          href={release.notes_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          查看完整更新日志
                        </Button>
                      ) : null}
                    </div>
                  </Space>
                </Col>
                <Col xs={24} md={10}>
                  <Card className={styles.downloadCard} bordered={false}>
                    <Space direction="vertical" size="large" style={{ width: '100%' }}>
                      <div>
                        <Text type="secondary">下载最新APK</Text>
                        <Paragraph style={{ marginBottom: 0 }}>
                          点击下方按钮开始下载最新版本的塔罗牌应用安卓安装包。
                        </Paragraph>
                      </div>
                      <Button
                        type="primary"
                        size="large"
                        icon={<DownloadOutlined />}
                        href={release.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        block
                      >
                        下载 APK
                      </Button>
                      <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
                        如果无法下载，请将链接复制到浏览器打开或联系 76626123@qq.com 获取帮助。
                      </Paragraph>
                    </Space>
                  </Card>
                </Col>
              </Row>
            ) : (
              <Result
                status="info"
                title="暂无发布版本"
                subTitle="当前还未发布任何安卓客户端，请稍后再试或联系管理员。"
                extra={
                  <Button icon={<ReloadOutlined />} onClick={() => void loadLatestRelease()}>
                    刷新
                  </Button>
                }
              />
            )}
          </Card>
        </Space>
      </main>
    </div>
  );
}
