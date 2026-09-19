# 阿里云 ECS SSH 登录说明

## 当前部署目标

- 公网地址：`47.100.96.180`
- 系统：Ubuntu 22.04 LTS
- 登录用户：`root`
- SSH 端口：`22`
- 本机私钥：`%USERPROFILE%\.ssh\tarotAI_ecs_ed25519`
- 本机公钥：`%USERPROFILE%\.ssh\tarotAI_ecs_ed25519.pub`

密码和私钥均不得提交到仓库、聊天记录或部署包中。

## 从 Windows PowerShell 登录

```powershell
ssh -i "$env:USERPROFILE\.ssh\tarotAI_ecs_ed25519" root@47.100.96.180
```

验证密钥认证且禁止回退到密码认证：

```powershell
ssh -i "$env:USERPROFILE\.ssh\tarotAI_ecs_ed25519" -o BatchMode=yes -o PreferredAuthentications=publickey -o PasswordAuthentication=no root@47.100.96.180 whoami
```

成功时应输出：

```text
root
```

## 可选：配置快捷命令

编辑 `%USERPROFILE%\.ssh\config`，加入：

```text
Host tarot-ecs
    HostName 47.100.96.180
    User root
    IdentityFile ~/.ssh/tarotAI_ecs_ed25519
```

之后可直接登录：

```powershell
ssh tarot-ecs
```

## 安全组要求

入方向 SSH 规则应仅允许当前家庭网络的公网出口 IP：

```text
类别：IPv4
授权策略：允许
协议：TCP
访问目的：SSH (22)
访问来源：<当前公网IP>/32
```

查询当前公网 IP：

```powershell
(Invoke-RestMethod "https://api.ipify.org").Trim()
```

家庭公网 IP 变化后，先更新安全组规则，再重新连接。不要保留 `0.0.0.0/0` 加“全部端口（-1/-1）”的入方向允许规则；网站对公网提供服务时仅按需开放 TCP `80` 和 `443`。

## 排查

检查网络与安全组：

```powershell
Test-NetConnection 47.100.96.180 -Port 22
```

`TcpTestSucceeded : True` 说明端口网络可达。PowerShell 中的 `SourceAddress` 可能是内网地址，不应直接填入阿里云安全组；安全组应填写公网出口 IP。

若出现 `Permission denied (publickey,password)`，检查本机使用的私钥路径，以及服务器 `/root/.ssh/authorized_keys` 是否含有对应公钥。服务器端权限应为：

```bash
chmod 700 /root/.ssh
chmod 600 /root/.ssh/authorized_keys
```

## 部署前检查

成功登录后，先确认 Docker 环境：

```bash
docker --version
docker compose version
```

本项目的容器部署架构、数据库持久化与发布包要求见根目录 `agents.md` 的 Docker Architecture 和 Release Packaging Notes。
