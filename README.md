# SparkPost

SparkPost 是一个积分驱动的 AI 内容生成网站。当前这个开发分支正在把架构逐步迁到 Cloudflare 原生方案：Pages 负责前端入口，Workers 负责后端 API，D1 负责结构化数据，R2 负责对象存储。

## 当前状态

- Pages：当前仍可承载静态首页与公开资源
- Workers：已迁入会话状态、模型状态、邮箱验证码登录链路，以及首版文生图链路
- D1：首版 schema 已创建，本地迁移已验证通过
- R2：配置位已预留，生成结果后续会从临时返回升级为 R2 持久化

## 仓库中的 Cloudflare 入口

- Pages 配置：[wrangler.jsonc](./wrangler.jsonc)
- Workers API 配置：[workers/api/wrangler.jsonc](./workers/api/wrangler.jsonc)
- Workers 本地变量模板：[workers/api/.dev.vars.example](./workers/api/.dev.vars.example)
- D1 初始 schema：[workers/api/migrations/0001_initial.sql](./workers/api/migrations/0001_initial.sql)
- Workers API：[workers/api/src/index.ts](./workers/api/src/index.ts)
- 前端 Workers API helper：[src/lib/api/client.ts](./src/lib/api/client.ts)

## 安全的本地联调步骤

1. 复制环境模板，但只在本地填写真实值。

```bash
cp .env.example .env.local
cp workers/api/.dev.vars.example workers/api/.dev.vars
```

2. 在本地私有文件中补齐必要变量。

前端 `.env.local` 至少需要：
- `NEXT_PUBLIC_WORKERS_API_BASE_URL=http://127.0.0.1:8787`

Workers 本地变量 `workers/api/.dev.vars` 至少需要：
- `SESSION_SECRET`
- `IMAGE_API_KEY`

3. 初始化本地 D1。

```bash
npm install
npm run d1:migrate:local
```

4. 分别启动 Workers 和前端。

```bash
npm run workers:dev
npm run dev
```

5. 在浏览器里验证本地链路。
- 打开前端页面
- 发送验证码
- 用本地 debug code 完成登录
- 发起一次文生图请求

## 当前已迁入 Workers 的接口

- `GET /api/health`
- `GET /api/me`
- `GET /api/generate/status`
- `POST /api/auth/send-code`
- `POST /api/auth/verify-code`
- `POST /api/auth/logout`
- `POST /api/generate/image`

说明：
- `/api/me` 已接入 session cookie 解析、HMAC 校验和 D1 用户查询
- 邮箱验证码登录链路已接入 D1 的验证码、用户和积分账户数据
- `/api/generate/image` 已迁入 Workers，并会写入 D1 的任务、资产和积分变更
- 当前生成结果先以临时可预览形式返回，后续再切到 R2 持久化

## 当前运行时配置

Workers 默认变量写在 [workers/api/wrangler.jsonc](./workers/api/wrangler.jsonc)：
- `IMAGE_BACKEND=official`
- `IMAGE_MODEL=dall-e-3`
- `IMAGE_DEFAULT_MODEL_ID=nano-banana-2`

以下信息只应存在于本地私有文件、Wrangler secret 或 Cloudflare 后台：
- `SESSION_SECRET`
- `OPENAI_IMAGE_API_KEY`
- `RELAY_IMAGE_API_KEY`
- `RELAY_IMAGE_BASE_URL`
- 任意真实数据库 ID
- 任意真实 bucket 名称之外的敏感凭据

## 安全注意事项

- 不要提交 `.env`、`.env.local`、`.dev.vars`、日志、上传文件、密钥和认证状态文件
- README 中只保留变量名、步骤和占位说明，不写真实 secret
- 当前 Pages 线上版本仍是静态 fallback，不代表服务端能力已经全部迁移完成
- `workers/api/wrangler.jsonc` 里的 `database_id` 仍需替换成真实 D1 ID，但不要把敏感值写进公开说明

## 后续优先级

1. 先把本地登录加文生图链路完整跑通
2. 将生成结果从临时返回升级到 R2 持久化
3. 再继续迁移任务轮询、上传和历史记录等能力
4. 最后移除 `uploads/` 本地存储方案
