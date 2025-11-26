# Certbot Asset Layout

This module packages the folders needed when issuing Let's Encrypt certificates for the TarotAI stack via dockerized Certbot.

## 1. 项目简介 | Description
`deploy/certbot/` mirrors the directory tree we mount on the production host: `www/` for ACME HTTP-01 challenges and `conf/` for `/etc/letsencrypt`. Keeping the structure in-repo lets us dry-run renewals locally and ship predictable volume mounts to Docker Compose / server scripts.

## 2. 功能特性 | Features
- 🌐 Challenge web root: `www/.well-known/acme-challenge` syncs with Nginx `location` for HTTP-01 verification.
- 🔐 Certificate store: `conf/` persists `live/`, `archive/`, and renewal configs for Certbot.
- 🧪 Local rehearsal: `request-cert.sh` supports staging ACME endpoints before touching production quotas.
- 🧱 Declarative mounts: Compose file references these paths, ensuring infra parity between dev/stage/prod.

## 3. 技术栈 | Tech Stack
- **Language**: Bash scripting (`request-cert.sh`)
- **Framework**: Certbot CLI + Docker Compose volumes
- **Others**: Let's Encrypt ACME v2, Nginx static challenge serving

## 4. 安装与运行 | Installation & Usage
### 环境要求 | Requirements
- Bash shell
- Docker Compose (或在服务器上直接安装 certbot)
- 已解析到服务器的域名

### 安装步骤 | Setup
```bash
# 1. 在仓库根目录运行 Dry-run
ACME_STAGE=staging ./deploy/certbot/request-cert.sh

# 2. 检查输出目录
ls deploy/certbot/conf/live

# 3. 在生产服务器上运行无 ACME_STAGE 版本以获取正式证书
./deploy/certbot/request-cert.sh
```

- 确保 Nginx 将 `/.well-known/acme-challenge/` 指向 `deploy/certbot/www` 对应的容器路径 `/var/www/certbot`。
- Staging 模式使用 Let's Encrypt 测试 CA，不可用于正式 HTTPS，但能验证流程。
- 证书续期可通过 crontab / systemd timer 触发同一脚本。
