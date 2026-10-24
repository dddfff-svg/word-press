# 服务器不能访问 Docker Hub：离线镜像部署

不要求阿里云镜像源，也不要求你的电脑安装 Docker。GitHub Actions 在云端构建博客，打包官方 Node 镜像和 Vaultwarden 镜像。服务器只需能接收上传文件并已安装 Docker Engine 与 Compose v2。

## 1. 在 GitHub 生成离线包

打开本仓库 Actions，选择 **Build offline Docker package**，点击 **Run workflow**。

将 `site_url` 填为实际博客地址，例如 `http://YOUR_SERVER_IP:3080`，选择 main 分支运行。不要填 localhost，除非博客本身也通过本地隧道访问。

等待本次运行显示绿色成功，在页面底部 Artifacts 下载 `daily-blog-offline-linux-amd64`。包中包含预构建镜像、校验文件和对应版本源码；保留期 7 天，过期后可重新运行。

工作流仅在你手动点击时运行，不需要 SSH 密码、云服务器密钥或 Docker Hub 登录凭据。源码包不会包含服务器运行数据或密码。

该包面向 x86_64 / amd64 Linux。先在服务器运行 `uname -m`，若为 aarch64 / arm64，需要改成对应架构构建，不能直接使用。

## 2. 上传并解压

将下载的 ZIP 上传到服务器，例如 `/home/ubuntu/`：

```sh
cd /home/ubuntu
mkdir -p daily-blog-offline
unzip daily-blog-offline-linux-amd64.zip -d daily-blog-offline
cd daily-blog-offline/source
cp deploy.env.example deploy.env
nano deploy.env
```

压缩包下载名称可能带额外后缀，请以实际文件名为准。正常目录结构为：

```text
daily-blog-offline/
  images.tar.gz
  images.sha256
  source/
    compose.yaml
    compose.vault.yaml
    scripts/
```

## 3. 填写配置并离线启动

配置示例，将 IP 替换为真实服务器 IP：

```dotenv
SITE_URL=http://YOUR_SERVER_IP:3080
BLOG_PORT=3080
BIND_ADDRESS=0.0.0.0
VAULT_PUBLIC_URL=http://localhost:8222
VAULT_PORT=8222
VAULT_SIGNUPS_ALLOWED=true
```

然后执行：

```sh
sudo sh scripts/deploy-offline.sh
```

脚本检查校验和、导入镜像、首次生成管理员密码，并通过 `--no-build --pull never` 启动。请保存终端首次显示的博客密码。

这条路径不使用 `scripts/deploy.sh`，也不在服务器执行 `docker compose up --build`。否则仍会尝试在线拉取或构建镜像。

## 4. 打开网站和密码库

博客放行 TCP 3080 后，通过配置的 IP 地址访问。密码库仍保持服务器本地监听，在自己的电脑执行：

```sh
ssh -N -L 8222:127.0.0.1:8222 ubuntu@YOUR_SERVER_IP
```

保持终端打开，然后在浏览器访问 `http://localhost:8222`。首次创建独立主密码；创建后把 `VAULT_SIGNUPS_ALLOWED` 改为 false，并执行：

```sh
sudo docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml up -d --no-build --pull never vaultwarden
```

详细锁定与备份说明见 [VAULT.md](VAULT.md)。

## 验证状态

工作流与脚本已做静态检查；只有 GitHub Actions 显示成功后，才表示镜像构建与容器健康检查通过。当前没有宣称已经生成可下载的镜像包。

Docker 官方支持 [save](https://docs.docker.com/reference/cli/docker/image/save/) / [load](https://docs.docker.com/reference/cli/docker/image/load/) 传递镜像。

