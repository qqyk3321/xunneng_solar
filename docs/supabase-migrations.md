# Supabase 数据库升级与留言 Storage

## 当前项目与范围

新项目：`thiqsnscgdjwihcfpomw`。数据库结构统一由 `supabase/migrations/` 管理。
旧项目的三份 migration 已原样移入 `docs/archive/legacy-supabase-migrations/`，不会参与新项目的 `db push`。
本次没有删除或重建 Tally 表，没有搬迁旧客户数据、旧图片或登录系统。

## 迁移历史

- `20260916161424_add_solar_analysis_access_logs.sql`：新增光伏分析授权访问日志，RLS 开启，仅 service_role SELECT/INSERT；已通过 migration 应用。记录规则、权限和验证见 `docs/solar-analysis-access-logs.md`。

- `20260915055021_add_contact_country.sql`：匿名留言增加安装地区代码和数据库生成的国家名，旧记录保持 NULL；已通过 CLI migration 应用。详见 `docs/url-regions-and-contact.md`。

- `20260915053253_baseline_tally_intake_v2.sql`：新项目已有的 Tally V2 表、字段、约束、索引、RLS 和授权基线。建立基线前已核对远程结构、生成列、identity、序列权限以及表权限；新项目没有原有 migration 历史，因此仅对这一个版本使用 CLI `migration repair --status applied` 登记，不重新执行建表。
- `20260915053355_create_contact_inquiries.sql`：新增 `anonymous_inquiries_preview`，包含普通文本、Tiptap JSON、format、邮箱、时间、图片元数据和幂等哈希。只允许 service_role SELECT/INSERT；无匿名/登录用户的直接访问权限，RLS 开启。已通过 `db push --dry-run` 确认只执行此文件，再以 `db push --linked --yes` 应用。

表名中的 `preview` 为现有代码兼容命名，实际供正式首页和 FAQ 使用。
基线覆盖应用自己的 Tally 表，不包含 Supabase 平台管理的内部表和函数定义。

## 今后的升级

先确认 `supabase/.temp/project-ref` 是预期项目；不要在同一项目并行执行需要临时数据库登录角色的 CLI 命令。

```sh
supabase migration new describe_your_change
# 编辑新生成的 SQL；不要修改已应用的 migration。
supabase migration list --linked
supabase db push --linked --dry-run
supabase db push --linked
supabase migration list --linked
supabase db advisors --linked --type security --level warn
```

以后升级使用增量迁移，不再通过旧的 `scripts/anonymous-inquiry-*.sql` 单独改表。
`migration repair` 不是日常部署步骤，只有确认结构完全一致的基线登记或历史修复才使用。
不要用 `db reset --linked`，也不要把旧项目的 migration 混回当前目录。

迁移 SQL 应纳入 Git。`.env`、`.env.tally-intake-v2`、CLI 访问凭据与本地连接缓存不纳入 Git。
从干净克隆初始化 CLI 配置时，可先使用 `supabase init`（仅在尚无配置时），再 `supabase link --project-ref <目标项目>`。
对全新的空项目正常应用两份 migration，不要把基线标记成已执行来跳过建表。

## Storage 是单独的可重复初始化步骤

```sh
node --env-file=.env --import tsx scripts/setup-anonymous-inquiry.ts
```

这个脚本读取 `.env` 中的 Supabase URL 和服务端密钥，必须与 migration 的目标项目一致。
通过 Storage API 创建私有 `anonymous-inquiry-images-preview` bucket；已经存在时只校验，不覆盖配置。
允许 JPEG/PNG/WebP，bucket 上限 1.5 MiB；应用上传接口另有限制：每张 150 KiB、最多三张。
图片本身不存入 migration，下载预览由服务端生成短时签名链接，不开放公共 bucket。

## 验证

2026-09-15 已完成云端验收：两种提交、图片读写与短时签名预览、去重、来源校验、匿名访问拒绝全部通过。
保留测试留言 ID：`e5396b2c-5b55-424a-a032-6558293079f3`（plain）、`7f798534-43b8-4e73-bf57-4e8ace9d066b`（rich）。
保留图片一张；未发送邮件。SQL 复核 RLS 开启、公开授权为零、service_role 只有 INSERT/SELECT、bucket 非公开。
Supabase security advisors（warn 及以上）无问题。152 项单元测试、TypeScript 和修改脚本的 ESLint 通过。
本次没有启动或重启本地网站、没有浏览器端到端测试、没有提交 Git 或发布 Vercel。

```sh
CONTACT_STORAGE_LIVE_TEST=1 CONTACT_UPSTASH_ENABLED=false NODE_ENV=development node --env-file=.env --conditions=react-server --import tsx scripts/test-contact-storage-live.ts
```

此脚本限定新项目，上述命令仅在测试进程中覆盖 `CONTACT_UPSTASH_ENABLED=false`，不修改 `.env` 或部署设置；不验证 Upstash 连通性。
调用真实 `/api/contact` 路由处理器并连接云端数据库/Storage（不启动 HTTP 服务器，不通过浏览器），
保留两条 `migration-test@example.com` 测试留言和一张 1 像素 PNG。
检查普通文字、富文本、换行、上传、签名预览、幂等去重、来源校验、匿名读写拒绝及图片私有性。
不发送邮件，不向 Tally 提交，不记录密钥或签名链接。

Edge Function 仍由 `supabase functions deploy` 部署；它的 Secrets 单独配置，不属于数据库 migration。
