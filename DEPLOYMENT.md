# 香港 Node.js 服务器部署指南

本文档用于把“历史学姐笔记”部署到中国香港轻量服务器，脱离 Vercel 运行，让中国大陆用户可以直接访问。

## 1. 部署前说明

本项目是 Next.js App Router 项目，可以直接使用普通 Node.js 服务器运行。

- 应用端口：`3000`
- 推荐系统：Ubuntu 22.04 LTS 或 Ubuntu 24.04 LTS
- 推荐 Node.js：Node 20 LTS 或 Node 22 LTS
- 默认部署目录：`/var/www/history-senior-notes`
- AI 请求路径：浏览器 `fetch("/api/generate")` -> 服务端 API Route -> DeepSeek
- API Key 只读取服务器环境变量，不会暴露到前端

不要把 `.env.production`、`.env.local` 或真实 API Key 提交到 GitHub。

## 2. 安装 Node.js

登录香港服务器：

```bash
ssh root@你的服务器公网IP
```

更新系统：

```bash
apt update
apt upgrade -y
```

安装基础工具：

```bash
apt install -y curl git nginx
```

安装 Node.js 20 LTS：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

检查版本：

```bash
node -v
npm -v
```

Node.js 版本需要大于等于 `20.9.0`。

## 3. 上传项目

推荐使用 GitHub 拉取项目：

```bash
mkdir -p /var/www
cd /var/www
git clone 你的GitHub仓库地址 history-senior-notes
cd /var/www/history-senior-notes
```

如果服务器无法直接访问 GitHub，也可以在本地打包后上传：

```bash
tar --exclude=node_modules --exclude=.next --exclude=.env.local -czf history-senior-notes.tar.gz .
scp history-senior-notes.tar.gz root@你的服务器公网IP:/var/www/
```

然后在服务器解压：

```bash
cd /var/www
mkdir -p history-senior-notes
tar -xzf history-senior-notes.tar.gz -C history-senior-notes
cd /var/www/history-senior-notes
```

## 4. 配置环境变量

在服务器项目目录创建 `.env.production`：

```bash
cd /var/www/history-senior-notes
nano .env.production
```

写入以下内容：

```bash
OPENAI_API_KEY=你的 DeepSeek API Key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-v4-flash
```

保存后限制权限：

```bash
chmod 600 .env.production
```

说明：

- `OPENAI_API_KEY` 只在服务端 API Route 中通过 `process.env` 读取。
- 不要使用 `NEXT_PUBLIC_OPENAI_API_KEY`。
- 不要把真实 Key 写进前端代码、README 或 GitHub。

## 5. 安装依赖并构建

在服务器项目目录执行：

```bash
cd /var/www/history-senior-notes
npm install
npm run build
```

本地测试启动：

```bash
npm run start
```

项目会运行在：

```text
http://127.0.0.1:3000
```

新开一个 SSH 窗口测试：

```bash
curl http://127.0.0.1:3000
```

如果能返回 HTML，说明 Next.js 服务正常。

## 6. 使用 PM2 后台运行

安装 PM2：

```bash
npm install -g pm2
```

启动项目：

```bash
cd /var/www/history-senior-notes
pm2 start npm --name history-senior-notes -- run start
```

查看状态：

```bash
pm2 status
pm2 logs history-senior-notes
```

保存进程列表：

```bash
pm2 save
```

设置开机自启：

```bash
pm2 startup
```

执行命令输出中提示的那一行 `sudo env ... pm2 startup ...`，然后再次执行：

```bash
pm2 save
```

常用维护命令：

```bash
pm2 restart history-senior-notes
pm2 stop history-senior-notes
pm2 logs history-senior-notes
```

## 7. 配置 Nginx 反向代理

创建 Nginx 配置：

```bash
nano /etc/nginx/sites-available/history-senior-notes
```

写入以下内容，把 `example.com` 替换为你的真实域名：

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用站点：

```bash
ln -s /etc/nginx/sites-available/history-senior-notes /etc/nginx/sites-enabled/history-senior-notes
```

如果默认站点占用 80 端口，可以删除默认配置：

```bash
rm -f /etc/nginx/sites-enabled/default
```

检查并重载 Nginx：

```bash
nginx -t
systemctl reload nginx
```

## 8. 配置域名解析

进入你的域名 DNS 控制台，添加 A 记录：

```text
主机记录：@
记录类型：A
记录值：你的香港服务器公网 IP
```

如果需要 `www`：

```text
主机记录：www
记录类型：A
记录值：你的香港服务器公网 IP
```

等待 DNS 生效后测试：

```bash
curl http://example.com
```

## 9. 配置 HTTPS

安装 Certbot：

```bash
apt install -y certbot python3-certbot-nginx
```

申请 HTTPS 证书：

```bash
certbot --nginx -d example.com -d www.example.com
```

按提示填写邮箱并选择自动跳转 HTTPS。

测试自动续期：

```bash
certbot renew --dry-run
```

HTTPS 配置完成后访问：

```text
https://example.com
```

## 10. 更新网站

以后更新代码时，在服务器执行：

```bash
cd /var/www/history-senior-notes
git pull
npm install
npm run build
pm2 restart history-senior-notes
```

如果只修改了 `.env.production`，重启即可：

```bash
pm2 restart history-senior-notes
```

## 11. 常见问题

### 页面能打开，但生成答案失败

检查 `.env.production` 是否存在：

```bash
cat /var/www/history-senior-notes/.env.production
```

确认包含：

```bash
OPENAI_API_KEY=你的 DeepSeek API Key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-v4-flash
```

然后重启：

```bash
pm2 restart history-senior-notes
```

### 服务器 502 Bad Gateway

先确认 Next.js 是否运行：

```bash
pm2 status
curl http://127.0.0.1:3000
```

如果 PM2 没有运行：

```bash
cd /var/www/history-senior-notes
pm2 start npm --name history-senior-notes -- run start
```

### Nginx 配置不生效

检查配置：

```bash
nginx -t
systemctl reload nginx
```

查看 Nginx 日志：

```bash
tail -n 100 /var/log/nginx/error.log
```

### 端口被占用

检查 3000 端口：

```bash
lsof -i :3000
```

如果旧进程占用端口，可以先停止旧的 PM2 进程：

```bash
pm2 stop history-senior-notes
pm2 delete history-senior-notes
```

再重新启动。

## 12. 部署检查清单

- `npm run build` 成功。
- `npm run start` 可以在 `127.0.0.1:3000` 返回页面。
- `pm2 status` 中 `history-senior-notes` 为 `online`。
- `nginx -t` 成功。
- 域名 A 记录指向香港服务器公网 IP。
- `https://你的域名` 可以正常打开。
- 输入历史题目可以生成答案。
- API Key 没有出现在前端代码、浏览器控制台或 GitHub 仓库中。
