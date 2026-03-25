# SparkPost

SparkPost 是一个积分驱动的 AI 内容生产网站。MVP 第一阶段聚焦：

- 邮箱验证码登录
- 新用户初始积分
- Nano Banana 文生图
- Nano Banana 图生图
- 生成历史记录

## 当前阶段

当前仓库处于 Sprint 1 / `feature/project-bootstrap`：

- 初始化 Next.js + TypeScript 项目骨架
- 建立基础目录分层
- 准备 Prisma / PostgreSQL 接入
- 准备开发环境配置文件
- 强化公开仓库的防泄露规则

## 技术栈

- Next.js
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL

## 本地开发

1. 复制环境变量模板
2. 安装依赖
3. 启动开发服务器

```bash
cp .env.example .env.local
npm install
npm run dev
```

## 注意事项

- 不要提交 `.env`、日志、上传文件、密钥和认证状态文件
- 当前仓库是公开仓库，默认按“敏感信息禁止提交”处理
- 验证码直显仅限开发环境使用，后续必须由环境变量控制
