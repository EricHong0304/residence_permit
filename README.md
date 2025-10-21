# 居住证办理任务展示系统（脚手架）

本仓库为前后端分离的单仓多包（npm workspaces）项目脚手架，技术栈：
- Server：NestJS + TypeScript（启用 CORS，基础路由 /api，健康检查 /api/health）
- Admin：Vue 3 + Vite + Element Plus（管理端）
- App：Vue 3 + Vite + ECharts（展示端）
- 数据库：SQLite（WAL），提供 schema/seed/views 与 Windows 初始化脚本

## 快速开始

1. 安装依赖
```
npm install
```

2. 初始化数据库（Windows）
```
./scripts/init_db.bat
```
执行后将在仓库根目录生成 .\data\app.db（WAL模式），并创建表与 daily_stats 视图。

3. 运行后端（开发模式）
```
npm run start:server
```
访问 http://localhost:3000/api/health 应返回 `ok`。

4. 运行前端（管理端 / 展示端）
```
# 管理端
npm run dev:admin

# 展示端
npm run dev:app
```

5. 构建
```
npm run build
```

## 环境变量
server/.env.example 提供示例：
```
PORT=3000
DB_PATH=./data/app.db
CORS_ORIGIN=*
```

## 代码规范与质量
- ESLint + Prettier：前后端统一规范
- Jest：后端提供基础示例测试
- Husky + lint-staged + commitlint：预提交检查与提交信息校验（Angular 规范）
- GitHub Actions：CI 执行安装 / Lint / Test / Build

## 目录结构
```
.
├─ server/        # NestJS 服务端
├─ admin/         # 管理端（Vue3 + Element Plus）
├─ app/           # 展示端（Vue3 + ECharts）
├─ db/            # 数据库 schema / views / seed SQL
├─ scripts/       # 初始化脚本（Windows）
├─ data/          # 运行时生成的 SQLite 数据库（init_db 后出现）
├─ .github/workflows/node.yml  # CI
└─ ...
```

## 许可
MIT
