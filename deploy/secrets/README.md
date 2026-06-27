# Deploy Secrets Vault

Store sensitive deployment credentials for TarotAI in this folder without checking real files into git.

## 1. 项目简介 | Description
`deploy/secrets/` 用于托管 Google Play Service Account JSON 及后续扩展的证书占位文件。仓库仅保留示例模板，真实密钥需由运维手动下发，并在 CICD 或本地构建前复制到此目录。

## 2. 功能特性 | Features
- 🔐 明确的存放路径：`google-service-account.json`（真实凭证）与 `google-service-account.example.json`（模板）。
- 🧾 Schema 模板：示例文件帮助开发者了解所需字段，避免格式错误。
- 🚫 Git 忽略：`.gitignore` 默认排除此目录下的真实密钥，降低泄露风险。

## 3. 技术栈 | Tech Stack
- **Artifacts**: Google Play Service Account JSON
- **Security**: Git ignore + least-privilege service accounts
- **Automation**: Gradle Play Publisher / EAS Build 会读取本目录

## 4. 安装与运行 | Installation & Usage
### 环境要求 | Requirements
- 具有发行权限的 Google Play Console 服务帐号
- 终端访问权限，以便在构建前复制凭证

### 安装步骤 | Setup
```bash
# 1. 由管理员生成 JSON 并安全传输
# 2. 将文件保存为 deploy/secrets/google-service-account.json
# 3. 确认权限：仅授予 build 机器可读访问
# 4. 构建脚本将自动检测该文件
```

- 切勿把真实 JSON 提交到仓库；只提交去敏示例。
- 如果需要多环境凭证，可使用命名约定，如 `google-service-account.staging.json`，并在脚本中引用。
- 定期轮换密钥并更新此目录的文件。
