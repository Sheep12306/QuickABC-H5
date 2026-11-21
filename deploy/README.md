# H5 生产部署

当前方案：GitHub Actions 在每次 push 到 `main` 时构建，并用 rsync 把 `dist/` 同步到服务器。

```text
域名    ：quickabc.kuaikeli.tech（需解析到 115.29.149.87）
服务器  ：115.29.149.87（Alibaba Cloud Linux 3，宝塔面板）
部署目录：/opt/QuickABC/vocab-server/h5（alex 用户可写，Nginx 只读）
后端    ：127.0.0.1:3001（PM2: quickabc-server）
Nginx   ：见 deploy/nginx-quickabc.kuaikeli.tech.conf
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
# 部署目录（alex 可写）
mkdir -p /opt/QuickABC/vocab-server/h5
mkdir -p /opt/QuickABC/vocab-server/acme/.well-known/acme-challenge   # HTTP-01 验证目录

# 站点配置（需要 root）
# 文件：/www/server/panel/vhost/nginx/quickabc.kuaikeli.tech.conf
# 内容：deploy/nginx-quickabc.kuaikeli.tech.conf
# 注意：本机 nginx 不是默认 /etc/nginx，必须显式指定配置：
sudo /www/server/nginx/sbin/nginx -t -c /www/server/nginx/conf/nginx.conf
sudo /www/server/nginx/sbin/nginx -s reload -c /www/server/nginx/conf/nginx.conf
```

### TLS 证书（acme.sh）

服务器已安装 `/root/.acme.sh/acme.sh`。DNS 解析生效后签发并安装到宝塔证书目录：

```bash
sudo /root/.acme.sh/acme.sh --issue -d quickabc.kuaikeli.tech \
  --webroot /opt/QuickABC/vocab-server/acme

sudo mkdir -p /www/server/panel/vhost/cert/quickabc.kuaikeli.tech
sudo /root/.acme.sh/acme.sh --install-cert -d quickabc.kuaikeli.tech \
  --key-file       /www/server/panel/vhost/cert/quickabc.kuaikeli.tech/privkey.pem \
  --fullchain-file /www/server/panel/vhost/cert/quickabc.kuaikeli.tech/fullchain.pem \
  --reloadcmd      "/www/server/nginx/sbin/nginx -s reload -c /www/server/nginx/conf/nginx.conf"
```

安装证书后把站点配置切换为 `deploy/nginx-quickabc.kuaikeli.tech.conf` 的 443 版本。

续期定时任务已写入 root crontab（每天 03:00 执行 `acme.sh --cron`），到期前会自动续签并 reload Nginx。

## 手动部署（备用）

```bash
VITE_API_BASE=/api VITE_SERVER_BASE= npm run build
rsync -az --delete --chmod=D755,F644 dist/ alex@115.29.149.87:/opt/QuickABC/vocab-server/h5/
```

## 验证

```bash
curl -I https://quickabc.kuaikeli.tech/
curl https://quickabc.kuaikeli.tech/health   # 经 Nginx 转发到后端 127.0.0.1:3001/health
```
