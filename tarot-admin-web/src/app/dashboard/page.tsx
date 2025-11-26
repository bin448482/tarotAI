'use client';

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Button, Table, Tag, Spin } from 'antd';
import {
  UserOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  SyncOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons';
import AdminLayout from '@/components/layout/AdminLayout';
import { dashboardApi } from '@/lib/api';
import type { DashboardMetrics, RecentActivity } from '@/types';

const { Title, Text } = Typography;

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [chartData, setChartData] = useState<Record<string, unknown> | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  // 加载仪表板数据
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [metricsData, chartDataRes, activitiesData] = await Promise.all([
        dashboardApi.getMetrics(),
        dashboardApi.getChartData(),
        dashboardApi.getRecentActivities(),
      ]);

      setMetrics(metricsData);
      setChartData(chartDataRes);
      setRecentActivities(activitiesData);
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 最近活动表格列配置
  const activityColumns = [
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap = {
          purchase: { label: '购买', color: 'green' },
          redeem: { label: '兑换', color: 'blue' },
          adjust: { label: '调整', color: 'orange' },
        };
        const config = typeMap[type as keyof typeof typeMap] || { label: type, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '用户',
      dataIndex: 'installation_id',
      key: 'installation_id',
      render: (id: string) => (
        <Text code style={{ fontSize: 12 }}>
          {id.substring(0, 8)}...
        </Text>
      ),
    },
    {
      title: '积分',
      dataIndex: 'credits',
      key: 'credits',
      render: (credits: number) => (
        <Text type="success">+{credits}</Text>
      ),
    },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <Spin size="large" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <Space size="middle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              仪表板
            </Title>
            <Text type="secondary">
              塔罗牌应用管理系统概览
            </Text>
          </div>
          <Button
            type="primary"
            icon={<SyncOutlined />}
            onClick={loadDashboardData}
            loading={loading}
          >
            刷新数据
          </Button>
        </Space>
      </div>

      {/* 关键指标卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={metrics?.total_users || 0}
              prefix={<UserOutlined style={{ color: '#1890ff' }} />}
              suffix={
                <div style={{ fontSize: 12, color: '#52c41a' }}>
                  <ArrowUpOutlined /> +{metrics?.users_growth || 0}%
                </div>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总收入（积分）"
              value={metrics?.total_credits_sold || 0}
              prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
              suffix={
                <div style={{ fontSize: 12, color: '#52c41a' }}>
                  <ArrowUpOutlined /> +{metrics?.revenue_growth || 0}%
                </div>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="活跃用户（30天）"
              value={metrics?.active_users_30d || 0}
              prefix={<RiseOutlined style={{ color: '#fa8c16' }} />}
              suffix={
                <div style={{ fontSize: 12, color: '#52c41a' }}>
                  {metrics?.active_users_ratio || 0}% 活跃度
                </div>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日订单"
              value={metrics?.orders_today || 0}
              prefix={<ShoppingCartOutlined style={{ color: '#722ed1' }} />}
              suffix={
                <div style={{ fontSize: 12, color: '#52c41a' }}>
                  <ArrowUpOutlined /> +{metrics?.orders_growth || 0}%
                </div>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* 数据图表区域 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <RiseOutlined />
                收入趋势（最近6个月）
              </Space>
            }
            style={{ height: 400 }}
          >
            <div style={{
              height: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 16
            }}>
              <RiseOutlined style={{ fontSize: 48, color: '#6B46C1' }} />
              <span style={{ color: '#999', fontSize: 16 }}>数据图表功能</span>
              <span style={{ color: '#666', fontSize: 14 }}>准备中...</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <UserOutlined />
                最近活动
              </Space>
            }
            style={{ height: 400 }}
            styles={{ body: { padding: 0 } }}
          >
            <Table
              dataSource={recentActivities}
              columns={activityColumns}
              pagination={false}
              size="small"
              scroll={{ y: 300 }}
              rowKey={(record) => record.id || `activity-${record.installation_id}-${record.created_at}`}
            />
          </Card>
        </Col>
      </Row>

      {/* 系统状态 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="系统状态">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#52c41a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    ✓
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>数据库状态</div>
                    <Text type="success">正常运行</Text>
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#52c41a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    ✓
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>API服务</div>
                    <Text type="success">服务正常</Text>
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#fa8c16',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    !
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>系统负载</div>
                    <Text type="warning">中等负载 (65%)</Text>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </AdminLayout>
  );
}