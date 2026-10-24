# 日子 DAILY · 个人博客与日常空间

基于 [Tailwind Next.js Starter Blog](https://github.com/timlrx/tailwind-nextjs-starter-blog)，使用 Next.js、React 和 Tailwind CSS。保留原项目 MIT 许可证。

## 功能

- 每日图片封面、日期、星期与位置；支持上传自定义封面。
- 笔记文件上传：Markdown、TXT、PDF、图片与 Word 附件。
- 随记、日常计划、完成勾选、月历筛选和搜索。
- 管理员登录，私人记录与附件仅管理员可访问。
- Docker 单实例部署，服务端数据卷持久化、健康检查和备份。
- 博客文章位于 `data/blog`，上传笔记属于登录后的私人空间。

内置 5 张图片轮换；Word 仅作为附件，Markdown/TXT 以纯文本导入。尚未实现逐条公开笔记、多人账号和自动定位城市名称。

## 在 Ubuntu 服务器部署

### 1. 准备 Docker

已有 Docker Engine 和 Compose v2 的服务器可以直接进行下一步。没有安装时，请按 [Docker 官方 Ubuntu 安装文档](https://docs.docker.com/engine/install/ubuntu/)安装，然后确认：

```sh
sudo docker version
sudo docker compose version
```

### 2. 下载代码

```sh
git clone https://github.com/dddfff-svg/word-press.git
cd word-press
cp deploy.env.example deploy.env
nano deploy.env
```

先通过服务器 IP 测试时，将配置改为以下内容，**把 `YOUR_SERVER_IP` 换成真实服务器 IP**：

```dotenv
SITE_URL=http://YOUR_SERVER_IP:3080
BLOG_PORT=3080
BIND_ADDRESS=0.0.0.0
```

`SITE_URL` 必须与浏览器访问的协议、主机和端口完全一致。此配置用于直接通过 IP 访问；已有 HTTPS 反向代理时，改成实际 HTTPS 域名，并保持 `BIND_ADDRESS=127.0.0.1`。

### 3. 构建并启动

```sh
sudo sh scripts/deploy.sh
```

首次运行会生成独立的博客管理员密码，终端只显示一次。请保存到密码管理器；此密码与服务器 SSH 密码无关。

确认云服务器安全组允许 TCP 3080。如果启用了系统防火墙，也需放行这个端口。然后打开：

```text
http://YOUR_SERVER_IP:3080
```

使用刚生成的管理员密码登录。正式使用建议接入 HTTPS 域名；远程 HTTP 页面通常不能获取浏览器位置，仍可手动填写地点。

### 4. 检查运行状态

```sh
sudo docker compose --env-file deploy.env ps
sudo docker compose --env-file deploy.env logs --tail=100 blog
curl -f http://127.0.0.1:3080/api/health/
```

容器应显示 healthy。上传一份测试文件并保存随记后，可以重启容器验证数据保留：

```sh
sudo docker compose --env-file deploy.env restart blog
```

## 更新与备份

更新前先备份：

```sh
sudo sh scripts/backup.sh
git pull --ff-only
sudo docker compose --env-file deploy.env up -d --build
```

备份文件在 `backups/`，另行安全备份 `.secrets/` 与 `deploy.env`。不要运行 `docker compose down -v`，它会删除数据卷。

## 本地开发

```sh
npm ci --ignore-scripts
npm start
```

打开 http://localhost:3000。本地默认使用浏览器存储；Docker 默认使用服务端存储，旧的浏览器记录不会自动迁移。

## 验证与限制

- Next.js standalone 生产构建已通过。
- 服务端集成测试已通过：登录权限、上传下载、输入校验、版本冲突和重启持久化。
- 运行测试：先 `npm run build`，再 `npm run test:server`。
- Docker Compose 配置已解析检查；镜像尚未在 Docker 环境实际构建验证。
- 文件式存储支持单实例、单管理员；原模板仍有部分间接依赖审计提示。

完整配置、存储边界和备份说明见 [DEPLOYMENT.md](DEPLOYMENT.md)。

## 密码库（可选，无需域名）

已集成 Vaultwarden 的独立 Docker 服务与博客入口，进入后用独立主密码解锁。没有域名时通过 SSH 隧道访问 localhost，不直接暴露密码库端口。具体部署、注册、锁定和备份步骤见 [VAULT.md](VAULT.md)。


## Docker Hub 无法访问时

使用 GitHub Actions 构建并下载离线镜像包，服务器通过导入镜像启动，无需阿里云加速源或服务器在线构建。操作步骤见 [OFFLINE.md](OFFLINE.md)。

## 直接使用云服务器 IP＋HTTPS

保留当前 Vaultwarden，通过受信任的 IP 证书直接访问，无需域名或 SSH 隧道。配置脚本、先决条件及续期说明见 [IP-HTTPS.md](IP-HTTPS.md)。博客登录与密码库主密码解锁保持独立。
