# 密码库：Vaultwarden（无域名方案）

比较了 Vaultwarden、KeeWeb 与 Passbolt 后，本项目采用 [Vaultwarden](https://github.com/dani-garcia/vaultwarden)。它提供独立密码库，兼容 Bitwarden 客户端。博客提供导航与 Docker 部署集成，不接收密码库主密码，也不把密码存进随记或笔记数据库。

## 没有域名如何使用

默认方案：服务器 Docker 运行 Vaultwarden，只监听服务器 `127.0.0.1:8222`；你在自己的电脑建立 SSH 隧道，然后用浏览器打开 `http://localhost:8222`。SSH 连接期间可使用，不需要购买域名。换一台电脑时，需要在那台电脑重新建立隧道。

网页密码库依赖浏览器的 Web Crypto 功能，普通远程 `http://服务器IP` 不满足要求；localhost 属于浏览器允许的本地上下文。官方说明见 [Enabling HTTPS](https://github.com/dani-garcia/vaultwarden/wiki/Enabling-HTTPS)。

## 1. 先部署博客

按仓库 README 完成博客 Docker 部署。保留 `deploy.env`、`.secrets/` 和数据卷。

## 2. 配置密码库

在服务器项目目录编辑 `deploy.env`，添加：

```dotenv
VAULT_PUBLIC_URL=http://localhost:8222
VAULT_PORT=8222
# 仅首次创建账号时开启。创建后立即改回 false。
VAULT_SIGNUPS_ALLOWED=true
```

`localhost` 指你打开浏览器的电脑，访问前必须建立下面的 SSH 隧道。不要改成普通 HTTP 公网 IP，也不要将 8222 端口绑定到 0.0.0.0。

```sh
sudo docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml up -d --build
sudo docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml ps
```

默认使用已查证的 `vaultwarden/server:1.37.4` 镜像标签，可通过 `VAULT_IMAGE` 自行指定经确认的新版本。服务单独保存到 `vault-data` 命名卷。

## 3. 在你自己的电脑建立隧道

打开终端或 Windows PowerShell，执行以下命令，把 `YOUR_SERVER_IP` 替换为服务器 IP：

```sh
ssh -N -L 8222:127.0.0.1:8222 ubuntu@YOUR_SERVER_IP
```

按 SSH 提示输入服务器密码。这个窗口正常情况下会一直等待，请保持打开。若使用其他 SSH 端口，在命令中加 `-p 端口`。

随后在浏览器打开：

```text
http://localhost:8222
```

也可以从博客顶部“密码库”进入，再点击“打开并解锁密码库”。第一次创建密码库账号，设置**独立的主密码**，随后登录。博客管理员密码与密码库主密码是两套不同凭据。

## 4. 创建后关闭注册

将服务器 `deploy.env` 中的 `VAULT_SIGNUPS_ALLOWED` 改为 `false`，然后执行：

```sh
sudo docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml up -d vaultwarden
```

项目默认关闭管理员后台与邀请。已有账号仍可登录；不需要在博客或配置文件中保存密码库主密码。

## 5. 每次使用都解锁

博客入口每次会在新页面打开网页密码库，解锁由 Vaultwarden 自己处理。不要开启免主密码的 PIN 或生物识别选项；在密码库设置中选择较短的自动锁定时间和“锁定”动作，用完点击“锁定”。网页客户端刷新后也会重新锁定，相关行为见 [Bitwarden 锁定说明](https://bitwarden.com/help/vault-timeout/)。

浏览器扩展或桌面客户端的自动锁定设置相互独立。主密码请自行保管；这里没有管理员找回主密码的功能。

## 6. 更新与备份

带密码库时，更新命令须同时指定两个 Compose 文件，保留博客中的密码库地址：

```sh
sudo sh scripts/backup.sh
sudo sh scripts/backup-vault.sh
git pull --ff-only
sudo docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml up -d --build
```

博客和密码库分别备份；备份脚本会短暂停止对应服务，完整归档其数据卷。备份保存在 `backups/`，请另存到可靠位置。不要将备份、导出的密码或 `.secrets/` 提交到 GitHub。

## 以后有域名时（可选）

仓库另附 `compose.https.yaml` 与 `deploy/Caddyfile`。将两个域名解析到服务器，确认 80/443 空闲并可访问，然后设置 `BLOG_DOMAIN`、`VAULT_DOMAIN`、`SITE_URL=https://博客域名`、`VAULT_PUBLIC_URL=https://密码库域名`，使用三个 Compose 文件一起启动：

```sh
sudo docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml -f compose.https.yaml up -d --build
```

当前无域名方案不需要这个网关。

## 集成边界与验证

这是独立 Vaultwarden 服务加博客访问入口，密码库拥有自己的登录界面与密码操作界面；没有将主密码或解密后的内容交给博客。博客登录不构成密码库认证。

Next.js 页面和 Compose 配置会进行本地检查。当前环境没有 Docker，尚未启动 Vaultwarden 容器验证注册、解锁、备份或客户端同步；实际部署后请先使用测试账号验证流程，再导入真实密码。

其他候选：[KeeWeb](https://github.com/keeweb/keeweb) 适合 KeePass 文件工作流；[Passbolt](https://github.com/passbolt/passbolt_docker) 更偏团队共享。

## 直接使用云服务器 IP＋HTTPS

保留当前 Vaultwarden，通过受信任的 IP 证书直接访问，无需域名或 SSH 隧道。配置脚本、先决条件及续期说明见 [IP-HTTPS.md](IP-HTTPS.md)。博客登录与密码库主密码解锁保持独立。
