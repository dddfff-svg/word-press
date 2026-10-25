# 资料、打卡和目标倒计时

首页增加每日打卡、连续/累计/最长坚持天数、最近七天记录，以及目标倒计时。计划仍通过复选框标记完成，打卡需要单独点击；不允许通过页面补签。天数按北京时间的日历日期计算，今天尚未打卡时保留截至昨天的连续记录。目标可以添加具体年月日、标记完成、恢复和删除；当天显示“就是今天”，过期后显示已经过去的天数。

顶部桌面及手机导航均有“随记首页”和“我的资料”。Vaultwarden 保持独立标签页，不修改其内部页面。

## 我的资料

登录博客后进入 `/documents/`。上传 JPG、PNG、WebP 或 PDF，单文件最多 20 MB，可多选。支持名称、分类、机构、获得日期、到期日期、说明，支持编辑、搜索、分类筛选、图片预览及下载。PDF 在新标签页预览。到期日期目前仅展示，不发送提醒。

资料与随记共用 `journal-data` 数据卷。文件通过登录验证后读取，不放在 public 文件夹。图片检查文件签名；PDF 只有正确的 PDF 文件头才会被资料接口接受。资料列表保存在 `documents.json`，文件在 `files/`。移除资料只移除列表记录，原附件继续保留，以保护随记引用及恢复能力，不释放磁盘空间。备份包含这些原附件。

## 现有服务器升级（以 root 执行）

```sh
cd /home/ubuntu/word-press
curl -fL --retry 3 https://raw.githubusercontent.com/dddfff-svg/word-press/main/scripts/upgrade-documents.sh -o scripts/upgrade-documents.sh
sh scripts/upgrade-documents.sh
```

升级先下载代码、备份原数据，并保留原镜像标签 `daily-blog:before-documents`，然后更新明确列出的源码文件并构建。`deploy.env`、`.secrets`、Compose 文件、Nginx/证书和 Vaultwarden 数据不覆盖。仍使用现有 ECR Node 基础镜像。构建失败时旧容器继续运行；排除报错后可重新运行。依赖安装仍需要能访问 npm 软件源。

自动备份会短暂停止博客写入，备份完成后恢复博客；密码库保持运行。升级后按 Ctrl+F5，使用原管理员密码登录，检查上传及首页打卡/目标功能。

## 自动和手动备份

升级脚本安装 systemd 定时器，每天北京时间 03:00 备份。每日备份保留约 7 天，每周日保留一份周备份约 4 周。运行机器必须开启，备份依赖磁盘空间；同服务器备份不能防止服务器损坏，应另外下载到电脑或复制到异地。

```sh
sh scripts/daily-backup.sh
systemctl list-timers daily-blog-backup.timer
journalctl -u daily-blog-backup.service --no-pager -n 50
```

`backups/daily/` 和 `backups/weekly/` 中是服务器备份。“我的资料”的“下载完整备份”保存随记、计划、打卡、目标、资料及附件到电脑，不含管理员凭据和 Vaultwarden。凭据需要另行安全保存；密码库使用 `scripts/backup-vault.sh` 单独备份。

## 恢复

先运行 `sh scripts/daily-backup.sh` 备份当前状态。将需要恢复的可信归档复制为项目根目录 `restore.tar.gz`，先用 `tar -tzf restore.tar.gz` 确认包含 `journal.json`、`documents.json`（旧版备份可能没有）和 `files/`，不要使用来源不明的归档。然后以 root 执行：

```sh
docker compose --env-file deploy.env stop blog
docker compose --env-file deploy.env run --rm -T --pull never --no-deps --entrypoint tar blog -xzf - --no-same-owner -C /app/storage < restore.tar.gz
docker compose --env-file deploy.env start blog
```

这会覆盖归档中的同名数据文件；未被归档包含的现有附件仍保留。恢复后刷新浏览器再编辑，避免旧页面覆盖恢复内容。更早版本不含资料索引时，不会自动清除当前资料索引。

## 回退程序版本

```sh
docker image tag daily-blog:before-documents daily-blog:local
docker compose --env-file deploy.env -f compose.yaml -f compose.vault.yaml up -d --no-deps --force-recreate --no-build --pull never blog
```

旧版本保存随记可能丢弃新增的目标和打卡字段，回退前应备份数据。自动备份服务可用 `systemctl disable --now daily-blog-backup.timer` 停用。

## 验证

本地生产构建与集成测试覆盖未登录拒绝访问、跨来源写入拒绝、上传、资料编辑/移除、重启持久化、打卡和目标保存、备份下载和解包恢复。Docker 和 systemd 需要在 Linux 服务器上实际执行后确认，不能以本地测试代替。
