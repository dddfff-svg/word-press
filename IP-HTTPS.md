# 直接通过云服务器 IP 访问 Vaultwarden（HTTPS）

保留现有 Vaultwarden。博客仍使用 `http://服务器IP:3080`；密码库使用 `https://服务器IP`。点击博客密码库入口后，在 Vaultwarden 中使用自己的账号与主密码解锁，不提供单点登录。

Let’s Encrypt 现已支持公网 IP 证书，有效期约六天，因此脚本会配置每六小时检查续期以及续期后重载 Nginx。参考：[官方 IP 证书与 Certbot 说明](https://letsencrypt.org/2026/03/11/shorter-certs-certbot.html)。

## 前提

- Ubuntu 服务器，固定的公网 IPv4，当前博客与 Vaultwarden 已正常运行。
- Vaultwarden 保持 `127.0.0.1:8222:80` 的端口映射。
- 安全组允许公网 TCP 80（证书验证）和 443（HTTPS）；8222 不对公网开放。
- 能访问 Ubuntu 软件源、Python 包源及 Let’s Encrypt。
- 80/443 未被其他程序占用。已有 Nginx 站点时先检查同 IP 的配置是否重复；不要覆盖其他站点。

脚本仅配置主机 Nginx、Certbot、续期服务，并更新 deploy.env 的 VAULT_PUBLIC_URL；不重建 Docker 镜像、不删除数据卷，也不自动停止其他 Web 服务。若既有 Nginx 配置冲突或网络不通，应先解决冲突再运行。

## 1. 下载到现有部署目录

若原来是 ZIP 解压安装，不要直接 git pull。在服务器执行：

```sh
cd /home/ubuntu/word-press
mkdir -p deploy scripts
curl -fL https://raw.githubusercontent.com/dddfff-svg/word-press/main/scripts/enable-ip-https.sh -o scripts/enable-ip-https.sh
curl -fL https://raw.githubusercontent.com/dddfff-svg/word-press/main/deploy/nginx-vault-ip.conf.template -o deploy/nginx-vault-ip.conf.template
```

## 2. 检查端口并放行

先在云控制台安全组放行 TCP 80 和 443。查看主机端口：

```sh
sudo ss -lntp '( sport = :80 or sport = :443 )'
```

若启用了 UFW，也放行这两个端口，不要执行 ufw enable 改变现有启用状态：

```sh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## 3. 执行配置

```sh
sudo sh scripts/enable-ip-https.sh 124.221.187.35
```

首次申请会交互询问邮箱与服务条款，请自行阅读确认。申请失败时脚本会停止；不要忽略报错继续执行后续配置。完整过程成功后会显示密码库地址。

脚本会备份 deploy.env 和本项目 Nginx 配置；备份不应上传到 GitHub。

## 4. 验证访问

自己电脑打开 `https://124.221.187.35`，应能看到正常受信任的 HTTPS 页面并登录密码库。博客仍是 `http://124.221.187.35:3080`，其“密码库”入口会指向新的 HTTPS IP 地址。服务器端脚本最后也会检查证书和响应，不跳过 TLS 验证。

如果已经创建了密码库账号，保持 deploy.env 中 `VAULT_SIGNUPS_ALLOWED=false`。主密码和博客密码不会改变。

## 5. 检查续期与日志

```sh
sudo systemctl list-timers daily-vault-cert-renew.timer
sudo journalctl -u daily-vault-cert-renew.service --no-pager -n 60
sudo tail -n 60 /var/log/letsencrypt/letsencrypt.log
```

80 端口必须持续可达。续期脚本路径：`/opt/daily-vault-certbot/bin/certbot`；更新 Certbot 时使用该虚拟环境的 pip。

## 现有 Vaultwarden 数据

更换访问地址不会删除密码库数据，但旧地址的浏览器登录状态不共用，新地址需要重新登录。账号与密码记录仍在原 `vault-data` 卷中。

## 验证状态

脚本只做本地静态检查，尚未在你的服务器执行或申请实际证书。以脚本运行结果、外部浏览器访问以及续期测试结果作为部署成功的依据。

