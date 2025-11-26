# 塔罗牌Web管理系统开发文档 (CLAUDE.md)

## 📖 项目简介

**塔罗牌Web管理系统** 是一个基于 Next.js + Ant Design 的现代化管理后台，完全替代原有的 FastAPI Jinja2 模板系统，提供更好的运维与运营体验，并衔接全新的 APK 发布流程与匿名邮箱验证入口。

## 🎯 核心目标

- **功能完整性**: 覆盖仪表板、用户管理、兑换码管理、订单管理、应用发布等后台功能
- **技术现代化**: 从传统模板系统升级到 React + Next.js 15 App Router 架构
- **用户体验**: 提供流畅的 SPA 体验、毛玻璃登录界面与客户端门户
- **交付协作**: 后台可生成 APK 发布信息，前端客户端门户自动跟随更新

## 🛠️ 技术栈

### 前端框架
- **Next.js 15.5.4**: App Router + React 19 + TypeScript
- **Ant Design 6.x**: 企业级 UI 组件库，配套塔罗主题
- **@ant-design/charts**: G2 驱动的数据可视化
- **Tailwind CSS 4**: 渐变背景、毛玻璃及自定义装饰
- **Zustand / SWR**: 预留的状态管理与数据缓存能力

### 开发工具
- **TypeScript 5**: 全量类型标注
- **ESLint + Prettier**: 一致的工程规范
- **Playwright (预留)**: 端到端测试

## 📁 项目结构

```
tarot-admin-web/
├── src/
│   ├── app/                    # Next.js App Router 页面
│   │   ├── page.tsx           # 根路由：按 token 重定向登录/仪表板
│   │   ├── login/             # 登录页（渐变背景 + 毛玻璃卡片）
│   │   ├── dashboard/         # 仪表板
│   │   ├── users/             # 用户管理
│   │   ├── redeem-codes/      # 兑换码管理
│   │   ├── orders/            # 订单管理（占位）
│   │   ├── verify-email/      # 匿名邮箱验证 & 兑换入口
│   │   ├── app-release/       # APK 发布管理
│   │   └── client-portal/     # 安卓客户端下载门户
│   ├── components/            # 布局与通用组件
│   │   └── layout/AdminLayout.tsx
│   ├── lib/                   # API 客户端与业务封装
│   │   ├── api-client.ts
│   │   └── api.ts
│   ├── types/                 # TypeScript 类型定义
│   │   └── index.ts
│   └── styles/                # 主题配置 / 全局样式
│       └── theme.ts
├── public/                    # 静态资源
├── package.json               # 依赖管理
├── next.config.js             # Next.js 配置
└── tsconfig.json              # TypeScript 配置
```

## 🔌 API 集成设计

### 后端兼容性
- 复用 FastAPI 后端的 `/api/v1/*` 与 `/api/v1/admin-*` 路由
- JWT 写入 `localStorage`，由 `apiClient` 统一附加到 `Authorization: Bearer <token>`
- 匿名邮箱相关接口使用安装 ID (`installation_id`) 作为主键
- 支持从浏览器直接发起 `multipart/form-data` 上传 APK

### API 客户端架构
```typescript
// API 客户端 (src/lib/api-client.ts)
class ApiClient {
  // 统一的 axios 封装
  // 自动附带 Authorization 头
  // 支持 blob / formData / JSON
  // 集中处理 401 -> 路由重定向
}

// API 服务层 (src/lib/api.ts)
export const authApi = {
  login,
  getProfile,
  refreshToken,
  logout,
  sendVerificationEmail,
  verifyEmailToken,
  getEmailStatus,
  redeemWithCode,
};
export const usersApi = { getUsers, getUserDetail, adjustCredits, deleteUser, exportUsers };
export const redeemCodesApi = { getRedeemCodes, generateRedeemCodes, updateRedeemCodeStatus, exportRedeemCodes };
export const dashboardApi = { getMetrics, getChartData, getRecentActivities };
export const appReleaseApi = { getLatestRelease, uploadRelease };
```

## 🎨 用户界面设计

### 主题配置
```typescript
export const tarotTheme: ThemeConfig = {
  token: {
    colorPrimary: '#6B46C1',
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F8FAFC',
    fontFamily: 'Inter',
    borderRadius: 8,
  },
  components: {
    Layout: { siderBg: '#1E293B' },
    Menu: { darkItemSelectedBg: '#6B46C1' },
    Table: { headerBg: '#F8FAFC' },
  },
};
```

### 响应式布局
- `<AdminLayout>` 统一处理 Sider/Content/头部
- 手机端自动折叠菜单，表格使用 `scroll` 提升可读性
- 登录页与客户端门户自定义渐变 + 毛玻璃，独立 CSS Modules 控制

## 📊 功能模块详解

### 1. 仪表板 (Dashboard)
`src/app/dashboard/page.tsx`
- 关键指标卡片：总用户、总积分收入、30 天活跃、今日订单
- 临时使用 `usersApi` 采样估算指标，后端提供真实统计前保底展示
- 最近活动表：基于用户数据生成的占位记录，等待 `/admin/dashboard/activities`
- 图表容器预留 @ant-design/charts 接入点

### 2. 用户管理 (Users)
`src/app/users/page.tsx`
- 支持分页、搜索、邮箱状态筛选、注册时间区间
- 用户详情抽屉：展示交易记录、邮箱验证状态
- 积分调整弹窗：正负积分、原因必填
- 导出 CSV：调用 `/api/v1/admin/users/export`

### 3. 兑换码管理 (Redeem Codes)
`src/app/redeem-codes/page.tsx`
- 列表含状态、批次、积分等信息，支持复制兑换码
- 批量生成兑换码：数量/积分/有效天数/批次备注
- 状态管理：启用、禁用、过期、已使用
- 统计卡片 + 进度条实时反映剩余/使用情况
- 导出 CSV：`/api/v1/admin/redeem-codes/export/csv`

### 4. 订单管理 (Orders)
`src/app/orders/page.tsx`
- 当前为占位页面，展示空状态卡片
- 计划纳入 Google Play 订单、兑换码流水整合

### 5. 邮箱验证 (Verify Email)
`src/app/verify-email/page.tsx`
- 查询参数读取 `installation_id`
- 调用匿名邮箱接口查看状态、发送验证邮件、刷新 cooldown
- 邮箱验证成功后开放兑换码充值表单、客服链接

### 6. 应用发布管理 (App Release)
`src/app/app-release/page.tsx`
- 管理员可上传新的 APK（300MB 限制、`.apk` 扩展校验）
- 表单字段：版本号、构建号、发布备注、更新日志 URL
- 读取最新发布信息（版本、构建号、大小、校验值、上传人）
- 上传成功后刷新，自动同步客户端门户的下载链接

### 7. 客户端发布门户 (Client Portal)
`src/app/client-portal/page.tsx`
- 对外提供最新安卓客户端的下载入口
- 渐变背景 + 卡片化 UI，展示发布信息、更新说明、下载按钮
- 失败时显示 Result 信息，可主动刷新

## 🧱 后台 API 设计（v2025.02）

| 模块 | 方法 | 路径 | 说明 | 关键请求体/参数 | 主要响应字段 |
|------|------|------|------|----------------|--------------|
| 认证 | `POST` | `/api/v1/admin-api/login` | 管理员登录 | `{ username, password }` | `{ access_token, expires_in, username }` |
| 认证 | `GET` | `/api/v1/admin-api/profile` | 获取当前管理员信息 | Header: `Authorization` | `{ username, role, authenticated }` |
| 认证 | `POST` | `/api/v1/admin-api/refresh` | 刷新 JWT | Header: 旧 token | `{ access_token, expires_in }` |
| 认证 | `POST` | `/api/v1/admin-api/logout` | 注销、清理服务端 session | Header: token | `{ success }` |
| 仪表板 | `GET` | `/api/v1/admin/dashboard/metrics` *(规划)* | 返回总用户、收入、活跃、订单等核心指标 | Query: `range` | `{ total_users, total_credits_sold, ... }` |
| 仪表板 | `GET` | `/api/v1/admin/dashboard/activities` *(规划)* | 最近活动列表 | `page,size,type` | `[{ id, type, installation_id, credits, created_at }]` |
| 用户 | `GET` | `/api/v1/admin/users` | 用户列表 + 筛选 | `page,size,installation_id,email,email_status,min_credits,date_range` | `{ users, total }` |
| 用户 | `GET` | `/api/v1/admin/users/{installation_id}` | 用户详情 | Path: 安装 ID | `{ user, recent_transactions }` |
| 用户 | `POST` | `/api/v1/admin/users/adjust-credits` | 调整积分 | `{ installation_id, credits, reason }` | `{ balance, transaction_id }` |
| 用户 | `DELETE` | `/api/v1/admin/users/{installation_id}` | 删除用户 | Path: 安装 ID | `{ success }` |
| 用户 | `GET` | `/api/v1/admin/users/export` | 导出 CSV | 同列表参数 | `text/csv` |
| 兑换码 | `GET` | `/api/v1/admin/redeem-codes` | 列表 | `page,size,status,batch_id,code` | `{ redeem_codes, total, stats }` |
| 兑换码 | `POST` | `/api/v1/admin/redeem-codes/generate` | 批量生成 | `{ count, credits, expires_days, batch_name }` | `{ count, batch_name }` |
| 兑换码 | `PUT` | `/api/v1/admin/redeem-codes/{id}` | 更新状态/备注 | `{ status, reason }` | `{ success }` |
| 兑换码 | `GET` | `/api/v1/admin/redeem-codes/export/csv` | 导出 CSV | 与列表相同 | `text/csv` |
| 邮箱 | `POST` | `/api/v1/auth/email/send-verification` | 匿名邮箱验证邮件 | `{ user_id, email }` | `{ success, message }` |
| 邮箱 | `POST` | `/api/v1/auth/email/verify` | 校验 token | `{ token }` | `{ success, installation_id }` |
| 邮箱 | `GET` | `/api/v1/auth/email/status` | 查询状态 | `installation_id` | `{ email, email_verified, email_verified_at }` |
| 匿名兑换 | `POST` | `/api/v1/payments/redeem` | 安装 ID + 兑换码充值 | `{ installation_id, code }` | `{ credits, balance, transaction_id }` |
| 应用发布 | `GET` | `/api/v1/admin/app-release/latest` | 最新 APK 信息 | - | `{ version, build_number, download_url, release_notes, file_size, checksum }` |
| 应用发布 | `POST` | `/api/v1/admin/app-release` | 上传 APK | `multipart/form-data`：`apk_file`/`file`, `version`, `build_number`, `release_notes`, `notes_url` | `{ success, release }` |
| 订单 *(规划)* | `GET` | `/api/v1/admin/orders` | 支付记录/兑换记录列表 | `page,size,status,channel,date_range` | `{ orders, total }` |
| 订单 *(规划)* | `GET` | `/api/v1/admin/orders/{id}` | 订单详情 | Path: 订单 ID | `{ order, items, timeline }` |

> 审查重点：所有 `/admin/*` 路由需校验管理员角色；匿名接口应限制速率并记录 IP；文件上传接口需校验扩展名、大小与内容安全。

## 🔐 认证与安全

1. 登录页输入用户名/密码 -> `/api/v1/admin-api/login`
2. token 存储在 `localStorage`，`apiClient` 自动注入 `Authorization`
3. `apiClient` 捕获 401，清理 token 并跳转 `/login`
4. 后端支持刷新接口 `/api/v1/admin-api/refresh`
5. 匿名邮箱接口限制速率（前端按钮 60s cooldown）

## 🚀 部署与运维

开发：`npm run dev`。
生产：`npm run build && npm start` 或配合 Docker / Vercel。
环境变量：
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
NEXT_PUBLIC_APP_NAME=塔罗牌应用管理后台
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## 🧪 测试策略

- 单元：Jest + React Testing Library（组件与 hooks）
- 集成：模拟 API 响应，覆盖表单链路
- E2E（计划）：Playwright 跨浏览器脚本
- 可用性：Lighthouse / Web Vitals

## 📈 性能优化

- Antd 组件懒加载 + Next.js 代码分割
- 静态资源走 Next Image & CDN（预留）
- 表格数据分页 + 虚拟滚动预研

## 🔄 与原系统对比

| 方面 | 原系统 (FastAPI + Jinja2) | 新系统 (Next.js + Ant Design) |
|------|---------------------------|-------------------------------|
| 前端架构 | 服务器渲染模板 | React SPA + App Router |
| 数据交互 | 页面刷新 | SWR/Fetch 实时刷新 |
| UI 体验 | Bootstrap 风格 | 神秘塔罗主题 + 现代动效 |
| APK 发布 | 手动发文件 | 后台上传 + 门户同步 |

## 🔮 未来规划

- [ ] 接入真实仪表板统计接口
- [ ] 完成订单管理全流程
- [ ] 引入 SWR/React Query 做数据缓存
- [ ] 支持多语言、暗色主题、PWA

## 🤝 开发规范

- 严格类型：禁止 `any`
- 组件单一职责、必要时添加注释解释复杂逻辑
- API 错误通过 antd `message` 统一提示
- 表单与网络请求均处理加载、异常与空状态
- 换行符统一使用 LF（Unix），避免 CRLF 触发跨平台噪音 diff

---

*塔罗牌 Web 管理系统 - 现代化后台与客户端门户的一体化方案* 🔮✨
