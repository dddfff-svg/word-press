# 使用 SFTP 更新现有博客

这是源码更新包，不是全新安装包。保留服务器上的 `/home/ubuntu/word-press` 原项目与所有配置。

1. 用 SSH 工具的 SFTP 将 `word-press-publish-update.zip` 上传到 `/home/ubuntu/word-press/`。
2. 切换 root，在服务器执行：

```sh
cd /home/ubuntu/word-press
unzip -o word-press-publish-update.zip
sh scripts/deploy-upload.sh
sh scripts/enable-blog-https.sh 124.221.187.35
```

更新包不含 `.secrets`、`deploy.env`、Compose 主配置或用户文件，不会覆盖这些数据。执行脚本时会备份现有资料、保留旧镜像，然后在服务器构建新版博客，可能需要几分钟。构建仍需 npm 依赖和 Node 基础镜像，使用已拉取成功的 ECR Node 镜像，不使用 curl 下载源码。

脚本成功后按 Ctrl+F5 刷新博客，保留原管理员密码。顶部“续火花”默认打开 `http://124.221.187.35:8000/`。后台仍由原服务管理任务及登录，原服务的数据不修改。

布局：日期与倒计时合在背景卡片里；照片与证书在封面下面；带标题的打卡按钮在当日计划下方。“我的资料”的日期、机构和说明折叠为选填。点击“更换背景”上传日期背景，或“换一张背景”使用内置图片。

如果构建失败，旧博客容器通常继续运行；请保存报错，解决后重新执行脚本，不要删除数据卷。程序回退可执行：

```sh
docker image tag daily-blog:before-layout daily-blog:local
docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml -f compose.spark.yaml up -d --no-deps --force-recreate --no-build --pull never blog
```

备份位于 `backups/before-layout/`。更详细的备份与恢复方法见 `DOCUMENTS.md`。

本版本增加城市自动识别和公开笔记。请放行安全组 TCP 8443，并使用 `https://124.221.187.35:8443/` 打开博客，密码库保持 `https://124.221.187.35/`。详细说明见 PUBLIC-NOTES.md。
