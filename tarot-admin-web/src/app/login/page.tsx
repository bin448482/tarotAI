'use client';

import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, Row, Col, App } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import type { AdminLoginRequest } from '@/types';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { message } = App.useApp();

  const onFinish = async (values: AdminLoginRequest) => {
    setLoading(true);
    try {
      await authApi.login(values);
      message.success('登录成功');
      router.push('/dashboard');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <Row justify="center" style={{ width: '100%', maxWidth: 1200 }}>
        <Col xs={24} sm={16} md={12} lg={8} xl={6}>
          <Card
            style={{
              borderRadius: 16,
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
            styles={{ body: { padding: '40px 32px' } }}
          >
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{
                width: 64,
                height: 64,
                background: '#6B46C1',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: 28,
                color: '#ffffff',
                fontWeight: 'bold',
              }}>
                T
              </div>
              <Title level={3} style={{ margin: 0, color: '#1f2937' }}>
                塔罗管理后台
              </Title>
              <Text type="secondary" style={{ fontSize: 14 }}>
                请输入您的管理员账号密码
              </Text>
            </div>

            <Form
              name="login"
              onFinish={onFinish}
              autoComplete="off"
              size="large"
              layout="vertical"
            >
              <Form.Item
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少3个字符' },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="用户名"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6个字符' },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="密码"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  style={{
                    width: '100%',
                    height: 48,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #6B46C1, #7C3AED)',
                    border: 'none',
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                  icon={<LoginOutlined />}
                >
                  {loading ? '登录中...' : '登录'}
                </Button>
              </Form.Item>
            </Form>

            <div style={{
              textAlign: 'center',
              marginTop: 24,
              padding: 16,
              background: '#f8fafc',
              borderRadius: 8,
            }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                默认账号：admin / admin123
              </Text>
              <div style={{ marginTop: 8 }}>
                <Link href="/privacy" style={{ fontSize: 12 }}>
                  隐私权政策
                </Link>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
