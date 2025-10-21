# 验证环境（Windows 本地/内网）

本仓库提供一键在 Windows 环境下搭建“验证环境”的脚本与最小实现（后端 + 前台 app + 管理端 admin）。目标是按接近生产的方式运行构建产物，便于快速验收。

## 前置条件
- Windows 10/11（管理员权限可选，推荐以普通用户运行）
- 已安装 Node.js >= 18（自带 npm、npx）
- Windows 自带 curl（Win10+ 默认提供）。如缺失可安装 Git for Windows 或 curl。

可选：如公司内网限制，请提前配置 npm 镜像。

## 一键搭建与启动

1. 双击或在命令行运行：
   scripts\setup_verify_env.bat

2. 脚本将完成：
   - 检查 Node.js 和 npm 可用，且 Node 版本 >= 18；
   - 初始化 SQLite 数据库（WAL 模式、基础表、daily_stats 视图、默认账号 admin/admin）；
   - 安装依赖并构建 server、app、admin；
   - 以生产方式启动后端（读取 server/.env.staging）；
   - 使用 npx serve 分别在 8080（app）和 8081（admin）启动静态服务；
   - 打印访问地址及默认账号。

3. 启动完成后访问：
   - 后端健康检查: http://localhost:3000/api/health
   - 前台（app）:   http://localhost:8080
   - 管理端（admin）: http://localhost:8081
   - 默认账号：admin / admin（首次登录后建议立即修改密码）

## 健康检查
- 运行：scripts\verify_health.bat
- 将依次校验：
  - GET http://localhost:3000/api/health
  - GET http://localhost:3000/api/analytics
  - GET http://localhost:3000/api/stations
- 全部通过时脚本退出码为 0。

## 停止验证环境
- 运行：scripts\stop_verify_env.bat
- 将根据端口终止相关进程：
  - 3000（后端 Node）
  - 8080（app 静态服务）
  - 8081（admin 静态服务）

## 环境配置

- server/.env.staging：
  - DB_PATH=./data/app.db
  - PORT=3000
  - CORS_ORIGINS=http://localhost:8080,http://localhost:8081
- app/.env.staging 和 admin/.env.staging：
  - VITE_API_BASE_URL=http://localhost:3000

更多变量请参考根目录 .env.example。

## 常见问题与排查

1) 端口被占用
- 替换占用程序端口或修改 server/.env.staging 中的 PORT，并相应修改脚本/前端变量；
- 或先运行 scripts\stop_verify_env.bat 再重试。

2) 权限问题
- 如 data 目录创建失败或无法写入 .db 文件，请确保您对仓库目录具有写入权限；
- 可以尝试以“管理员身份运行”命令提示符后再次执行脚本。

3) 缺少 curl
- Windows 10+ 一般已内置 curl；若系统不支持，可安装 Git for Windows 或独立安装 curl，并将其加入 PATH。

4) npm ci 失败（例如缺少 package-lock.json）
- 脚本会自动回退到 npm install。内网环境建议提前配置 npm 镜像以避免网络失败。

5) npx serve 失败或被拦截
- 可手工安装：npm i -g serve；然后在 app 与 admin 目录执行：
  - serve -s dist -l 8080
  - serve -s dist -l 8081

6) 管理端登录失败
- 默认账号为 admin/admin。若仍失败，请删除 server/data/app.db 后重新执行 scripts\setup_verify_env.bat（会重建数据库）。

## 项目结构（简要）
- server：最小化的 Express + SQLite（better-sqlite3）后端
- app：Vite 构建的前台静态站点
- admin：Vite 构建的管理端示例（含简单登录表单）
- scripts：Windows 一键脚本

## .env.example（STAGING 说明）
请参照根目录 .env.example 文件，其中给出了 staging 环境相关变量示例与说明。
