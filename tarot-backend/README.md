# Tarot Backend

塔罗牌应用后端服务 - 支持匿名用户、LLM解读、支付功能和管理后台

## 📖 项目简介

基于 FastAPI 的塔罗牌应用后端，采用单体架构设计，提供：
- 匿名用户系统和JWT认证
- 智谱AI/OpenAI LLM解读服务
- 支付系统（兑换码 + Google Play）
- 完整的管理后台Portal

## 🏗️ 服务架构

**单端口架构 (端口 8000)**:
```
FastAPI应用
├── /api/v1/*          # 前端App API接口
├── /admin/*           # 管理后台Web界面
├── /static/*          # 静态资源文件
└── /docs              # API文档 (Swagger UI)
```

## 🔧 环境要求

- Python 3.9+
- FastAPI 0.104+
- SQLite数据库
- 智谱AI或OpenAI API密钥

## 🚀 快速启动

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 环境配置
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑.env文件，配置API密钥和管理员账户
```

### 3. 启动服务
```bash
# 启动开发服务器
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# 或使用Python直接启动
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### 4. 访问服务

**用户API接口**:
- API文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health
- 匿名注册: http://localhost:8000/api/v1/auth/anon

**管理后台** (默认账户: admin / admin123):
- 登录页面: http://localhost:8000/admin/login
- 仪表板: http://localhost:8000/admin/dashboard
- 用户管理: http://localhost:8000/admin/users
- 订单管理: http://localhost:8000/admin/orders
- 兑换码管理: http://localhost:8000/admin/redeem-codes
- 财务报表: http://localhost:8000/admin/reports
- 系统监控: http://localhost:8000/admin/monitor

## ⚙️ 配置说明

主要环境变量配置：
```env
# 数据库
DATABASE_URL=sqlite:///./backend_tarot.db

# LLM服务配置
API_PROVIDER=zhipu
ZHIPUAI_API_KEY=your_zhipu_api_key
MODEL_NAME=glm-4-Flash

# 管理员账户
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_SESSION_EXPIRE_HOURS=24
```

## 🧪 测试

```bash
# 运行测试
pytest

# Claude Code环境测试
PYTHONIOENCODING=utf-8 python test_analyze_user_description.py
```

## 📚 功能特性

### 用户API
- 匿名用户注册和JWT认证
- 塔罗牌抽取和解读
- 基础解读 + AI付费解读
- 用户余额和交易记录

### 管理后台
- 现代化Bootstrap界面
- 用户管理和积分调整
- 订单管理和退款处理
- 兑换码批量生成和管理
- 财务报表和数据分析
- 系统监控和错误日志

### 支付系统
- 兑换码兑换系统
- Google Play内购验证
- 积分系统和消费记录
- 多平台支付支持

## 📋 项目状态

✅ **已完成**:
- FastAPI后端架构
- 数据库模型和迁移
- 用户认证系统
- LLM解读服务
- 管理后台模板
- 基础支付API

🔄 **进行中**:
- 管理后台API实现
- Google Play集成
- 系统监控功能

## 📖 详细文档

完整的开发指南和架构说明请参考 `CLAUDE.md`。