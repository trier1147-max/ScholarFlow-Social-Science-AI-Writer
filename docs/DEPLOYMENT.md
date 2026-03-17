# ScholarFlow 部署指南

本文档说明如何将 ScholarFlow 部署到线上，方便展示和演示。

## 架构概览

- **前端**: Next.js → 部署到 [Vercel](https://vercel.com)（免费、自动 HTTPS、全球 CDN）
- **后端**: FastAPI → 部署到 [Railway](https://railway.app) 或 [Render](https://render.com)

## 前置准备

1. **GitHub 仓库**: 确保代码已推送到 GitHub
2. **DeepSeek API Key**: 从 [DeepSeek 开放平台](https://platform.deepseek.com) 获取
3. **账号**: 注册 Vercel、Railway 或 Render 账号（均有免费额度）

---

## 一、部署后端

### 方案 A：Railway 部署

1. 登录 [Railway](https://railway.app)，点击 **New Project**
2. 选择 **Deploy from GitHub repo**，连接你的仓库
3. 选择仓库后，在 **Settings** 中设置：
   - **Root Directory**: `backend`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. 在 **Variables** 中添加环境变量：

   | 变量名 | 值 | 说明 |
   |--------|-----|------|
   | `DEEPSEEK_API_KEY` | 你的 API Key | 必填 |
   | `APP_ENV` | `production` | 可选 |
   | `DEBUG` | `false` | 可选 |

5. 部署完成后，在 **Settings** → **Networking** 中生成 **Public Domain**，得到后端地址，例如：`https://xxx.railway.app`

### 方案 B：Render 部署

1. 登录 [Render](https://render.com)，点击 **New** → **Web Service**
2. 连接 GitHub 仓库
3. 配置：
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. 在 **Environment** 中添加环境变量（同 Railway）
5. 部署完成后，在 **Settings** 中查看 **URL**，得到后端地址

> ⚠️ **注意**：首次部署时，`sentence-transformers` 会下载 BGE-M3 模型（约 2GB），可能耗时 5–10 分钟。Render 免费版有冷启动，首次请求可能较慢。

---

## 二、部署前端

1. 登录 [Vercel](https://vercel.com)，点击 **Add New** → **Project**
2. 导入 GitHub 仓库
3. 配置（二选一）：
   - **方式 A（推荐）**：将 **Root Directory** 设为 `frontend`，其他保持默认
   - **方式 B**：Root Directory 保持 `.`（根目录），项目已包含根级 `vercel.json`，会自动从 `frontend` 构建
4. 在 **Environment Variables** 中添加：

   | 变量名 | 值 | 说明 |
   |--------|-----|------|
   | `NEXT_PUBLIC_API_URL` | 你的后端地址 | 例如 `https://xxx.railway.app` |
   | `NEXT_PUBLIC_APP_NAME` | `ScholarFlow` | 可选 |

5. 点击 **Deploy**，等待构建完成
6. 部署成功后，会得到前端地址，例如：`https://xxx.vercel.app`

---

## 三、配置 CORS（后端）

部署完成后，前端域名与后端不同，需要配置 CORS。在后端环境变量中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `CORS_ORIGINS` | `["https://你的前端域名.vercel.app"]` | 多个用逗号分隔 |

例如：`["https://scholarflow.vercel.app"]`

若后端 `config.py` 中 `CORS_ORIGINS` 默认是 `["*"]`，则无需修改（生产环境建议改为具体域名）。

---

## 四、验证部署

1. 打开前端地址，应能看到 ScholarFlow 界面
2. 创建项目、上传文献、发起对话，确认功能正常
3. 若出现跨域或网络错误，检查：
   - `NEXT_PUBLIC_API_URL` 是否正确
   - 后端 CORS 是否包含前端域名

---

## 五、快速部署清单

| 步骤 | 平台 | 操作 |
|------|------|------|
| 1 | Railway/Render | 部署后端，获取 URL |
| 2 | Vercel | 部署前端，Root Directory = `frontend` |
| 3 | Vercel | 设置 `NEXT_PUBLIC_API_URL` = 后端 URL |
| 4 | 后端 | 设置 `DEEPSEEK_API_KEY` |
| 5 | 后端 | 设置 `CORS_ORIGINS` 包含前端域名（如需要） |

---

## 常见问题

### 1. 前端显示「网络错误」

- 确认 `NEXT_PUBLIC_API_URL` 已正确配置（无多余斜杠）
- 确认后端服务已启动且可访问

### 2. 跨域错误 (CORS)

- 在后端环境变量中设置 `CORS_ORIGINS` 为前端域名

### 3. 后端部署失败

- 检查 `requirements.txt` 是否完整
- Railway/Render 日志中查看具体错误信息

### 4. 首次请求很慢

- 使用 `sentence-transformers` 会下载 BGE-M3 模型，首次较慢属正常
- Render 免费版有冷启动，可考虑升级或使用 Railway

---

## 数据持久化说明

- **Railway**: 免费版有临时存储，重启后 SQLite 数据可能丢失

- **Render**: 免费版同理，可考虑使用 [Render PostgreSQL](https://render.com/docs/databases) 作为数据库

- 如需长期稳定运行，建议：
  - 使用 PostgreSQL 替代 SQLite
  - 使用付费版以获得持久化存储

---

Made with ❤️ for Academic Writers
