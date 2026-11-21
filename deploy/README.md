# H5 生产部署

当前方案：GitHub Actions 在每次 push 到 `main` 时构建，并用 rsync 把 `dist/` 同步到服务器。

```text
域名    ：h5.kuaikeli.tech（需解析到 115.29.149.87）
服务器  ：115.29.149.87（Alibaba Cloud Linux 3，宝塔面板）
部署目录：/opt/QuickABC/vocab-server/h5（alex 用户可写，Nginx 只读）
后端    ：127.0.0.1:3001（PM2: quickabc-server）
Nginx   ：见 deploy/nginx-h5.kuaikeli.tech.conf
```

## GitHub Actions

工作流：`.github/workflows/deploy.yml`

触发：push 到 `main`，或在 Actions 页面手动 `Run workflow`。

构建环境变量（工作流内固定）：

```bash
VITE_API_BASE=/api
VITE_SERVER_BASE=
VITE_AUTO_LOGIN=true
```

### 需要配置的 Secrets

仓库 Settings → Secrets and variables → Actions → New repository secret：

| 名称 | 值 |
| --- | --- |
| `DEPLOY_HOST` | `115.29.149.87` |
| `DEPLOY_USER` | `alex` |
| `DEPLOY_SSH_KEY` | CI 专用 ed25519 私钥全文（含 `-----BEGIN/END OPENSSH PRIVATE KEY-----`） |
| `DEPLOY_PORT` | 可选，默认 `22` |
| `DEPLOY_PATH` | 可选，默认 `/opt/QuickABC/vocab-server/h5` |

对应的公钥已追加到服务器 `alex` 用户的 `~/.ssh/authorized_keys`。更换密钥时删掉旧公钥即可。

Secrets 未配置时工作流只构建、不部署，并在日志里给出警告。

## 服务器一次性初始化

```bash
# 部署目录
mkdir -p /opt/QuickABC/vocab-server/h5

# Nginx（需要 root）
# 1) DNS 添加 A 记录：h5.kuaikeli.tech -> 115.29.149.87
# 2) 宝塔新建静态站点并申请证书，或直接使用 deploy/nginx-h5.kuaikeli.tech.conf
nginx -t && nginx -s reload
```

## 手动部署（备用）

```bash
VITE_API_BASE=/api VITE_SERVER_BASE= npm run build
rsync -az --delete --chmod=D755,F644 dist/ alex@115.29.149.87:/opt/QuickABC/vocab-server/h5/
```

## 验证

```bash
curl -I https://h5.kuaikeli.tech/
curl https://h5.kuaikeli.tech/health   # 经 Nginx 转发到后端 127.0.0.1:3001/health
```
