# TarotAI 部署实施计划报告

> 盘点时间：2026-09-19 17:19（Asia/Shanghai）<br>
> 盘点方式：通过 `deploy/ECS_SSH.md` 中的公钥 SSH 只读检查；本次未修改服务器、数据库、容器或仓库配置。

## 1. 结论摘要

目标 ECS 已有一套正在运行的 TarotAI Docker Compose 部署，公网 HTTPS、门户首页和后端 GET 健康接口均可访问，后端容器状态正常。建议采用“本地/CI 构建与验证、服务器分阶段替换、保留旧版本可回滚”的发布方式，不建议在当前 1.6 GiB 内存的 ECS 上直接进行首次完整构建。

正式实施前必须处理以下事项：

1. **修正 admin 健康检查**：当前健康检查访问 `http://localhost:3000/`，返回 404；实际 `/admin/` 返回 200，容器进程正常但状态为 `unhealthy`。应改为检查 `/admin/`，或新增明确的内部 `/health` 路由，并在发布前验证。
2. **收紧 8000/tcp**：UFW 当前对公网放行 22、80、443、8000；生产架构只需要 80/443，后端容器也没有将 8000 发布到宿主机。确认不需要直连调试后删除 8000 的 IPv4/IPv6 放行规则。
3. **修复服务器敏感文件权限**：服务器上的 `tarot-backend/.env`、`tarot-admin-web/.env.local` 和两个 `cookies.txt` 当前为全用户可读写（`666`）。应移出源码部署目录或删除无用副本，生产环境文件至少设为 `600`，并对可能暴露的凭据执行轮换。
4. **建立证书续期任务**：当前活动证书有效期至 2026-11-18 UTC，暂未临期；证书目录已持久化。仍应在发布后安排 Certbot `renew --dry-run` 和定期任务，避免再次临期。

在上述事项完成前，状态为“可准备、不可直接上线”。

## 2. 已确认的服务器环境

| 项目 | 盘点结果 |
|---|---|
| 操作系统 | Ubuntu 22.04.5 LTS，Linux 5.15，x86-64 |
| 运行时 | Docker 28.5.1，Docker Compose v2.40.0 |
| 资源 | 根分区 40 GiB，已用约 21 GiB，剩余约 17 GiB；内存 1.6 GiB；无 Swap |
| 运行时长 | 约 43 天；盘点时负载接近 0 |
| 对外端口 | 80/443 由 Nginx 容器监听；宿主机未发布后端 8000 |
| 持久化数据 | `/srv/my-tarot/data/backend_tarot.db`，约 3.0 MiB；后端容器挂载到 `/data` |
| 证书 | `/srv/my-tarot/deploy/certbot/conf` 持久化挂载；活动证书为 `www.miidea.top`，到期日为 2026-11-18 UTC |
| 部署形态 | `/srv/my-tarot` 文件/Compose 部署，不应将新的 Git checkout 直接覆盖到该目录 |

当前容器：

| 服务 | 状态 | 备注 |
|---|---|---|
| backend | running / healthy | 容器内 `/health` 返回 `status=healthy`，数据库为 connected |
| admin | running / unhealthy | `/` 健康检查返回 404；`/admin/` 返回 200 |
| nginx | running | 80/443 正常转发 |

## 3. 当前路由与外部验证结果

已验证：

- `https://www.miidea.top/`：HTTP 200，返回 HTML。
- `https://www.miidea.top/admin/`：HTTP 308，重定向到 `/admin`，符合现有发布文档预期。
- `GET https://www.miidea.top/health`：HTTP 200，后端健康 JSON 正常。
- `HEAD https://www.miidea.top/health`：HTTP 405；这是后端不允许 HEAD 的行为，监控和验收必须使用 GET。
- Nginx 配置包含 MIME 类型、静态门户 allowlist、`/admin/*`、`/api/*`、`/static/*` 和 ACME challenge 路由。

## 4. 推荐部署策略

### 4.1 发布原则

- 以明确的 Git commit/tag 作为发布输入，不在服务器上直接 `git pull` 生产目录。
- 生产环境的 `backend.env`、数据库、证书、Google 服务账号和其他密钥均由服务器单独管理，不进入发布包。
- 发布包使用 POSIX `/` 路径；排除 `.env`、数据库、`node_modules`、`.next`、虚拟环境、日志、缓存和本地工具配置。
- 先做数据库和配置备份，再进行容器更新；保留上一版镜像、发布包和回滚记录。
- 只在 Nginx 配置发生变化时校验并 reload Nginx；门户内容更新不需要重建 backend/admin。

### 4.2 阶段 A：发布前准备

1. 确认发布 commit、变更范围、维护窗口和回滚负责人。
2. 修正 admin healthcheck，并在本地执行前端构建、后端测试和 Compose 配置校验。
3. 使用同一 Dockerfile 在本地或 CI 构建 backend/admin 镜像；由于 ECS 内存只有 1.6 GiB 且无 Swap，优先构建后导出镜像，再传输到服务器。
4. 执行公开分支扫描，确认没有真实域名以外的私密部署信息、API key、密码、Cookie、证书私钥、数据库和生产环境文件进入发布包。
5. 生成带时间戳的发布清单，记录 Git commit、镜像 digest、Compose 文件校验值和发布包 SHA-256。

### 4.3 阶段 B：服务器准备与备份

1. 确认 SSH 仅使用公钥认证；安全组将 SSH 限制为维护网络的 `/32`，公网网站仅开放 80/443。
2. 收紧服务器敏感文件权限，删除源码目录中不参与生产 Compose 的 `.env` 和 Cookie 副本；若无法确认是否泄露，先轮换对应凭据。
3. 备份以下内容到带时间戳的受保护目录：
   - `data/backend_tarot.db`；
   - `docker-compose.prod.yml`、Nginx 配置和生产环境文件；
   - `deploy/certbot/conf` 的证书配置；
   - 当前镜像列表和 `docker compose ps` 输出。
4. 对数据库备份执行 SQLite `PRAGMA integrity_check`。备份完成并可读之前，不得更新 backend。
5. 确认磁盘剩余空间、Docker 构建缓存和运行日志，不因清理动作影响当前容器或生产数据。

### 4.4 阶段 C：分阶段发布

1. 将发布包或镜像传输到服务器临时目录，例如 `/srv/my-tarot/releases/<timestamp>`，不要直接覆盖 `/srv/my-tarot`。
2. 在临时目录校验包完整性、Compose 文件和镜像 digest；生产 env、数据库、证书只从服务器既有受保护位置挂载。
3. 先以只读方式执行 Compose 配置校验：

   ```bash
   docker compose -f docker-compose.prod.yml config --quiet
   ```

4. 更新 backend/admin 镜像或构建结果，保持 `/srv/my-tarot/data`、证书目录和门户目录的挂载关系不变。
5. 采用 Compose 的滚动前检查：先启动/更新 backend，确认 backend healthy，再更新 admin；确认 admin 健康后再确认 Nginx upstream。
6. 如 Nginx 配置有变更，使用 `cp` 替换被 bind mount 的配置文件，然后执行：

   ```bash
   docker exec my-tarot-nginx-1 nginx -t
   docker exec my-tarot-nginx-1 nginx -s reload
   ```

   不要使用会替换 bind mount 文件 inode 的 `install`，也不要因门户内容更新而执行全量重建。

### 4.5 阶段 D：证书与定时维护

1. 使用当前证书配置执行 Certbot dry-run，不直接申请新证书：

   ```bash
   cd /srv/my-tarot
   docker compose -f docker-compose.prod.yml run --rm certbot \
     renew --webroot -w /var/www/certbot --dry-run
   ```

2. 配置每日至少一次的续期检查；续期成功后只 reload Nginx，不重建应用容器。
3. 定期检查磁盘、容器健康、数据库备份、异常日志和外部 HTTPS 路由。

## 5. 发布后验收清单

### 容器与数据

- `docker compose ps` 中 backend、admin、nginx 均为 running；backend/admin 均为 healthy。
- backend 容器内 GET `/health` 返回 healthy 且 database 为 connected。
- 数据库文件仍位于受保护的持久化目录，大小和权限合理，完整性检查通过。
- 没有因发布产生新的公开宿主机端口；UFW 规则只保留批准的端口。

### Web 与 API

- 门户首页、文章列表、项目列表和两个公开简历入口均返回 HTTP 200。
- `/admin/` 的重定向行为符合预期，登录页可加载，静态 JS/CSS 不被以 `text/plain` 返回。
- `/health` 使用 GET 验证；`/api/*`、`/static/*` 和兼容入口均按现有路由逐项验证。
- 使用浏览器检查首页、后台登录页和至少一个后台列表页，确认没有 Server Action、资源路径或 basePath 错误。

### 安全与运维

- 生产 env、Cookie、服务账号和证书私钥不在发布包、Git 跟踪文件或公开静态目录中。
- SSH 安全组不是 `0.0.0.0/0`；UFW 不公开 8000。
- Certbot dry-run 通过，活动证书日期和 Nginx reload 结果已记录。
- 发布包、镜像 digest、备份位置、验收结果和回滚点已登记。

## 6. 回滚方案

触发条件包括：backend 不健康、admin 仍不健康、数据库连接失败、关键页面 5xx、API 认证/数据异常、Nginx 配置测试失败或 HTTPS 证书异常。

1. 立即停止继续发布，保留失败容器日志和 `docker compose ps` 输出。
2. 恢复上一版 backend/admin 镜像或上一版发布目录，执行 Compose 更新；Nginx 配置只从已验证备份恢复并先 `nginx -t`。
3. 回滚后重新验证首页、后台、GET `/health` 和关键 API。
4. 只有在确认发生了不可逆数据库迁移且应用无法兼容时，才在停止 backend 后恢复数据库备份；恢复前后均执行 SQLite 完整性检查。
5. 记录失败原因、影响范围和修复项，未完成复盘前不重复上线。

## 7. 实施顺序与完成门槛

建议顺序为：

1. 修复 healthcheck、敏感文件权限和防火墙规则。
2. 完成本地/CI 构建及测试，生成可追溯发布包或镜像。
3. 服务器备份与发布前检查。
4. 分阶段更新 backend/admin，必要时 reload Nginx。
5. 执行域名、API、数据库、证书和安全验收。
6. 发布后观察至少一个完整业务周期，再清理旧镜像和旧发布包。

“部署完成”的判定不是容器处于 running，而是：所有健康检查通过、核心路由和后台登录通过、数据库可用、证书有效、备份可恢复、无未批准公网端口和无未处理敏感文件权限风险。

## 8. 2026-09-19 实施记录

本计划已在生产 ECS 实施，发布标识为 `20260919-174000`。执行前已创建 `/srv/my-tarot/backups/20260919-172843`，其中包含 SQLite 一致性备份、生产 Compose/Nginx/env 备份、证书配置归档、旧源码归档和旧镜像 ID。旧 backend/admin 镜像均保留了 `pre-20260919-172843` 回滚标签。

已实施项：

- admin Compose healthcheck 从错误的 `/` 改为 `/admin/`；新 admin 容器为 healthy。
- backend 镜像包含 `config/llm.yaml` 与新增的 PyYAML 依赖；新 backend 容器为 healthy。
- 新增两个 `.dockerignore`，防止 `.env`、Cookie、本地配置和构建缓存进入镜像；后端 `.gitignore` 不再错误忽略 `.dockerignore`。
- 修复 admin TypeScript alias：`tsconfig.json` 增加 `baseUrl`，Next webpack 显式将 `@` 映射至 `src`；14 个页面的生产构建完成。
- 将不参与生产 Compose 的源码目录 `.env`/`.env.local`/Cookie 副本移动到受保护备份目录；生产 `env/backend.env` 权限已收紧为 `600`。
- 删除 UFW 的 IPv4/IPv6 8000 放行规则；宿主机仅监听批准的 22、80、443。
- 修正每日证书任务，改用 `docker-compose.prod.yml`、webroot 参数、15 分钟超时和非交互 Nginx reload。

验收结果：backend/admin health 均为 `healthy`；Nginx 配置测试通过；SQLite `PRAGMA integrity_check` 返回 `ok`；公网首页、门户文章/项目/简历页面、`/admin/login` 和 GET `/health` 均返回 HTTP 200。活动 `www.miidea.top` 证书有效至 2026-11-18 UTC。

证书续期 dry-run 曾停留在读取现有 renewal 配置后无响应，已在不改动证书的情况下安全终止。定时任务已加入超时保护；应在下一个维护窗口结合 `/var/log/certbot-renew.log` 和 ACME 网络连通性继续排查该独立问题。
