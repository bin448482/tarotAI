'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, theme, Typography, Spin, App } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  GiftOutlined,
  ShoppingCartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  SettingOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { MenuProps } from 'antd';
import { authApi } from '@/lib/api';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [checking, setChecking] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { message } = App.useApp();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 检查认证状态
  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('admin_token');
        if (!token) {
          router.replace('/login');
          return;
        }
        setChecking(false);
      } catch (error) {
        console.error('认证检查失败:', error);
        router.replace('/login');
      }
    };

    if (typeof window !== 'undefined') {
      checkAuth();
    }
  }, [router]);

  // 退出登录处理
  const handleLogout = async () => {
    try {
      await authApi.logout();
      message.success('退出登录成功');
      router.replace('/login');
    } catch (error) {
      console.error('退出登录失败:', error);
      // 即使API调用失败，也要清除本地token并跳转
      localStorage.removeItem('admin_token');
      router.replace('/login');
    }
  };

  // 如果还在检查认证状态，显示加载界面
  if (checking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f5f5f5',
      }}>
        <Spin size="large" />
      </div>
    );
  }


  // 侧边栏菜单配置
  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link href="/dashboard">仪表板</Link>,
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: <Link href="/users">用户管理</Link>,
    },
    {
      key: '/redeem-codes',
      icon: <GiftOutlined />,
      label: <Link href="/redeem-codes">兑换码管理</Link>,
    },
    {
      key: '/orders',
      icon: <ShoppingCartOutlined />,
      label: <Link href="/orders">订单管理</Link>,
    },
    {
      key: '/app-release',
      icon: <CloudUploadOutlined />,
      label: <Link href="/app-release">应用发布</Link>,
    },
  ];

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
        {/* 侧边栏 */}
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          style={{
            background: '#1E293B',
          }}
          theme="dark"
        >
          {/* Logo区域 */}
          <div style={{
            height: 64,
            margin: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            {!collapsed ? (
              <Title level={4} style={{ color: '#ffffff', margin: 0 }}>
                塔罗管理后台
              </Title>
            ) : (
              <div style={{
                width: 32,
                height: 32,
                background: '#6B46C1',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 'bold',
              }}>
                T
              </div>
            )}
          </div>

          {/* 导航菜单 */}
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            style={{
              background: 'transparent',
              border: 'none',
            }}
          />
        </Sider>

        <Layout>
          {/* 头部 */}
          <Header
            style={{
              padding: '0 24px',
              background: colorBgContainer,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            {/* 左侧：折叠按钮 */}
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
              }}
            />

            {/* 右侧：用户信息 */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: 6,
              }}>
                <Avatar
                  size="small"
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#6B46C1' }}
                />
                <span>管理员</span>
              </div>
            </Dropdown>
          </Header>

          {/* 主内容区域 */}
          <Content
            style={{
              margin: '24px',
              padding: 24,
              minHeight: 280,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            {children}
          </Content>
        </Layout>
    </Layout>
  );
};

export default AdminLayout;
