'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // 确保在客户端执行
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('admin_token');
        if (token) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
      } catch (error) {
        // 如果出错，默认跳转到登录页
        router.replace('/login');
      } finally {
        setChecking(false);
      }
    };

    // 确保DOM加载完成后再执行
    if (typeof window !== 'undefined') {
      checkAuth();
    }
  }, [router]);

  if (checking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return null;
}
