'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Modal,
  Form,
  InputNumber,
  message,
  Typography,
  Row,
  Col,
  Statistic,
  Popconfirm,
  Tooltip,
  Descriptions,
  Progress,
} from 'antd';
import {
  GiftOutlined,
  SearchOutlined,
  PlusOutlined,
  ExportOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  CopyOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import AdminLayout from '@/components/layout/AdminLayout';
import { redeemCodesApi } from '@/lib/api';
import type { RedeemCode, RedeemCodeFilters, GenerateRedeemCodesRequest } from '@/types';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

export default function RedeemCodesPage() {
  const [loading, setLoading] = useState(false);
  const [redeemCodes, setRedeemCodes] = useState<RedeemCode[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [stats, setStats] = useState<any>({});

  // 筛选条件
  const [filters, setFilters] = useState<RedeemCodeFilters>({
    page: 1,
    size: 20,
  });

  // 模态框状态
  const [generateVisible, setGenerateVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedCode, setSelectedCode] = useState<RedeemCode | null>(null);

  // 表单实例
  const [generateForm] = Form.useForm();

  // 批次列表
  const [batches, setBatches] = useState<string[]>([]);

  // 加载兑换码列表
  const loadRedeemCodes = async () => {
    setLoading(true);
    try {
      const response = await redeemCodesApi.getRedeemCodes({
        ...filters,
        page: currentPage,
        size: pageSize,
      });
      setRedeemCodes(response.redeem_codes);
      setTotal(response.total);
      setStats(response.stats);
    } catch (error) {
      message.error('加载失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 加载批次列表
  const loadBatches = async () => {
    try {
      const response = await redeemCodesApi.getBatches();
      setBatches(response.batches);
    } catch (error) {
      console.error('加载批次列表失败:', error);
    }
  };

  useEffect(() => {
    loadRedeemCodes();
  }, [currentPage, pageSize, filters]);

  useEffect(() => {
    loadBatches();
  }, []);

  // 生成兑换码
  const handleGenerate = async (values: GenerateRedeemCodesRequest) => {
    try {
      const response = await redeemCodesApi.generateRedeemCodes(values);
      message.success(`成功生成 ${response.count} 个兑换码`);
      setGenerateVisible(false);
      generateForm.resetFields();
      loadRedeemCodes();
      loadBatches(); // 刷新批次列表
    } catch (error) {
      message.error('生成失败');
    }
  };

  // 查看详情
  const handleViewDetail = (code: RedeemCode) => {
    setSelectedCode(code);
    setDetailVisible(true);
  };

  // 更新状态
  const handleUpdateStatus = async (code: RedeemCode, status: string) => {
    try {
      await redeemCodesApi.updateRedeemCodeStatus(code.id, status);
      message.success('状态已更新');
      loadRedeemCodes();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 复制兑换码
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    message.success('兑换码已复制');
  };

  // 导出数据
  const handleExport = async () => {
    try {
      const blob = await redeemCodesApi.exportRedeemCodes(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `redeem_codes_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 渲染状态标签
  const renderStatus = (status: string) => {
    const statusMap = {
      active: { label: '可用', color: 'green', icon: <CheckCircleOutlined /> },
      used: { label: '已使用', color: 'blue', icon: <CheckCircleOutlined /> },
      expired: { label: '已过期', color: 'red', icon: <ClockCircleOutlined /> },
      disabled: { label: '已禁用', color: 'gray', icon: <StopOutlined /> },
    };
    const config = statusMap[status as keyof typeof statusMap] || { label: status, color: 'default', icon: null };
    return <Tag color={config.color} icon={config.icon}>{config.label}</Tag>;
  };

  // 表格列配置
  const columns: ColumnsType<RedeemCode> = [
    {
      title: '兑换码',
      dataIndex: 'code',
      key: 'code',
      width: 200,
      render: (code: string) => (
        <Space>
          <Text code style={{ fontSize: 12, fontWeight: 'bold' }}>
            {code}
          </Text>
          <Tooltip title="复制兑换码">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyCode(code)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '积分值',
      dataIndex: 'credits',
      key: 'credits',
      width: 100,
      render: (credits: number) => (
        <Tag color="gold">{credits}</Tag>
      ),
      sorter: (a, b) => a.credits - b.credits,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: renderStatus,
      filters: [
        { text: '可用', value: 'active' },
        { text: '已使用', value: 'used' },
        { text: '已过期', value: 'expired' },
        { text: '已禁用', value: 'disabled' },
      ],
    },
    {
      title: '使用者',
      dataIndex: 'used_by_user',
      key: 'used_by_user',
      width: 150,
      render: (user: any) => {
        if (!user) return <Text type="secondary">未使用</Text>;
        return (
          <Text code style={{ fontSize: 12 }}>
            {user.installation_id.substring(0, 8)}...
          </Text>
        );
      },
    },
    {
      title: '使用时间',
      dataIndex: 'used_at',
      key: 'used_at',
      width: 180,
      render: (date: string | null) => {
        if (!date) return <Text type="secondary">未使用</Text>;
        return new Date(date).toLocaleString('zh-CN');
      },
    },
    {
      title: '过期时间',
      dataIndex: 'expires_at',
      key: 'expires_at',
      width: 180,
      render: (date: string | null) => {
        if (!date) return <Text type="secondary">永不过期</Text>;
        const expireDate = new Date(date);
        const now = new Date();
        const isExpired = expireDate < now;
        return (
          <Text type={isExpired ? 'danger' : undefined}>
            {expireDate.toLocaleString('zh-CN')}
          </Text>
        );
      },
    },
    {
      title: '批次ID',
      dataIndex: 'batch_id',
      key: 'batch_id',
      width: 150,
      render: (batchId: string | null) => {
        if (!batchId) return <Text type="secondary">无</Text>;
        return (
          <Text code style={{ fontSize: 11 }}>
            {batchId.length > 15 ? `${batchId.substring(0, 15)}...` : batchId}
          </Text>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>

          {record.status === 'active' && (
            <Popconfirm
              title="确定禁用此兑换码吗？"
              onConfirm={() => handleUpdateStatus(record, 'disabled')}
              okText="确定"
              cancelText="取消"
            >
              <Tooltip title="禁用">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<StopOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}

          {record.status === 'disabled' && (
            <Tooltip title="启用">
              <Button
                type="text"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleUpdateStatus(record, 'active')}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              兑换码管理
            </Title>
            <Text type="secondary">
              管理所有兑换码和批次
            </Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ExportOutlined />}
                onClick={handleExport}
              >
                导出数据
              </Button>
              <Button
                icon={<PlusOutlined />}
                type="primary"
                onClick={() => setGenerateVisible(true)}
              >
                生成兑换码
              </Button>
              <Button
                type="default"
                icon={<ReloadOutlined />}
                onClick={loadRedeemCodes}
                loading={loading}
              >
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总兑换码"
              value={stats.total || 0}
              prefix={<GiftOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="可用兑换码"
              value={stats.active || 0}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress
              percent={stats.total ? Math.round((stats.active / stats.total) * 100) : 0}
              showInfo={false}
              strokeColor="#52c41a"
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="已使用"
              value={stats.used || 0}
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress
              percent={stats.total ? Math.round((stats.used / stats.total) * 100) : 0}
              showInfo={false}
              strokeColor="#1890ff"
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="过期/禁用"
              value={(stats.expired || 0) + (stats.disabled || 0)}
              valueStyle={{ color: '#ff4d4f' }}
            />
            <Progress
              percent={stats.total ? Math.round(((stats.expired + stats.disabled) / stats.total) * 100) : 0}
              showInfo={false}
              strokeColor="#ff4d4f"
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选区域 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Search
              placeholder="搜索兑换码"
              allowClear
              onSearch={(value) => setFilters(prev => ({ ...prev, code: value }))}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <Option value="active">可用</Option>
              <Option value="used">已使用</Option>
              <Option value="expired">已过期</Option>
              <Option value="disabled">已禁用</Option>
            </Select>
          </Col>
          <Col xs={24} sm={10}>
            <Select
              placeholder="选择批次"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => setFilters(prev => ({ ...prev, batch_id: value }))}
              showSearch
              filterOption={(input, option) => {
                const label = option?.label || option?.children;
                return String(label).toLowerCase().indexOf(input.toLowerCase()) >= 0;
              }}
            >
              {batches.map(batch => (
                <Option key={batch} value={batch}>{batch}</Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 兑换码表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={redeemCodes}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1600 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
        />
      </Card>

      {/* 生成兑换码弹窗 */}
      <Modal
        title="生成兑换码"
        open={generateVisible}
        onCancel={() => setGenerateVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={generateForm}
          layout="vertical"
          onFinish={handleGenerate}
          initialValues={{
            expires_days: 365,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="count"
                label="生成数量"
                rules={[
                  { required: true, message: '请输入生成数量' },
                  { type: 'integer', min: 1, max: 1000, message: '数量范围为1-1000个' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="1-1000"
                  min={1}
                  max={1000}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="credits"
                label="积分值"
                rules={[
                  { required: true, message: '请输入积分值' },
                  { type: 'integer', min: 1, message: '积分值必须大于0' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入每个兑换码的积分值"
                  min={1}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="expires_days"
            label="有效期（天）"
            rules={[
              { required: true, message: '请输入有效期' },
              { type: 'integer', min: 1, max: 3650, message: '有效期范围为1-3650天' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="1-3650天"
              min={1}
              max={3650}
            />
          </Form.Item>

          <Form.Item
            name="batch_name"
            label="批次名称"
            extra="可选，用于标识这批兑换码的用途"
          >
            <Input
              placeholder="例如：2024春节活动"
              maxLength={50}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setGenerateVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                生成兑换码
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 兑换码详情弹窗 */}
      <Modal
        title="兑换码详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={700}
      >
        {selectedCode && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="兑换码" span={2}>
              <Space>
                <Text code style={{ fontSize: 14, fontWeight: 'bold' }}>
                  {selectedCode.code}
                </Text>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopyCode(selectedCode.code)}
                />
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="积分值">
              <Tag color="gold" style={{ fontSize: 14 }}>
                {selectedCode.credits}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {renderStatus(selectedCode.status)}
            </Descriptions.Item>
            <Descriptions.Item label="使用者">
              {selectedCode.used_by_user ? (
                <Text code>{selectedCode.used_by_user.installation_id}</Text>
              ) : (
                <Text type="secondary">未使用</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="使用时间">
              {selectedCode.used_at ?
                new Date(selectedCode.used_at).toLocaleString('zh-CN') :
                <Text type="secondary">未使用</Text>
              }
            </Descriptions.Item>
            <Descriptions.Item label="过期时间">
              {selectedCode.expires_at ?
                new Date(selectedCode.expires_at).toLocaleString('zh-CN') :
                <Text type="secondary">永不过期</Text>
              }
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(selectedCode.created_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="批次ID" span={2}>
              {selectedCode.batch_id ? (
                <Text code>{selectedCode.batch_id}</Text>
              ) : (
                <Text type="secondary">无</Text>
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </AdminLayout>
  );
}
