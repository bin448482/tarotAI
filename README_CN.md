# TarotAI

[![GitHub](https://img.shields.io/badge/GitHub-bin448482%2FtarotAI-blue?logo=github)](https://github.com/bin448482/tarotAI)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo)](https://expo.dev/)
[![React%20Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)

TarotAI 是一款跨平台塔罗占卜产品，提供移动端占卜体验、AI 辅助解读、积分制变现以及 Web 管理后台。

本 README 从产品视角撰写：产品做什么、服务谁、体验如何运作、以及实现在哪里。

## 目录

- [从这里开始](#从这里开始)
- [为什么做这个产品](#为什么做这个产品)
- [产品预览](#产品预览)
- [核心用户旅程](#核心用户旅程)
- [产品优势](#产品优势)
- [产品设计详情](#产品设计详情)
- [功能地图](#功能地图)
- [产品模块](#产品模块)
- [仓库布局](#仓库布局)
- [快速开始](#快速开始)
- [API 说明](#api-说明)
- [公开分享注意事项](#公开分享注意事项)
- [路线图](#路线图)
- [贡献](#贡献)
- [许可证](#许可证)

## 从这里开始

如果你想在阅读代码之前先了解产品，建议按以下顺序阅读：

1. 查看[产品预览](#产品预览)中的截图。
2. 阅读[核心用户旅程](#核心用户旅程)，了解主要用户流程。
3. 阅读[功能地图](#功能地图)，了解已支持的功能。
4. 阅读[产品设计详情](public_docs/product-design_CN.md)，了解离线/基础解读、AI 解读、历史记录、卡牌图鉴、多语言支持、积分体系、匿名身份以及管理运营背后的产品逻辑。
5. 当你准备好本地运行项目时，再使用[快速开始](#快速开始)。
6. 面向公开的产品与代理文档，请参见 [`public_docs/`](public_docs/)。

## 为什么做这个产品

市面上的塔罗应用往往分化为两种薄弱的体验：简单的卡牌查询工具缺乏引导，而 AI 聊天产品又没有结构化的塔罗流程。TarotAI 将两者结合：

- 为普通用户提供有引导的移动端占卜旅程；
- 为自学者提供完整的塔罗卡牌图鉴；
- 为个性化问题提供 AI 生成的解读；
- 通过积分、兑换码和购买渠道实现变现；
- 提供 Web 管理后台用于用户、积分、订单和运营管理。

产品目标很简单：帮助用户提出问题、抽牌、获得清晰的解读，并保留可回看的历史记录。

## 产品预览

| 首页 | 抽牌 | AI 解读 |
| --- | --- | --- |
| <img src="pics/home.jpg" width="220" alt="TarotAI 移动端首页" /> | <img src="pics/draw-cards.jpg" width="220" alt="TarotAI 抽牌界面" /> | <img src="pics/ai-reading.jpg" width="220" alt="TarotAI AI 解读结果" /> |

| 卡牌图鉴 | 积分与系统说明 |
| --- | --- |
| <img src="pics/card-library.jpg" width="220" alt="TarotAI 卡牌图鉴" /> | <img src="pics/credits-system.jpg" width="220" alt="TarotAI 积分与系统说明" /> |

## 核心用户旅程

1. **进入应用**  
   用户来到神秘塔罗风格的首页，清晰的入口包括：开始占卜、占卜历史、卡牌指南和系统说明。

2. **选择占卜路径**  
   占卜流程引导用户完成四步体验：选择模式、描述意图、抽牌、查看解读。

3. **抽牌**  
   用户抽取塔罗牌并将其放入牌阵中。应用支持卡牌正逆位以及基于位置的含义解读。

4. **阅读结果**  
   结果结合了基础塔罗牌意和可选的 AI 详细解读。AI 解读旨在回答用户的具体问题，而非仅仅解释通用的卡牌含义。

5. **保留或继续**  
   用户可以回看占卜历史、浏览塔罗卡牌图鉴，或管理用于未来 AI 解读的积分。

## 产品优势

| 优势 | 产品竞争力 |
| --- | --- |
| 离线优先的价值 | `tarot-ai-generator` 预先生成丰富的卡牌与维度解读内容，用户无需付费、注册、后端可用或实时 AI 即可完成完整的基础占卜。 |
| 结构化的塔罗仪式 | AI 增强了熟悉的塔罗流程，而非将产品变成通用聊天机器人。 |
| 双层解读体系 | 基础解读建立信任；AI 解读提供高级个性化服务。 |
| 基于维度的提示 | 每张卡牌都有明确的分析角色，使解读更加连贯，减少泛泛而谈。 |
| 本地内容 + 实时 AI | 生成器创建可审查的捆绑塔罗内容；实时 AI 仅在需要时添加针对具体问题的深度。 |
| 历史记录与卡牌图鉴 | 过往占卜提高留存率；卡牌详情增强学习价值和信任度。 |
| 后端支付管控 | 后端验证 Google Play 购买、处理兑换码、更新余额、记录订单/交易，而非信任客户端。 |
| 积分 + 兑换码 | 变现既支持应用商店购买，也支持备用充值路径。 |
| 匿名身份 + 管理工具 | 用户快速上手，运营人员仍可管理积分、订单、兑换码活动和客服工单。 |

## 产品设计详情

更深入的产品说明请参见 [`public_docs/product-design_CN.md`](public_docs/product-design_CN.md)。该文档涵盖了 TarotAI 包含离线/基础解读、AI 解读、占卜历史、完整卡牌图鉴、多语言支持、积分体系、匿名身份以及管理运营背后的产品原因。

## 功能地图

| 功能领域 | 用户价值 | 状态 |
| --- | --- | --- |
| 匿名访问 | 用户无需注册即可开始使用。 | 已实现 |
| 引导式占卜流程 | 用户始终知道下一步该做什么。 | 已实现 |
| 塔罗卡牌图鉴 | 用户可独立学习卡牌含义。 | 已实现 |
| 基础解读 | 用户即使不使用付费 AI 也能获得价值。 | 已实现 |
| AI 解读 | 用户获得个性化的多维度解读。 | 已实现 |
| 占卜历史 | 用户可回看过往占卜记录。 | 已实现 |
| 积分体系 | AI 使用可被控制和变现。 | 已实现 |
| 兑换码 | 运营人员可在不依赖应用商店购买的情况下发放积分。 | 已实现 |
| Google Play 购买通道 | 支持设备的 Android 变现路径。 | 开发中 |
| 管理仪表板 | 运营人员可管理用户、积分、兑换码、订单和指标。 | 已实现 |
| 本地占卜历史 | 用户可在设备上回看已完成的占卜。 | 已实现 |
| 跨设备历史同步 | 更好的跨设备和重装场景的连续性。 | 计划中 |

## 产品模块

### 移动端应用

移动端应用是面向用户的产品。它专注于情感清晰、简洁导航和完整的占卜流程。

主要体验：

- 神秘塔罗风格首页；
- 四步塔罗占卜流程；
- 抽牌交互；
- 解读结果页面；
- 历史记录列表；
- 78 张塔罗卡牌图鉴；
- 积分、兑换与系统说明。

### 后端服务

后端是 AI 解读的支付和控制层面。它支持匿名身份、余额检查、积分扣减、Google Play 购买验证、兑换码充值、订单记录、交易历史、管理员调整和运营仪表板。用户以稳定的匿名安装标识为代表，当购买验证提供邮箱时可选绑定邮箱。

### Web 管理后台

管理后台用于运营和产品管理。支持用户管理、积分调整、兑换码管理、订单查看、仪表板指标和系统监控。

### AI 内容生成器

生成器是用于生产和维护塔罗解读素材的内部内容工具。它有助于保持静态解读内容的结构化和可复用性。

## 仓库布局

```text
.
├── my-tarot-app/        # Expo React Native 移动端应用
├── tarot-backend/       # FastAPI 后端服务
├── tarot-admin-web/     # Next.js 管理后台
├── tarot-ai-generator/  # Python AI 内容生成工具
├── deploy/              # nginx 与部署资源
├── pics/                # 本 README 使用的产品截图
└── public_docs/         # 公开文档（中英文），含 product-design_CN.md
```

## 快速开始

### Docker

```bash
git clone https://github.com/bin448482/tarotAI.git
cd tarotAI

cp tarot-backend/.env.example tarot-backend/.env
# 生产环境使用前请编辑 tarot-backend/.env。

docker compose up -d --build
```

默认本地端点：

- 管理后台：`http://localhost/`
- 后端健康检查：`http://localhost:8001/health`
- 后端 Swagger 文档：`http://localhost:8001/docs`

### 本地开发

后端：

```bash
cd tarot-backend
python -m venv .venv
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

管理后台：

```bash
cd tarot-admin-web
npm ci
npm run dev
```

移动端应用：

```bash
cd my-tarot-app
npm ci
EXPO_PUBLIC_API_BASE_URL=http://<YOUR_LAN_IP>:8000 npx expo start -c
```

## API 说明

核心产品 API：

| 方法 | 路径 | 产品用途 |
| --- | --- | --- |
| `POST` | `/api/v1/users/register` | 创建匿名用户身份。 |
| `GET` | `/api/v1/cards` | 加载塔罗卡牌数据。 |
| `GET` | `/api/v1/spreads` | 加载可用牌阵。 |
| `POST` | `/api/v1/readings/analyze` | 分析用户意图并推荐解读维度。 |
| `POST` | `/api/v1/readings/generate` | 生成个性化塔罗解读。 |
| `POST` | `/api/v1/payments/google/verify` | 验证 Google Play 购买并为用户充值积分。 |

## 公开分享注意事项

本仓库预期可作为公开源代码分享。发布新的公开版本前，请勿包含：

- `.env` 文件或真实 API 密钥；
- 生产数据库；
- 私有部署凭据；
- Google 服务账号私钥；
- keystore、证书或签名密钥；
- 私有日志、本地调试包或机器特定配置。

请使用示例配置文件作为文档说明，将真实生产数据保留在仓库之外。

## 路线图

近期产品工作：

- 完成 Google Play 购买验证并打磨用户端购买体验；
- 改进离线历史记录和同步行为；
- 优化占卜历史回顾体验；
- 增加更多运营指标：转化率、积分使用情况、AI 解读成功率；
- 准备生产部署文档。

## 贡献

贡献应保持产品体验和公开分享边界。使用安全的示例数据，保持截图和文档通用，避免提交凭据或私有部署材料。

## 许可证

当前未包含许可证文件。在将此项目作为开源项目发布或分发之前，请添加许可证。
