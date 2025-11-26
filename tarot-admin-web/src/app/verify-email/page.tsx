'use client';

export const dynamic = 'force-dynamic';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  App,
  Alert,
  Button,
  Card,
  Form,
  Input,
  Space,
  Spin,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  GiftOutlined,
  InfoCircleOutlined,
  MailOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import { authApi } from '@/lib/api';
import type {
  EmailStatusResponse,
  AnonymousRedeemRequest,
} from '@/types';

const { Title, Text, Paragraph, Link: TextLink } = Typography;

type ViewState =
  | 'initial-loading'
  | 'missing-installation'
  | 'email-unverified'
  | 'email-pending'
  | 'email-verified'
  | 'error';

interface EmailFormValues {
  email: string;
}

interface RedeemFormValues {
  code: string;
}

const PURCHASE_URL =
  process.env.NEXT_PUBLIC_PURCHASE_URL || 'https://mysixth.example.com/purchase';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<PageSuspenseFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const installationId = useMemo(() => {
    const raw = searchParams.get('installation_id') || searchParams.get('installationId');
    return raw?.trim() || '';
  }, [searchParams]);

  const [viewState, setViewState] = useState<ViewState>('initial-loading');
  const [emailStatus, setEmailStatus] = useState<EmailStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [emailForm] = Form.useForm<EmailFormValues>();
  const [redeemForm] = Form.useForm<RedeemFormValues>();
  const { message } = App.useApp();

  // Countdown for resend button
  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const refreshStatus = useCallback(async () => {
    if (!installationId) {
      setViewState('missing-installation');
      return;
    }
    try {
      setViewState('initial-loading');
      setStatusError(null);
      const response = await authApi.getEmailStatus(installationId);
      if (!response.success) {
        throw new Error(response.message || '未能获取邮箱验证状态');
      }
      setEmailStatus(response);
      if (response.email) {
        emailForm.setFieldsValue({ email: response.email });
      }
      setViewState(response.email_verified ? 'email-verified' : 'email-unverified');
    } catch (error) {
      const messageText = error instanceof Error ? error.message : '无法获取邮箱状态';
      setStatusError(messageText);
      setViewState('error');
    }
  }, [emailForm, installationId]);

  useEffect(() => {
    if (!installationId) {
      setViewState('missing-installation');
      return;
    }
    refreshStatus();
  }, [installationId, refreshStatus]);

  const handleSendVerification = async (values: EmailFormValues) => {
    if (!installationId) {
      message.error('缺少用户安装ID，无法发送验证邮件');
      return;
    }
    setEmailSending(true);
    try {
      await authApi.sendVerificationEmail(installationId, values.email);
      setEmailStatus((prev) => ({
        success: true,
        installation_id: installationId,
        email: values.email,
        email_verified: false,
      }));
      message.success('验证邮件已发送，请前往邮箱完成验证');
      setResendCooldown(60);
      setViewState('email-pending');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '发送验证邮件失败');
    } finally {
      setEmailSending(false);
    }
  };

  const handleRedeem = async (values: RedeemFormValues) => {
    if (!installationId) {
      message.error('缺少用户安装ID，无法兑换积分');
      return;
    }
    setRedeemLoading(true);
    const payload: AnonymousRedeemRequest = {
      installation_id: installationId,
      code: values.code.trim().toUpperCase(),
    };
    try {
      const response = await authApi.redeemWithCode(payload);
      if (!response.success) {
        throw new Error(response.message || '兑换失败，请检查兑换码');
      }
      message.success(
        `兑换成功！本次获得 ${response.credits} 积分，当前余额 ${response.balance}。`
      );
      redeemForm.resetFields();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '兑换失败，请稍后重试');
    } finally {
      setRedeemLoading(false);
    }
  };

  const renderContent = () => {
    if (viewState === 'initial-loading') {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
          }}
        >
          <Spin size="large" />
        </div>
      );
    }

    if (viewState === 'missing-installation') {
      return (
        <Card
          style={{
            borderRadius: 16,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            maxWidth: 480,
          }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Space direction="vertical" size={8}>
              <Title level={3} style={{ margin: 0 }}>
                缺少安装标识
              </Title>
              <Text type="secondary">
                请通过应用内的“邮箱验证”入口打开本页面，我们会自动带上安装标识。
              </Text>
            </Space>
            <Alert
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              message="如果问题仍然存在，请联系客服支持。"
            />
          </Space>
        </Card>
      );
    }

    if (viewState === 'error') {
      return (
        <Card
          style={{
            borderRadius: 16,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            maxWidth: 520,
          }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Alert
              type="error"
              showIcon
              message="无法获取邮箱状态"
              description={statusError || '请稍后重试或联系客服支持'}
            />
            <Button icon={<ReloadOutlined />} type="primary" onClick={refreshStatus}>
              重新获取状态
            </Button>
          </Space>
        </Card>
      );
    }

    if (viewState === 'email-unverified' || viewState === 'email-pending') {
      return (
        <Card
          style={{
            borderRadius: 16,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            maxWidth: 520,
          }}
          styles={{ body: { padding: '36px 32px' } }}
        >
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Space direction="vertical" size={8} style={{ textAlign: 'center', width: '100%' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#6B46C1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  color: '#fff',
                  fontSize: 28,
                }}
              >
                <MailOutlined />
              </div>
              <Title level={3} style={{ marginBottom: 0 }}>
                验证你的邮箱
              </Title>
              <Text type="secondary">
                完成邮箱验证即可保障占卜记录安全，并解锁积分兑换功能。
              </Text>
            </Space>
            <Form<EmailFormValues>
              layout="vertical"
              form={emailForm}
              requiredMark={false}
              onFinish={handleSendVerification}
            >
              <Form.Item
                label="邮箱地址"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱地址' },
                  { type: 'email', message: '请输入正确的邮箱格式' },
                ]}
              >
                <Input
                  placeholder="example@example.com"
                  size="large"
                  style={{ borderRadius: 8 }}
                  disabled={emailSending}
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={emailSending}
                  block
                  disabled={emailSending || (viewState === 'email-pending' && resendCooldown > 0)}
                  style={{
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #6B46C1, #7C3AED)',
                    border: 'none',
                  }}
                >
                  {viewState === 'email-pending' ? '重新发送验证邮件' : '发送验证邮件'}
                  {resendCooldown > 0 ? ` (${resendCooldown}s)` : ''}
                </Button>
              </Form.Item>
            </Form>

            {viewState === 'email-pending' ? (
              <Alert
                type="success"
                showIcon
                icon={<SafetyCertificateOutlined />}
                message="验证邮件已发送"
                description={
                  <Space direction="vertical" size={4}>
                    <Text>请查收邮箱并点击邮件中的确认链接完成验证。</Text>
                    <Button
                      type="link"
                      icon={<ReloadOutlined />}
                      onClick={refreshStatus}
                      style={{ padding: 0 }}
                    >
                      我已完成验证，刷新状态
                    </Button>
                  </Space>
                }
              />
            ) : (
              <Alert
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
                message="温馨提示"
                description="发送验证邮件后，请在1小时内完成验证链接确认。"
              />
            )}
          </Space>
        </Card>
      );
    }

    // email verified view
    return (
      <Card
        style={{
          borderRadius: 16,
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          maxWidth: 520,
        }}
        styles={{ body: { padding: '36px 32px' } }}
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <Space direction="vertical" size={8} style={{ textAlign: 'center', width: '100%' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                color: '#fff',
                fontSize: 28,
              }}
            >
              <CheckCircleOutlined />
            </div>
            <Title level={3} style={{ marginBottom: 0 }}>
              邮箱已验证
            </Title>
            <Text type="secondary">
              现在可以输入兑换码为账户充值积分，或前往购买新的积分套餐。
            </Text>
          </Space>
          <Form<RedeemFormValues>
            layout="vertical"
            form={redeemForm}
            requiredMark={false}
            onFinish={handleRedeem}
          >
            <Form.Item
              label="兑换码"
              name="code"
              rules={[
                { required: true, message: '请输入兑换码' },
                {
                  pattern: /^[A-Za-z0-9-]{6,32}$/,
                  message: '兑换码格式不正确',
                },
              ]}
            >
              <Input
                placeholder="请输入兑换码"
                size="large"
                style={{ borderRadius: 8, textTransform: 'uppercase' }}
                maxLength={32}
                disabled={redeemLoading}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={redeemLoading}
                block
                icon={<GiftOutlined />}
                style={{
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #6B46C1, #7C3AED)',
                  border: 'none',
                }}
              >
                兑换积分
              </Button>
            </Form.Item>
          </Form>

          <Card
            type="inner"
            style={{ borderRadius: 12, background: '#F8FAFC' }}
            headStyle={{ borderBottom: 'none' }}
            title={
              <Space>
                <ShoppingOutlined />
                没有兑换码？
              </Space>
            }
          >
            <Space direction="vertical" size={8}>
              <Paragraph style={{ margin: 0 }}>
                立即购买积分套餐，丰富你的塔罗占卜体验。
              </Paragraph>
              <Button
                type="default"
                href={PURCHASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                icon={<ShoppingOutlined />}
                style={{
                  borderRadius: 8,
                  width: '100%',
                }}
              >
                前往购买页面
              </Button>
            </Space>
          </Card>

          <Space direction="vertical" size={4} style={{ textAlign: 'center', width: '100%' }}>
            <Paragraph style={{ marginBottom: 0, color: '#64748b' }}>
              如果兑换过程中遇到问题，请联系我们的客服团队。
            </Paragraph>
            <TextLink href="mailto:support@mysixth.app">support@mysixth.app</TextLink>
          </Space>
        </Space>
      </Card>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      {renderContent()}
    </div>
  );
}

function PageSuspenseFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <Spin size="large" />
    </div>
  );
}
