# Docker 部署 · 日子 DAILY

本项目在原 Tailwind Next.js Starter Blog 上加入管理员个人空间。博客文章仍公开；随记、日常计划、上传附件和每日位置必须登录后访问。

## 当前实现

- `JOURNAL_STORAGE=server`：服务端保存记录和文件，登录后可跨设备访问。
- 不依赖 Supabase；适合个人服务器的单实例部署。记录采用版本检查和原子写入的 JSON 文件，附件存到持久化目录。
- `JOURNAL_STORAGE` 不设置时保留原来的浏览器本地模式。原浏览器数据不会自动上传到服务器。
- 附件 20 MB；封面 10 MB；MD/TXT 导入纯文本，图片预览，PDF 打开预览，Word 保存原文件。
- 管理员密码以 scrypt 摘要保存，12 小时 HttpOnly 会话；接口检查登录、请求来源与字段格式。
- 记录删除后附件暂不自动清理，避免误删原文件；备份也会包含这些附件。
- 当前仅单管理员、私密个人空间；逐条公开笔记、公开随记和标签分类尚未实现。

## 服务器要求

Linux，Docker Engine 和 Docker Compose v2，能拉取 Node 官方镜像与 npm 依赖。建议至少 2 GB 内存并有可用磁盘空间；构建资源需求取决于文章量。

## 部署

将项目复制到独立目录，例如 `/opt/daily-blog`，排除 `.git`、`node_modules`、`.next`、`.npm-cache`、`.runtime`、`.secrets`、`.deploy-tools` 和本地环境文件。目录内的 Dockerfile 与 Compose 会从源码构建 Linux 镜像，不需要上传 Windows 的构建产物。

```sh
cd /opt/daily-blog
cp deploy.env.example deploy.env
```

编辑 `deploy.env`：

```dotenv
SITE_URL=https://blog.example.com
BLOG_PORT=3080
BIND_ADDRESS=127.0.0.1
```

`SITE_URL` 必须与浏览器使用的完整来源（协议、域名、端口）一致，否则写入请求会被拒绝。已有 Nginx/Caddy 反向代理时，保持 loopback 绑定并代理到 `127.0.0.1:3080`。需要直接通过服务器 IP 测试时，可设置 `BIND_ADDRESS=0.0.0.0`，同时把 `SITE_URL` 设为实际 HTTP 地址及端口。正式使用建议通过 HTTPS 域名访问；浏览器定位在远程 HTTP 页面通常不可用。

```sh
sh scripts/deploy.sh
```

首次运行生成独立的博客管理员密码，仅在初始化终端显示一次；请保存到密码管理器。不会使用 SSH 密码作为博客密码。秘密文件保存在 `.secrets/`，不会进入镜像；初始化程序不会覆盖已有凭据。

```sh
docker compose --env-file deploy.env ps
docker compose --env-file deploy.env logs --tail=100 blog
curl -f http://127.0.0.1:3080/api/health/
```

容器应显示 healthy。打开配置的站点地址登录后上传一份测试笔记，再重启容器验证保存。

## 更新

保留 `deploy.env`、`.secrets/` 和 Docker 数据卷，更新源码后执行：

```sh
docker compose --env-file deploy.env up -d --build
```

不要使用 `docker compose down -v`，这会删除笔记数据卷。不要横向扩容本服务；当前文件式存储只支持单实例。

## 备份与恢复

```sh
sh scripts/backup.sh
```

脚本会短暂停止博客，备份记录和附件到 `backups/journal-时间.tar.gz`，完成后重新启动。另行安全备份 `.secrets/` 与 `deploy.env`，并将备份复制到服务器以外的位置。

恢复应先停止博客，再将选定备份解压到数据卷，修复所有者为 UID/GID 1001，最后启动服务。恢复前先额外备份当前数据，避免覆盖后无法找回。

## 本地开发和验证

```sh
npm ci --ignore-scripts
npm start
npm run build
npm run test:server
```

服务端集成测试会在 3097 端口启动临时服务，创建临时测试数据，覆盖：未登录访问拒绝、错误密码、来源校验、上传下载、非法日期与文件类型、版本冲突、重启后数据保留和退出登录。不连接真实服务器，不使用真实密码。

## 本轮验证状态

- Next.js standalone 生产构建成功。
- 服务端集成测试通过。
- Docker Compose 文件已解析检查；本机没有 Docker，尚未实际构建镜像。
- 指定服务器的 22 端口在 SSH 协议握手前关闭连接（Paramiko 与系统 OpenSSH 结果一致），尚未登录、上传或部署。
- 原模板仍有部分间接依赖审计提示；未通过强制升级改动模板的内容处理工具链。

参考：[Next.js Docker 示例](https://github.com/vercel/next.js/tree/canary/examples/with-docker)、[Docker Compose Secrets](https://docs.docker.com/compose/how-tos/use-secrets/)。
