# 日子 DAILY

基于 Tailwind Next.js Starter Blog 的个人博客与私人日常空间。

首页提供每日图片、日期位置、笔记上传、随记、日历与日常计划。保留 `/blog`、`/tags`、`/about` 博客页面。

现在支持两种存储方式：默认保留浏览器 IndexedDB 本地模式；Docker 默认启用管理员登录和服务端持久化，文件与记录保存在命名数据卷中。原先的浏览器本地记录不会自动迁移到服务器。

部署步骤、功能边界、备份和验证结果见 [DEPLOYMENT.md](DEPLOYMENT.md)。

本地运行：`npm ci --ignore-scripts`，然后 `npm start`，访问 http://localhost:3000。

Docker 部署：编辑 `deploy.env`，然后运行 `sh scripts/deploy.sh`。第一次会生成独立的博客登录密码。
