# 安全整改 TODO（依据《实施文档》）

## P0｜密钥脱敏 + 环境清理（24 小时内）
- [ ] 移除仓库中所有真实 `.env`/`.env.local` 并提供 `tarot-backend/.env.example`、`release/env/backend.env.example`
- [ ] 将 `tarot-ai-generator/config/settings.yaml`、`translation/translation_config.py` 中的 API key 改为环境变量，新增对应 `.example` 文件
- [ ] 删除 Google Service Account (`deploy/secrets/*.json`、`my-tarot-app-*.json`) 并提供示例模板
- [ ] 删除 `.docs/keystore和key的密码.txt`、`tarot-backend/backend_tarot.db`、`tarot-backend/static/app-releases/*`、`release/*.zip` 等敏感产物
- [ ] 扩充根级 `.gitignore` 及子项目忽略规则，覆盖 `.env*`、`release/**`、`debug/**`、`*.apk`、`*.db`、`deploy/secrets/**`、`tarot-ai-generator/data|output|venv` 等

## P1｜代码库脱敏与历史重写（48 小时内）
- [ ] 使用 `git filter-repo` / BFG 移除历史中的 `*.env`、service account JSON、APK、DB
- [ ] 重建远端仓库并强推，通知协作者重新克隆

## P2｜接口风控与模板化（72 小时内）
- [ ] 在后端 `/auth/anon`、`/api/v1/users/*`、`/api/v1/payments/redeem*` 引入速率限制与设备指纹校验
- [ ] 管理后台登录新增密码哈希、双重认证，以及失败锁定策略
- [ ] 将后端 CORS 改为白名单域名并禁用 `allow_credentials + *`
- [ ] 将 APP release 分发迁移至对象存储或 CI 制品库，清空 `static/app-releases`
- [ ] 在 `README.md`/`CLAUDE.md` 中新增安全发布章节，描述 `.env` 准备与 secret 扫描

## 持续性任务
- [ ] 配置 CI 安全扫描（`gitleaks`, `trufflehog`, `npm audit`, `pip-audit`）
- [ ] 建立 `pre-commit` 钩子阻止 `.env`、`.db`、`sk-` 等提交
- [ ] 发布前执行安全脚本与测试，形成清单
- [ ] 团队 30 分钟分享：密钥管理 + CI 流程
