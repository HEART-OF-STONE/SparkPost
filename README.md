# SparkPost

SparkPost 是一个积分驱动的 AI 内容生成网站。当前这个分支已经先把 [sparkpost.pages.dev](https://sparkpost.pages.dev/) 恢复成可访问的静态首页，同时开始补齐 Cloudflare 原生迁移脚手架。

## 当前状态

- Pages：当前稳定承载静态首页与公开资源
- Workers：已新增独立 API，并已迁入会话状态、模型状态和邮箱验证码登录链路
- D1：已新增首版 SQL schema
- R2：已在 Workers 配置中预留绑定

## 目标架构

- Cloudflare Pages：前端展示入口
- Cloudflare Workers：后端 API 与服务端业务逻辑
- Cloudflare D1：结构化业务数据
- Cloudflare R2：生成图片等对象存储

## 当前仓库中的 Cloudflare 入口

- Pages 配置：[wrangler.jsonc](./wrangler.jsonc)
- Workers API 配置：[workers/api/wrangler.jsonc](./workers/api/wrangler.jsonc)
- Workers 本地变量模板：[workers/api/.dev.vars.example](./workers/api/.dev.vars.example)
- D1 初始 schema：[workers/api/migrations/0001_initial.sql](./workers/api/migrations/0001_initial.sql)
- Workers API：[workers/api/src/index.ts](./workers/api/src/index.ts)
- 前端 Workers API helper：[src/lib/api/client.ts](./src/lib/api/client.ts)

## 本地开发

```bash
cp .env.example .env.local
cp workers/api/.dev.vars.example workers/api/.dev.vars
npm install
npm run d1:migrate:local
npm run workers:dev
npm run dev
```

说明：
- `npm run dev` 继续负责 Next.js 前端
- `npm run workers:dev` 负责本地 Workers API 与本地 D1
- `NEXT_PUBLIC_WORKERS_API_BASE_URL` 默认指向 `http://127.0.0.1:8787`
- `workers/api/.dev.vars` 只用于本地 wrangler，不要提交

## Cloudflare 迁移脚本

```bash
npm run cf:build
npm run workers:dev
npm run workers:deploy
npm run d1:migrate:local
npm run d1:migrate:remote
```

## 当前已迁入 Workers 的接口

- `GET /api/health`
- `GET /api/me`
- `GET /api/generate/status`
- `POST /api/auth/send-code`
- `POST /api/auth/verify-code`
- `POST /api/auth/logout`

其中：
- `/api/me` 已接入 session cookie 解析、HMAC 校验和 D1 用户查询
- 邮箱验证码登录链路已接入 D1 的验证码、用户和积分账户数据
- 首页前端已经支持通过 `NEXT_PUBLIC_WORKERS_API_BASE_URL` 请求独立 Workers API
- 生图提交与任务状态轮询仍待继续迁移

## Workers 运行时需要的配置

默认变量已经写在 [workers/api/wrangler.jsonc](./workers/api/wrangler.jsonc)：
- `IMAGE_BACKEND=official`
- `IMAGE_MODEL=dall-e-3`

仍需通过 Wrangler secret 或 Cloudflare 后台补充：
- `SESSION_SECRET`
- `IMAGE_API_KEY`

前端若要直接调用独立 Workers API，还需在 Pages 或本地环境补充：
- `NEXT_PUBLIC_WORKERS_API_BASE_URL`

仍需替换或绑定：
- `SPARKPOST_DB` 对应真实 D1 数据库
- `SPARKPOST_R2` 对应真实 R2 bucket

## 推荐的下一步顺序

1. 在本地跑通 Pages 前端 + Workers 登录链
2. 继续将 `/api/generate/image` 迁到 Workers
3. 将生图任务和资产元数据切到 D1 + R2
4. 最后移除 `uploads/` 本地存储方案

## 注意事项

- 不要提交 `.env`、`.dev.vars`、日志、上传文件、密钥和认证状态文件
- 当前仓库是公开仓库，默认按“敏感信息禁止提交”处理
- 当前 Pages 线上版本仍是静态 fallback，不代表服务端能力已经迁移完成
- `workers/api/wrangler.jsonc` 里的 `database_id` 仍需替换成真实的 D1 ID
