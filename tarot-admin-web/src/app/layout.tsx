'use client';

import React from 'react';
import { ConfigProvider, App } from 'antd';
import { Inter } from 'next/font/google';
import { tarotTheme } from '@/styles/theme';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <title>塔罗牌应用管理后台</title>
        <meta name="description" content="塔罗牌应用管理后台系统" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <ConfigProvider theme={tarotTheme}>
          <App>
            {children}
          </App>
        </ConfigProvider>
      </body>
    </html>
  );
}
