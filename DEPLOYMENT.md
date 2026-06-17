# 香港轻量服务器部署教程

本文档用于把“历史学姐笔记”从 Vercel 迁移到中国香港轻量服务器，让中国大陆用户可以不用 VPN 直接访问。

本项目仍然保持原来的 Next.js 项目结构，只做普通 Ubuntu + Node.js 服务器部署适配。

## 当前服务器信息

本项目当前计划部署到以下服务器：

- 服务器公网 IP：`47.83.250.139`
- 域名：`historynotes.top`
- 推荐项目目录：`/var/www/history-note`
- 应用本机端口：`3000`

## 1. 购买服务器建议

推荐配置：

- 地区：中国香港
- 系统：Ubuntu 22.04
- 配置：1 核 1G 起步，推荐 2 核 2G
- 端口：需要开放 `22`、`80`、`443`

端口说明：

- `22`：SSH 登录服务器
- `80`：HTTP 访问
- `443`：HTTPS 访问

## 2. SSH 连接服务器

在本地终端连接服务器：

```bash
ssh root@47.83.250.139
```

首次连接时，如果提示是否信任服务器，输入：

```bash
yes
```

## 3. 服务器初始化

登录服务器后执行：

```bash
apt update && apt upgrade -y
apt install -y git curl wget unzip nginx
```

确认 Nginx 已安装：

```bash
nginx -v
```

## 4. 安装 Node.js 20

安装 Node.js 20：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v
```

本项目使用的 Next.js 版本要求 Node.js `>=20.9.0`，因此建议使用 Node.js 20 LTS。

## 5. 安装 PM2

PM2 用来让网站在服务器后台长期运行。

```bash
npm install -g pm2
pm2 -v
```

## 6. 拉取项目代码

进入网站部署目录：

```bash
cd /var/www
git clone https://github.com/dingzhen578/shy.git history-note
cd history-note
```

如果目录已存在，更新代码即可：

```bash
cd /var/www/history-note
git pull
```

## 7. 配置生产环境变量

在项目目录创建 `.env.production`：

```bash
nano .env.production
```

写入以下内容：

```bash
OPENAI_API_KEY=你的 DeepSeek API Key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-v4-flash
```

保存后执行：

```bash
chmod 600 .env.production
```

安全说明：

- `OPENAI_API_KEY` 只能放在服务器环境变量文件中。
- 不要把真实 API Key 写进 GitHub。
- 不要在前端代码中添加 `NEXT_PUBLIC_OPENAI_API_KEY`。
- 当前项目的 AI 请求路径是：前端页面请求 `/api/generate`，再由服务端 API Route 调用 DeepSeek。

## 8. 安装依赖并构建

在项目目录执行：

```bash
npm install
npm run build
```

如果构建成功，可以先测试启动：

```bash
npm run start
```

项目默认运行在：

```text
http://127.0.0.1:3000
```

如果当前终端被 `npm run start` 占用，可以按 `Ctrl + C` 停止，后面会用 PM2 后台启动。

## 9. 使用 PM2 启动项目

在项目目录执行：

```bash
pm2 start npm --name history-note -- run start
pm2 list
pm2 save
pm2 startup
```

注意：

`pm2 startup` 会输出一行较长的命令，通常以 `sudo env ...` 开头。你需要复制那一整行命令并执行一次。

执行完后，再保存一次：

```bash
pm2 save
```

确认项目运行：

```bash
pm2 list
pm2 logs history-note
curl http://127.0.0.1:3000
```

如果 `curl` 返回 HTML，说明 Next.js 服务已经正常运行。

## 10. 配置 Nginx 反向代理

创建 Nginx 配置文件：

```bash
nano /etc/nginx/sites-available/history-note
```

写入以下内容：

```nginx
server {
    listen 80;
    server_name historynotes.top www.historynotes.top;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

启用配置：

```bash
ln -s /etc/nginx/sites-available/history-note /etc/nginx/sites-enabled/history-note
nginx -t
systemctl restart nginx
```

如果 `nginx -t` 提示配置正确，就可以继续。

如果默认站点冲突，可以删除默认站点：

```bash
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

## 11. 域名解析

进入你的域名 DNS 控制台，添加 A 记录。

主域名：

```text
类型：A
主机记录：@
记录值：47.83.250.139
```

如果使用 `www`：

```text
类型：A
主机记录：www
记录值：47.83.250.139
```

等待 DNS 生效后测试：

```bash
curl http://historynotes.top
```

如果能返回页面内容，说明域名和 Nginx 已经连通。

## 12. 配置 HTTPS

安装 Certbot：

```bash
apt install -y certbot python3-certbot-nginx
```

如果同时使用主域名和 `www`：

```bash
certbot --nginx -d historynotes.top -d www.historynotes.top
```

如果没有 `www`，只执行：

```bash
certbot --nginx -d historynotes.top
```

按提示填写邮箱，并选择自动跳转 HTTPS。

测试证书自动续期：

```bash
certbot renew --dry-run
```

配置完成后访问：

```text
https://historynotes.top
```

## 13. 常用维护命令

查看项目状态：

```bash
pm2 list
```

查看日志：

```bash
pm2 logs history-note
```

重启项目：

```bash
pm2 restart history-note
```

停止项目：

```bash
pm2 stop history-note
```

更新代码：

```bash
cd /var/www/history-note
git pull
npm install
npm run build
pm2 restart history-note
```

如果只改了 `.env.production`，不需要重新构建，只需要：

```bash
pm2 restart history-note
```

## 14. 常见问题排查

### npm run build 报错怎么办

先确认 Node.js 版本：

```bash
node -v
```

如果低于 `20.9.0`，重新安装 Node.js 20。

再清理依赖后重装：

```bash
rm -rf node_modules .next package-lock.json
npm install
npm run build
```

如果仍然失败，查看完整错误日志，重点看是否是依赖安装失败、Node 版本过低或环境变量缺失。

### .env.production 没配置怎么办

如果没有 `.env.production`，AI 生成功能会提示：

```text
服务暂时没有配置好，请检查 API Key。
```

创建文件：

```bash
cd /var/www/history-note
nano .env.production
```

写入：

```bash
OPENAI_API_KEY=你的 DeepSeek API Key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-v4-flash
```

然后重启：

```bash
pm2 restart history-note
```

### 502 Bad Gateway 怎么办

502 通常表示 Nginx 能访问，但后面的 Next.js 服务没有运行。

检查 PM2：

```bash
pm2 list
pm2 logs history-note
```

检查本地端口：

```bash
curl http://127.0.0.1:3000
```

如果没有返回页面，重新启动：

```bash
cd /var/www/history-note
pm2 restart history-note
```

如果 PM2 里没有项目：

```bash
pm2 start npm --name history-note -- run start
pm2 save
```

### 域名打不开怎么办

先确认服务器公网 IP 是否能访问：

```bash
curl http://47.83.250.139
```

再确认 DNS 是否解析到服务器：

```bash
ping historynotes.top
```

检查 Nginx：

```bash
nginx -t
systemctl status nginx
systemctl restart nginx
```

同时确认云服务器安全组已放行：

- `80`
- `443`

### HTTPS 证书申请失败怎么办

先确认域名已经解析到服务器公网 IP，并且 HTTP 能访问：

```bash
curl http://historynotes.top
```

再检查 Nginx 配置：

```bash
nginx -t
systemctl restart nginx
```

如果你没有配置 `www` 解析，就不要执行带 `www` 的证书命令，只执行：

```bash
certbot --nginx -d historynotes.top
```

### DeepSeek API 请求失败怎么办

检查环境变量：

```bash
cd /var/www/history-note
cat .env.production
```

确认内容为：

```bash
OPENAI_API_KEY=你的 DeepSeek API Key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-v4-flash
```

再重启服务：

```bash
pm2 restart history-note
```

查看服务日志：

```bash
pm2 logs history-note
```

常见原因：

- DeepSeek API Key 写错
- DeepSeek 账户余额不足
- `OPENAI_BASE_URL` 写错
- 服务器网络无法访问 `https://api.deepseek.com`

可以在服务器测试网络：

```bash
curl https://api.deepseek.com
```

## 15. 部署成功检查

部署完成后，按顺序确认：

```bash
pm2 list
curl http://127.0.0.1:3000
nginx -t
curl http://historynotes.top
```

最后打开浏览器访问：

```text
https://historynotes.top
```

输入一道历史题，例如：

```text
评价洋务运动
```

如果可以生成答案，说明网站已经成功部署到香港服务器。
