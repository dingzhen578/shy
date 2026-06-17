# 历史学姐笔记 ✨

一个面向中国高中女生的 AI 历史学习手账。输入一道历史主观题，它会像学姐整理笔记一样，生成适合背诵和复习的高考风格答案。

页面风格偏 Apple、Notion、Muji 和小红书学习笔记：奶油白背景、柔和阴影、大圆角卡片、移动端优先。

## 1. 项目是什么

第一阶段 MVP 只做一件事：

1. 输入历史主观题，例如：`评价洋务运动`
2. 点击 `帮我整理答案`
3. 输出固定结构的学习笔记：

```text
🌟 背景
📌 措施
📝 影响
⚠️ 局限性
✨ 历史意义
```

当前 MVP 还包含轻量变现验证：

1. 每个浏览器每天免费生成 1 次基础答案。
2. 免费版只提供答案生成，复制答案和保存学习卡片图需要激活会员码。
3. 7 天体验版和月卡会员可以不限次数生成。
4. 页面会展示适用场景、会员权益和微信开通方式。

同时支持 MVP 图片识别：

1. 点击 `📷 上传题目图片`。
2. 上传试卷、练习册或笔记里的历史题目图片。
3. 系统先识别图片文字，并自动填入题目输入框。
4. 用户检查或修改识别结果后，再点击 `帮我整理答案`。

图片不会保存到数据库，也不会写入服务器硬盘。

## 2. 安装依赖

进入项目目录：

```bash
cd /Users/shy/Documents/历史答题AI
```

安装依赖：

```bash
npm install
```

## 3. 配置 DeepSeek API

本项目使用 DeepSeek API，并通过 OpenAI SDK 的兼容写法调用。

复制环境变量示例：

```bash
cp .env.example .env.local
```

然后打开 `.env.local`，填入你的 DeepSeek API Key。

## 4. `.env.local` 示例

```bash
OPENAI_API_KEY=你的 DeepSeek API Key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-v4-flash
# 可选：如果答案模型不支持图片识别，可单独配置支持视觉/OCR 的模型
# OPENAI_OCR_MODEL=your_vision_ocr_model_here
```

说明：

- `OPENAI_API_KEY`：你的 DeepSeek API Key，必须填写。
- `OPENAI_BASE_URL`：DeepSeek 兼容 OpenAI SDK 的接口地址。
- `OPENAI_MODEL`：模型名，默认使用 `deepseek-v4-flash`。
- `OPENAI_OCR_MODEL`：可选。图片识别使用的视觉/OCR 模型名；不配置时默认复用 `OPENAI_MODEL`。

API Key 只会在服务端 API Route 中读取，不会暴露到前端页面。

## 5. 图片识别功能说明

图片 OCR 入口在页面题目输入框附近：

```text
📷 上传题目图片
```

支持格式：

```text
jpg / jpeg / png / webp
```

限制：

```text
单张图片不超过 5MB
```

调用流程：

```text
前端 FormData 上传图片 -> /api/ocr -> 服务端调用 OpenAI SDK 兼容视觉接口 -> 返回识别文字 -> 自动填入输入框
```

注意：

- `/api/ocr` 只在内存中读取图片，不保存图片文件。
- OCR 和答案生成是两个独立接口。
- OCR 成功后不会自动生成答案，用户需要先检查题目文字，再点击 `帮我整理答案`。
- 如果当前 `OPENAI_MODEL` 不支持图片输入，可以在 `.env.local` 中单独添加 `OPENAI_OCR_MODEL`。

## 6. 本地运行

开发模式：

```bash
npm run dev
```

浏览器访问：

```text
http://localhost:3000
```

如果你只是想快速打开一个本地 HTTP 网站，也可以运行：

```bash
npm run serve:http
```

然后访问：

```text
http://127.0.0.1:3000
```

## 7. 部署到 Vercel

### 7.1 上线前检查

先确认本地构建能通过：

```bash
npm run build
```

确认 `.env.local` 没有被提交：

```bash
git check-ignore -v .env.local
```

如果能看到 `.gitignore` 规则，说明本地 API Key 不会被提交到 GitHub。

### 7.2 推送到 GitHub

如果这是第一次上传到 GitHub：

1. 打开 GitHub。
2. 点击右上角 `+`，选择 `New repository`。
3. Repository name 可以填：`history-senior-notes`。
4. 不要勾选自动创建 README、`.gitignore` 或 License，避免和本地文件冲突。
5. 创建仓库后，复制 GitHub 给出的仓库地址。
6. 在本地项目目录执行：

```bash
git add .
git commit -m "Prepare history notebook MVP for deployment"
git branch -M main
git remote add origin 你的 GitHub 仓库地址
git push -u origin main
```

如果已经有远程仓库，只需要：

```bash
git add .
git commit -m "Prepare history notebook MVP for deployment"
git push
```

### 7.3 在 Vercel 导入项目

1. 打开 Vercel Dashboard。
2. 点击 `Add New` -> `Project`。
3. 在 `Import Git Repository` 中选择刚才的 GitHub 仓库。
4. Framework Preset 保持 `Next.js`。
5. Build Command 保持默认 `npm run build`。
6. Install Command 保持默认 `npm install`。
7. 在导入页面或项目设置中添加 Environment Variables：

```bash
OPENAI_API_KEY=你的 DeepSeek API Key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-v4-flash
# 如果需要单独 OCR 模型，再加：
# OPENAI_OCR_MODEL=your_vision_ocr_model_here
```

这三个变量建议同时勾选 `Production` 和 `Preview`，方便正式站点和预览站点都能生成答案。

8. 点击 `Deploy`。

部署后，Vercel 会自动运行 Next.js 项目。

### 7.4 部署后检查

1. 打开 Vercel 生成的网址。
2. 输入 `评价洋务运动`。
3. 点击 `帮我整理答案`。
4. 如果能生成五张学习笔记卡片，说明部署成功。
5. 如果提示 `服务暂时没有配置好，请检查 API Key。`，回到 Vercel 项目的 `Settings` -> `Environment Variables` 检查变量名和值，然后重新部署。
6. 测试图片识别时，点击 `📷 上传题目图片`，上传 5MB 以内的历史题目图片，确认识别文字会先填入输入框。

## 8. 常见错误说明

### 如何测试免费次数

免费次数存在浏览器 `localStorage` 中。打开浏览器开发者工具，找到 Application / Local Storage，删除：

```text
history-senior-notes-free-usage
```

刷新页面后会恢复为当天 `1/1`。也可以手动写入：

```json
{"date":"当天日期","remaining":0}
```

然后刷新页面，测试免费次数耗尽、会员权益卡片和禁止继续生成的状态。

免费用户生成答案后，点击 `🔒 复制答案（会员）` 或
`🔒 保存学习卡片（会员）`，页面会提示开通并定位到会员权益卡片。

需要测试完整会员功能时，可以在会员码输入框中使用：

```text
HUBMLS9276642LXX
```

激活后会获得 7 天体验会员，复制答案和保存学习卡片图恢复可用。更多可分发会员码在
`src/lib/membership.js` 中维护。

### 如何替换联系方式

微信二维码文件位于：

```text
public/wechat-qr.jpg
```

替换同名图片即可更新开通联系方式。相关文案和图片展示代码位于
`app/page.tsx`。

### 页面提示：服务暂时没有配置好，请检查 API Key。

原因：没有配置 `OPENAI_API_KEY`，或 Vercel 环境变量没有保存。

处理：

```bash
cp .env.example .env.local
```

然后在 `.env.local` 里填入真实 DeepSeek API Key。

### 页面提示：小助手刚刚走神了，请稍后再试一下。

可能原因：

- DeepSeek API Key 不正确。
- DeepSeek 账户余额不足。
- `OPENAI_BASE_URL` 填错。
- 网络请求暂时失败。

可以先检查服务端控制台日志，项目不会把完整错误堆栈显示给用户。

### 图片识别提示：这张图片有点模糊，暂时没有识别成功。

可能原因：

- 图片太模糊、反光、倾斜或文字太小。
- 图片里没有清晰的历史题目。
- 当前 OCR 模型不支持图片输入。
- DeepSeek 或 OCR 服务临时失败。

处理：

- 换一张更清晰的图片。
- 裁剪到只保留题目区域再上传。
- 如果服务端日志提示模型不支持图片，请配置 `OPENAI_OCR_MODEL` 为支持视觉/OCR 的 OpenAI SDK 兼容模型。

### `npm install` 失败

可能是网络或 npm 源问题。可以稍后重试，或切换 npm 镜像源。

### Vercel 部署后无法生成答案

通常是环境变量没有添加到 Vercel。请确认 Vercel 中有：

```bash
OPENAI_API_KEY
OPENAI_BASE_URL
OPENAI_MODEL
```

修改环境变量后，需要重新部署一次。

## 常用命令

```bash
npm run test
npm run lint
npm run build
```
