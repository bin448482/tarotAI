'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  App,
  Typography,
  Card,
  Space,
  Button,
  Descriptions,
  Upload,
  Form,
  Input,
  Divider,
  Row,
  Col,
  Spin,
  Empty,
  Tag,
} from 'antd';
import {
  InboxOutlined,
  ReloadOutlined,
  DownloadOutlined,
  CloudUploadOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import AdminLayout from '@/components/layout/AdminLayout';
import { appReleaseApi } from '@/lib/api';
import type { AppRelease } from '@/types';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

const MAX_UPLOAD_SIZE = 300 * 1024 * 1024; // 300MB

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

export default function AppReleasePage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [release, setRelease] = useState<AppRelease | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<RcFile | null>(null);

  const loadLatestRelease = useCallback(async () => {
    setLoading(true);
    try {
      const latestRelease = await appReleaseApi.getLatestRelease();
      setRelease(latestRelease);
    } catch (error) {
      console.error('加载最新发布信息失败:', error);
      message.error('加载最新发布信息失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void loadLatestRelease();
  }, [loadLatestRelease]);

  const handleBeforeUpload = (file: RcFile) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'apk') {
      message.error('仅支持上传 .apk 文件');
      return Upload.LIST_IGNORE;
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      message.error('文件过大，请上传不超过300MB的APK文件');
      return Upload.LIST_IGNORE;
    }

    setFileList([file]);
    setSelectedFile(file);
    return false;
  };

  const handleRemove = () => {
    setFileList([]);
    setSelectedFile(null);
    return true;
  };

  const handleUpload = async (values: {
    version: string;
    build_number?: string;
    release_notes?: string;
    notes_url?: string;
  }) => {
    if (!selectedFile) {
      message.warning('请先选择需要上传的APK文件');
      return;
    }

    const formData = new FormData();
    formData.append('apk_file', selectedFile);
    // 兼容后端可能使用的通用字段名
    formData.append('file', selectedFile);
    formData.append('version', values.version);

    if (values.build_number) {
      formData.append('build_number', values.build_number);
    }
    if (values.release_notes) {
      formData.append('release_notes', values.release_notes);
      formData.append('description', values.release_notes);
    }
    if (values.notes_url) {
      formData.append('notes_url', values.notes_url);
    }

    setUploading(true);
    try {
      const response = await appReleaseApi.uploadRelease(formData);
      if (response?.success) {
        message.success('应用发布信息已更新');
      } else {
        message.success('上传成功');
      }

      form.resetFields();
      setFileList([]);
      setSelectedFile(null);
      await loadLatestRelease();
    } catch (error) {
      console.error('上传应用发布信息失败:', error);
      const errorMessage = error instanceof Error ? error.message : '上传失败，请检查网络或接口配置';
      message.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const uploadProps = {
    multiple: false,
    accept: '.apk',
    beforeUpload: handleBeforeUpload,
    onRemove: handleRemove,
    fileList,
    showUploadList: true,
  };

  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ marginBottom: 8 }}>
            应用发布管理
          </Title>
          <Text type="secondary">
            上传最新的安卓客户端APK，并向客户提供最新版下载链接。
          </Text>
        </div>

        <Card
          title={
            <Space align="center">
              <InfoCircleOutlined />
              最新发布信息
            </Space>
          }
          extra={
            <Button icon={<ReloadOutlined />} onClick={() => void loadLatestRelease()} disabled={loading}>
              刷新
            </Button>
          }
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
              <Spin />
            </div>
          ) : release ? (
            <Row gutter={[16, 16]}>
              <Col xs={24} md={16}>
                <Descriptions column={1} bordered size="middle" labelStyle={{ width: 120 }}>
                  <Descriptions.Item label="版本号">{release.version}</Descriptions.Item>
                  <Descriptions.Item label="构建号">{release.build_number || '未填写'}</Descriptions.Item>
                  <Descriptions.Item label="发布时间">{formatDateTime(release.uploaded_at)}</Descriptions.Item>
                  <Descriptions.Item label="文件大小">{formatFileSize(release.file_size)}</Descriptions.Item>
                  <Descriptions.Item label="校验值">{release.checksum || '未提供'}</Descriptions.Item>
                  <Descriptions.Item label="上传人">{release.uploaded_by || '管理员'}</Descriptions.Item>
                </Descriptions>
              </Col>
              <Col xs={24} md={8}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Card
                    size="small"
                    style={{ background: '#f5f1ff', borderColor: '#d6c7ff' }}
                  >
                    <Space align="start">
                      <CheckCircleOutlined style={{ fontSize: 20, color: '#6B46C1' }} />
                      <div>
                        <Text strong>发布备注</Text>
                        <Paragraph style={{ marginBottom: 0, marginTop: 4 }}>
                          {release.release_notes || '暂无发布备注'}
                        </Paragraph>
                      </div>
                    </Space>
                  </Card>
                  {release.notes_url ? (
                    <Button type="default" block href={release.notes_url} target="_blank" rel="noopener noreferrer">
                      查看更新日志
                    </Button>
                  ) : null}
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    block
                    href={release.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    下载最新APK
                  </Button>
                  <Tag color="purple">客户端门户链接：/client-portal</Tag>
                </Space>
              </Col>
            </Row>
          ) : (
            <Empty description="尚未上传应用发布信息" />
          )}
        </Card>

        <Card
          title={
            <Space align="center">
              <CloudUploadOutlined />
              上传新的发布
            </Space>
          }
        >
          <Form
            layout="vertical"
            form={form}
            onFinish={handleUpload}
            requiredMark="optional"
          >
            <Row gutter={[24, 24]}>
              <Col span={24}>
                <Form.Item
                  label="APK文件"
                  required
                  tooltip="仅支持单个APK文件，最大300MB"
                >
                  <Dragger {...uploadProps}>
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">点击或拖拽APK文件到此区域上传</p>
                    <p className="ant-upload-hint">
                      仅支持 .apk 文件，上传后将自动覆盖客户端门户中的下载链接
                    </p>
                  </Dragger>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="version"
                  label="版本号"
                  rules={[{ required: true, message: '请输入版本号，例如 1.2.3' }]}
                >
                  <Input placeholder="例如：1.2.3" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="build_number"
                  label="构建号"
                  rules={[{ required: true, message: '请输入构建号，例如 10203' }]}
                >
                  <Input placeholder="例如：10203" />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="release_notes"
                  label="发布备注"
                >
                  <Input.TextArea rows={3} placeholder="简要描述本次更新内容（可选）" showCount maxLength={500} />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="notes_url"
                  label="更新日志链接"
                  rules={[
                    {
                      type: 'url',
                      message: '请输入有效的URL地址',
                    },
                  ]}
                >
                  <Input placeholder="例如：https://example.com/release-notes" />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={uploading}
                disabled={!selectedFile}
              >
                提交发布
              </Button>
              <Button
                htmlType="button"
                onClick={() => {
                  form.resetFields();
                  setFileList([]);
                  setSelectedFile(null);
                }}
                disabled={uploading}
              >
                重置
              </Button>
            </Space>
          </Form>
        </Card>
      </Space>
    </AdminLayout>
  );
}
