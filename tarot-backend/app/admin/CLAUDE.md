# 塔罗牌应用 - 管理后台API模块 (CLAUDE.md)

## 📖 模块简介

**管理后台API模块** 提供了完整的管理员API接口，支持用户管理、兑换码管理、系统监控等功能。采用JWT Bearer Token认证，为新的独立管理后台应用 `tarot-admin-web` 提供数据支持。

## 🎯 模块职责

- 提供管理员API接口（Bearer Token认证）
- 用户管理：查询、统计用户信息
- 兑换码管理：创建、查询、统计、批量操作
- 系统监控：API调用统计、性能监控
- 订单管理：支付记录查询和统计

## 🔧 技术架构

### API认证方式
- **认证方式**: JWT Bearer Token
- **Token获取**: `/api/v1/admin-api/login` 端点
- **Token验证**: `get_current_admin` 依赖注入
- **适用场景**: 独立前端应用（tarot-admin-web）

### 路由设计
- **管理员登录**: `/api/v1/admin-api/*` - 认证相关接口
- **用户管理**: `/api/v1/admin/users/*` - 用户管理接口
- **兑换码管理**: `/api/v1/admin/redeem-codes/*` - 兑换码管理接口

## 📁 文件结构

```
app/admin/
├── __init__.py         # 模块初始化
├── CLAUDE.md          # 本文档
└── __pycache__/       # Python缓存文件
```

**注意**: 原有的HTML模板文件和Web路由已被移除，管理后台现在通过独立的 `tarot-admin-web` 项目提供。

## 🚀 核心功能

### 1. 管理员认证
- 登录验证：用户名/密码验证
- JWT Token生成：包含管理员信息
- Token刷新：支持Token续期

### 2. 用户管理
- 用户列表查询：分页、筛选、排序
- 用户详情查看：完整用户信息
- 用户统计：注册数量、活跃度分析

### 3. 兑换码管理
- 批量创建：指定数量、面值、有效期
- 查询统计：使用状态、批次管理
- 批量操作：禁用、清理过期兑换码
- 实时监控：兑换成功率、使用趋势

### 4. 系统监控
- API调用统计：请求数量、响应时间
- 错误监控：异常日志、错误率统计
- 性能监控：数据库查询、系统资源

## 📊 API接口文档

### 管理员认证接口

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| POST | `/api/v1/admin-api/login` | 管理员登录 | ✅ 已实现 |

### 用户管理接口

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/api/v1/admin/users` | 用户列表查询 | ✅ 已实现 |
| GET | `/api/v1/admin/users/{user_id}` | 用户详情查询 | ✅ 已实现 |
| GET | `/api/v1/admin/users/stats` | 用户统计信息 | ✅ 已实现 |

### 兑换码管理接口

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/api/v1/admin/redeem-codes` | 兑换码列表查询 | ✅ 已实现 |
| POST | `/api/v1/admin/redeem-codes/create` | 批量创建兑换码 | ✅ 已实现 |
| GET | `/api/v1/admin/redeem-codes/batch/{batch_id}/stats` | 批次统计信息 | ✅ 已实现 |
| POST | `/api/v1/admin/redeem-codes/disable` | 批量禁用兑换码 | ✅ 已实现 |
| POST | `/api/v1/admin/redeem-codes/cleanup-expired` | 清理过期兑换码 | ✅ 已实现 |

## 🔑 数据模型

### 管理员认证
- **用户名/密码**: 配置在环境变量中
- **JWT Token**: 包含管理员身份信息
- **Token有效期**: 可配置，默认24小时

### 兑换码模型
```python
class RedeemCode:
    code: str           # 16位兑换码
    credit_amount: int  # 积分面值
    batch_id: str       # 批次ID
    is_active: bool     # 激活状态
    used_at: datetime   # 使用时间
    created_at: datetime # 创建时间
    expires_at: datetime # 过期时间
```

## 🛡️ 安全考虑

### API安全
- **JWT认证**: 所有管理接口需要有效Token
- **权限验证**: 管理员身份验证
- **请求限制**: 防止API滥用
- **输入验证**: 严格的参数校验

### 兑换码安全
- **防爆破**: 限制查询频率
- **批次管理**: 隔离不同批次
- **状态控制**: 支持禁用/启用操作
- **审计日志**: 记录关键操作

## 📈 扩展计划

### 短期扩展
- 更详细的统计报表
- 实时监控Dashboard
- 管理员操作日志

### 长期扩展
- 多级管理员权限
- 自定义报表生成
- 自动化运维工具

---

**开发状态**: ✅ 核心功能已完成
**下一步**: 配合 `tarot-admin-web` 前端应用进行集成测试