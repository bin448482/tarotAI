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
  Popconfirm,
  Typography,
  Row,
  Col,
  Statistic,
  DatePicker,
  Tooltip,
  Descriptions,
} from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
  EyeOutlined,
  MailOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import AdminLayout from '@/components/layout/AdminLayout';
import { usersApi, authApi } from '@/lib/api';
import type { User, UserFilters, AdjustCreditsRequest } from '@/types';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function UsersPage() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 筛选条件
  const [filters, setFilters] = useState<UserFilters>({
    page: 1,
    size: 20,
  });

  // 模态框状态
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [adjustCreditsVisible, setAdjustCreditsVisible] = useState(false);
  const [emailVerificationVisible, setEmailVerificationVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 表单实例
  const [adjustForm] = Form.useForm();
  const [emailForm] = Form.useForm();

  // 加载用户列表
  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await usersApi.getUsers({
        ...filters,
        page: currentPage,
        size: pageSize,
      });
      setUsers(response.users);
      setTotal(response.total);
    } catch (error) {
      message.error('加载用户列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentPage, pageSize, filters]);

  // 查看用户详情
  const handleViewUser = async (user: User) => {
    try {
      const response = await usersApi.getUserDetail(user.installation_id);
      setSelectedUser(response.user);
      setUserDetailVisible(true);
    } catch (error) {
      message.error('获取用户详情失败');
    }
  };

  // 调整积分
  const handleAdjustCredits = (user: User) => {
    setSelectedUser(user);
    adjustForm.resetFields();
    setAdjustCreditsVisible(true);
  };

  // 提交积分调整
  const handleAdjustSubmit = async (values: Omit<AdjustCreditsRequest, 'installation_id'>) => {
    if (!selectedUser) return;

    try {
      await usersApi.adjustCredits({
        installation_id: selectedUser.installation_id,
        credits: values.credits,
        reason: values.reason,
      });
      message.success('积分调整成功');
      setAdjustCreditsVisible(false);
      loadUsers(); // 重新加载列表
    } catch (error) {
      message.error('积分调整失败');
    }
  };

  // 删除用户
  const handleDeleteUser = async (user: User) => {
    try {
      await usersApi.deleteUser(user.installation_id);
      message.success('用户删除成功');
      loadUsers();
    } catch (error) {
      message.error('用户删除失败');
    }
  };

  // 导出用户数据
  const handleExport = async () => {
    try {
      const blob = await usersApi.exportUsers(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  // 复制用户ID
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    message.success('用户ID已复制');
  };

  // 发送邮箱验证邮件
  const handleEmailVerification = (user: User) => {
    setSelectedUser(user);
    emailForm.resetFields();
    setEmailVerificationVisible(true);
  };

  // 提交邮箱验证
  const handleEmailVerificationSubmit = async (values: { email: string }) => {
    if (!selectedUser) return;

    try {
      await authApi.sendVerificationEmail(selectedUser.installation_id, values.email);
      message.success('验证邮件已发送');
      setEmailVerificationVisible(false);
      loadUsers(); // 重新加载列表
    } catch (error) {
      message.error('发送验证邮件失败');
    }
  };

  // 表格列配置
  const columns: ColumnsType<User> = [
    {
      title: '用户ID',
      dataIndex: 'installation_id',
      key: 'installation_id',
      width: 200,
      render: (id: string) => (
        <Space>
          <Text code style={{ fontSize: 12 }}>
            {id.substring(0, 12)}...
          </Text>
          <Tooltip title="复制完整ID">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyId(id)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '邮箱状态',
      dataIndex: 'email',
      key: 'email',
      width: 150,
      render: (email: string, record: User) => {
        if (!email) {
          return <Tag color="gray">未绑定</Tag>;
        }
        return record.email_verified ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>已验证</Tag>
        ) : (
          <Tag color="orange" icon={<CloseCircleOutlined />}>未验证</Tag>
        );
      },
    },
    {
      title: '当前积分',
      dataIndex: 'credits',
      key: 'credits',
      width: 120,
      render: (credits: number) => (
        <Tag color={credits > 0 ? 'green' : 'red'}>
          {credits}
        </Tag>
      ),
      sorter: (a, b) => a.credits - b.credits,
    },
    {
      title: '累计购买',
      dataIndex: 'total_credits_purchased',
      key: 'total_credits_purchased',
      width: 120,
      render: (total: number) => (
        <Text type="success">{total}</Text>
      ),
    },
    {
      title: '累计消费',
      dataIndex: 'total_credits_consumed',
      key: 'total_credits_consumed',
      width: 120,
      render: (total: number) => (
        <Text type="warning">{total}</Text>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: '最后活跃',
      dataIndex: 'last_active_at',
      key: 'last_active_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewUser(record)}
            />
          </Tooltip>
          <Tooltip title="调整积分">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleAdjustCredits(record)}
            />
          </Tooltip>
          {(!record.email || !record.email_verified) && (
            <Tooltip title="邮箱验证">
              <Button
                type="text"
                size="small"
                icon={<MailOutlined />}
                onClick={() => handleEmailVerification(record)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="确定删除此用户吗？"
            description="删除后将无法恢复，包括所有相关数据"
            onConfirm={() => handleDeleteUser(record)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除用户">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
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
              用户管理
            </Title>
            <Text type="secondary">
              管理所有注册用户和积分
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
                type="primary"
                icon={<ReloadOutlined />}
                onClick={loadUsers}
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
              title="总用户数"
              value={total}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={users.filter(u => new Date(u.last_active_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
              suffix={`/ ${total}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="已验证邮箱"
              value={users.filter(u => u.email_verified).length}
              suffix={`/ ${users.filter(u => u.email).length}`}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="总积分余额"
              value={users.reduce((sum, user) => sum + user.credits, 0)}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选区域 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Search
              placeholder="搜索用户ID"
              allowClear
              onSearch={(value) => setFilters(prev => ({ ...prev, installation_id: value }))}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="邮箱状态"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => setFilters(prev => ({ ...prev, email_status: value }))}
            >
              <Option value="verified">已验证</Option>
              <Option value="unverified">未验证</Option>
              <Option value="none">未绑定</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <InputNumber
              placeholder="最低积分"
              style={{ width: '100%' }}
              min={0}
              onChange={(value) => setFilters(prev => ({ ...prev, min_credits: value || undefined }))}
            />
          </Col>
          <Col xs={24} sm={4}>
            <Select
              placeholder="注册时间"
              allowClear
              style={{ width: '100%' }}
              onChange={(value) => setFilters(prev => ({ ...prev, date_range: value }))}
            >
              <Option value="today">今天</Option>
              <Option value="week">最近一周</Option>
              <Option value="month">最近一月</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 用户表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="installation_id"
          loading={loading}
          scroll={{ x: 1400 }}
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

      {/* 用户详情模态框 */}
      <Modal
        title="用户详情"
        open={userDetailVisible}
        onCancel={() => setUserDetailVisible(false)}
        footer={null}
        width={800}
      >
        {selectedUser && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="用户ID" span={2}>
              <Text code>{selectedUser.installation_id}</Text>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => handleCopyId(selectedUser.installation_id)}
              />
            </Descriptions.Item>
            <Descriptions.Item label="邮箱地址">
              {selectedUser.email || '未绑定'}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱状态">
              {selectedUser.email ? (
                selectedUser.email_verified ? (
                  <Tag color="green">已验证</Tag>
                ) : (
                  <Tag color="orange">未验证</Tag>
                )
              ) : (
                <Tag color="gray">未绑定</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="当前积分">
              <Text strong style={{ color: selectedUser.credits > 0 ? '#52c41a' : '#ff4d4f' }}>
                {selectedUser.credits}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="累计购买">
              <Text type="success">{selectedUser.total_credits_purchased}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="累计消费">
              <Text type="warning">{selectedUser.total_credits_consumed}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="注册时间">
              {new Date(selectedUser.created_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="最后活跃">
              {new Date(selectedUser.last_active_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="验证时间">
              {selectedUser.email_verified_at ?
                new Date(selectedUser.email_verified_at).toLocaleString('zh-CN') :
                '未验证'
              }
            </Descriptions.Item>
          </Descriptions>
        )}

        {/* 最近交易记录 */}
        {selectedUser?.recent_transactions && selectedUser.recent_transactions.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <Title level={5}>最近交易记录</Title>
            <Table
              size="small"
              dataSource={selectedUser.recent_transactions}
              columns={[
                {
                  title: '类型',
                  dataIndex: 'type',
                  key: 'type',
                  render: (type: string) => {
                    const typeMap: Record<string, { label: string; color: string }> = {
                      purchase: { label: '购买', color: 'green' },
                      consume: { label: '消费', color: 'orange' },
                      adjust: { label: '调整', color: 'blue' },
                      redeem: { label: '兑换', color: 'purple' },
                    };
                    const config = typeMap[type] || { label: type, color: 'default' };
                    return <Tag color={config.color}>{config.label}</Tag>;
                  },
                },
                {
                  title: '来源',
                  dataIndex: 'platform',
                  key: 'platform',
                  render: (platform?: string) => {
                    if (!platform) return '-';
                    const map: Record<string, { label: string; color: string }> = {
                      google_play: { label: 'Google Play', color: 'green' },
                      redeem_code: { label: '兑换码', color: 'purple' },
                      manual: { label: '管理员调整', color: 'blue' },
                    };
                    const conf = map[platform] || { label: platform, color: 'default' };
                    return <Tag color={conf.color}>{conf.label}</Tag>;
                  },
                },
                {
                  title: '积分变化',
                  dataIndex: 'credits',
                  key: 'credits',
                  render: (credits: number) => (
                    <Text style={{ color: credits > 0 ? '#52c41a' : '#ff4d4f' }}>
                      {credits > 0 ? '+' : ''}{credits}
                    </Text>
                  ),
                },
                {
                  title: '余额',
                  dataIndex: 'balance_after',
                  key: 'balance_after',
                },
                {
                  title: '说明',
                  dataIndex: 'description',
                  key: 'description',
                  render: (desc: string | undefined, record) => (
                    <Space direction="vertical" size={2}>
                      <span>{desc || '-'}</span>
                      {record.order_id && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          订单号：{record.order_id}
                        </Text>
                      )}
                    </Space>
                  ),
                },
                {
                  title: '时间',
                  dataIndex: 'created_at',
                  key: 'created_at',
                  render: (date: string) => new Date(date).toLocaleString('zh-CN'),
                },
              ]}
              pagination={false}
              rowKey={(record, index) => `transaction-${index}-${record.credits}-${record.created_at}`}
            />
          </div>
        )}
      </Modal>

      {/* 调整积分模态框 */}
      <Modal
        title="调整用户积分"
        open={adjustCreditsVisible}
        onCancel={() => setAdjustCreditsVisible(false)}
        footer={null}
      >
        <Form
          form={adjustForm}
          layout="vertical"
          onFinish={handleAdjustSubmit}
        >
          <Form.Item label="用户信息">
            <Card size="small" style={{ background: '#f5f5f5' }}>
              <Text strong>用户ID：</Text>
              <Text code>{selectedUser?.installation_id}</Text>
              <br />
              <Text strong>当前积分：</Text>
              <Text style={{ color: (selectedUser?.credits || 0) > 0 ? '#52c41a' : '#ff4d4f' }}>
                {selectedUser?.credits || 0}
              </Text>
            </Card>
          </Form.Item>

          <Form.Item
            name="credits"
            label="积分变化"
            rules={[
              { required: true, message: '请输入积分变化' },
              { type: 'integer', message: '积分必须是整数' },
            ]}
            extra="正数为增加积分，负数为扣减积分"
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="请输入积分变化"
              formatter={value => value ? (Number(value) > 0 ? `+${value}` : `${value}`) : ''}
              parser={value => value?.replace(/\+/, '') || ''}
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="调整原因"
            rules={[{ required: true, message: '请输入调整原因' }]}
          >
            <Input.TextArea
              placeholder="请详细说明积分调整的原因"
              rows={3}
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setAdjustCreditsVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                确认调整
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 邮箱验证模态框 */}
      <Modal
        title="发送邮箱验证"
        open={emailVerificationVisible}
        onCancel={() => setEmailVerificationVisible(false)}
        footer={null}
      >
        <Form
          form={emailForm}
          layout="vertical"
          onFinish={handleEmailVerificationSubmit}
        >
          <Form.Item label="用户信息">
            <Card size="small" style={{ background: '#f5f5f5' }}>
              <Text strong>用户ID：</Text>
              <Text code>{selectedUser?.installation_id}</Text>
              <br />
              <Text strong>当前邮箱状态：</Text>
              {selectedUser?.email ? (
                selectedUser.email_verified ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>已验证</Tag>
                ) : (
                  <Tag color="orange" icon={<CloseCircleOutlined />}>未验证</Tag>
                )
              ) : (
                <Tag color="gray">未绑定</Tag>
              )}
            </Card>
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱地址"
            rules={[
              { required: true, message: '请输入邮箱地址' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
            initialValue={selectedUser?.email || ''}
          >
            <Input
              placeholder="请输入要验证的邮箱地址"
              prefix={<MailOutlined />}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setEmailVerificationVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" icon={<MailOutlined />}>
                发送验证邮件
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </AdminLayout>
  );
}
