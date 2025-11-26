'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Typography,
  Form,
  Input,
  Select,
  DatePicker,
  Space,
  Button,
  Table,
  Tag,
  message,
  Tooltip,
} from 'antd';
import {
  ShoppingCartOutlined,
  ReloadOutlined,
  SearchOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import AdminLayout from '@/components/layout/AdminLayout';
import { purchasesApi } from '@/lib/api';
import type { Purchase, PurchaseFilters } from '@/types';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const platformColors: Record<string, string> = {
  google_play: 'green',
  redeem_code: 'purple',
  app_store: 'blue',
  manual: 'geekblue',
};

const statusColors: Record<string, string> = {
  completed: 'green',
  pending: 'orange',
  failed: 'red',
  refunded: 'cyan',
};

function formatAmount(amount_cents?: number, currency?: string) {
  if (amount_cents === undefined || amount_cents === null) return '-';
  const unit = currency || 'USD';
  return `${(amount_cents / 100).toFixed(2)} ${unit}`;
}

export default function OrdersPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Purchase[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState<PurchaseFilters>({
    page: 1,
    size: 20,
  });

  const fetchOrders = async (params: PurchaseFilters) => {
    setLoading(true);
    try {
      const res = await purchasesApi.getPurchases(params);
      setOrders(res.purchases);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
      message.error('加载订单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders({
      ...filters,
      page,
      size: pageSize,
    });
  }, [filters, page, pageSize]);

  const handleSearch = () => {
    const values = form.getFieldsValue();
    let date_from: string | undefined;
    let date_to: string | undefined;
    if (values.date_range) {
      date_from = (values.date_range[0] as Dayjs).startOf('day').toISOString();
      date_to = (values.date_range[1] as Dayjs).endOf('day').toISOString();
    }
    setPage(1);
    setFilters({
      ...filters,
      order_id: values.order_id || undefined,
      installation_id: values.installation_id || undefined,
      email: values.email || undefined,
      platform: values.platform || undefined,
      status: values.status || undefined,
      date_from,
      date_to,
    });
  };

  const resetFilters = () => {
    form.resetFields();
    setFilters({ page: 1, size: pageSize });
    setPage(1);
  };

  const columns: ColumnsType<Purchase> = [
    {
      title: '订单号',
      dataIndex: 'order_id',
      render: (id: string) => (
        <Space>
          <Text code>{id}</Text>
          <Tooltip title="复制订单号">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(id);
                message.success('已复制');
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '用户ID',
      dataIndex: 'installation_id',
      render: (id?: string) => id ? <Text code>{id.slice(0, 12)}...</Text> : '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      render: (email?: string) => email || '-',
    },
    {
      title: '渠道',
      dataIndex: 'platform',
      render: (platform: string) => (
        <Tag color={platformColors[platform] || 'default'}>
          {platform === 'google_play' ? 'Google Play' :
            platform === 'redeem_code' ? '兑换码' :
            platform === 'app_store' ? 'App Store' :
            platform === 'manual' ? '管理员调整' : platform}
        </Tag>
      ),
    },
    {
      title: '积分',
      dataIndex: 'credits',
      render: (v: number) => <Text strong>{v}</Text>,
    },
    {
      title: '金额',
      render: (_, record) => formatAmount(record.amount_cents, record.currency),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {status === 'completed' ? '已完成' :
            status === 'pending' ? '待处理' :
            status === 'failed' ? '失败' :
            status === 'refunded' ? '已退款' : status}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '完成时间',
      dataIndex: 'completed_at',
      render: (date?: string | null) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
    },
  ];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          订单管理
        </Title>
        <Text type="secondary">
          管理 Google Play、兑换码等订单并支持筛选审计
        </Text>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSearch}
        >
          <Space size="large" wrap align="end">
            <Form.Item label="订单号" name="order_id">
              <Input placeholder="精确匹配订单号" allowClear />
            </Form.Item>
            <Form.Item label="用户ID" name="installation_id">
              <Input placeholder="模糊查询 installation_id" allowClear />
            </Form.Item>
            <Form.Item label="邮箱" name="email">
              <Input placeholder="邮箱模糊匹配" allowClear />
            </Form.Item>
            <Form.Item label="渠道" name="platform" initialValue="">
              <Select style={{ width: 160 }} allowClear placeholder="全部渠道">
                <Select.Option value="google_play">Google Play</Select.Option>
                <Select.Option value="redeem_code">兑换码</Select.Option>
                <Select.Option value="app_store">App Store</Select.Option>
                <Select.Option value="manual">管理员调整</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="状态" name="status" initialValue="">
              <Select style={{ width: 140 }} allowClear placeholder="全部状态">
                <Select.Option value="completed">已完成</Select.Option>
                <Select.Option value="pending">待处理</Select.Option>
                <Select.Option value="failed">失败</Select.Option>
                <Select.Option value="refunded">已退款</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="时间范围" name="date_range">
              <RangePicker />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                  筛选
                </Button>
                <Button onClick={resetFilters} icon={<ReloadOutlined />}>
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={orders}
          columns={columns}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, s) => {
              setPage(p);
              setPageSize(s);
            },
          }}
          locale={{
            emptyText: (
              <Space direction="vertical" style={{ width: '100%', alignItems: 'center', padding: 24 }}>
                <ShoppingCartOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                <Text type="secondary">暂无订单记录</Text>
              </Space>
            ),
          }}
        />
      </Card>
    </AdminLayout>
  );
}
