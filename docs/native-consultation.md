# 自有咨询系统

2026-10-30 已正式上线，主站与员工站全部使用自有咨询链路，不读取或回退到 Tally。正式部署、邮件投递与全流程验收见 [发布记录](native-consultation-release-2026-10-30.md)。以下早期候选验证说明保留为开发过程记录，部署状态以发布记录为准。

## 页面与代码

- `/antigua/consultation`、`/dominica/consultation`：两步自有表单，联系方式与安装地址 → 用电资料、可选补充、隐私同意。
- `components/native-consultation/`：表单、国际电话选择、用电曲线和客户资料显示。沿用品牌样式；国旗资源随包提供，无 Tally iframe 或图片依赖。
- `lib/native-consultation/`：共享输入校验、草稿、提交接口逻辑、数据库读写及通知队列处理。
- `packages/consultation-core/`：主站和员工站共用字段、选项、类型、客户链接算法。主站直接引用源包；员工站是独立仓库，因此引用仓库内 `vendor/solortide-consultation-core-1.2.0.tgz`，不依赖父目录。变更核心后先更新版本，再运行 `scripts/native-consultation/sync-staff-package.mjs` 同步打包并更新员工锁文件；归档内容保留可检查的 TypeScript 源码。
- 员工站沿用咨询列表、详情、邮箱统计、邮件历史和权限模型，启用新功能后直接读取新表。分页、搜索、排序留在 URL，F5 和返回保留上下文。

电话使用 `react-phone-number-input` 和 `libphonenumber-js/max`：支持国旗、区号搜索和地区号码校验，保存 E.164 格式。安装地区与电话归属地区分开。邮箱做格式验证和常见域名拼写建议，不擅自改写用户输入。这里验证的是格式和号码规则；跨设备恢复编辑权限通过邮件私密链接确认邮箱访问权；手机号归属验证尚未启用。

## 数据库

候选迁移：`supabase/migrations/20261029062138_native_consultations.sql`。可直接在没有 Tally 表的数据库创建。

| 表 | 用途 |
| --- | --- |
| `consultations` | 独立 UUID、公开参考号、唯一请求编号及摘要、联系方式、地址、用电、补充答案、隐私版本和同意时间 |
| `consultation_access_tokens` | 客户详情的令牌哈希、到期与撤销状态 |
| `consultation_notifications` | 自动确认和员工重发任务、幂等键、锁定租约、发送状态及固定邮件内容 |
| `consultation_notification_attempts` | 每次发送尝试的状态记录 |
| `consultation_attachments` | 预留私有附件元数据；本次没有上传入口或存储服务依赖 |

员工查询使用四个 security-invoker 视图，均只查询新表。邮件历史视图和员工代码统一使用 `consultation_id`，不保留旧数据适配或读取 Tally 表。邮箱统计按规范化邮箱聚合，咨询仍是独立记录，不按电话或邮箱自动合并提交。所有新表启用 RLS，匿名和普通 authenticated 角色无直接读取/写入权限；仅经过主站服务接口或有效员工会话访问。

## 匿名幂等与浏览器恢复

1. 浏览器为每份草稿生成随机 `requestId`，同时保存 schema 版本、地区、当前步骤及编辑内容。
2. 发请求前先冻结输入并存储 pending 状态；双击、网络断开或 F5 后继续使用同一个编号和同一份内容。
3. 数据库事务锁和唯一约束共同保证并发重试只生成一条咨询、一个客户令牌和一个自动邮件任务。相同编号但不同内容返回 409。
4. 确认成功后删除本次草稿缓存，包括输入、定位、请求与回执。成功弹窗仅保留在当次页面内存；重新进入或刷新表单显示空白表单。旧版完成回执在进入时自动清理。只有未完成或结果未知的请求继续缓存，供恢复与幂等重试。
5. 草稿按地区隔离，跨标签页同步并检查版本。逻辑有效期 7 天，过期后下次访问替换；用户可主动清除。浏览器禁止存储时明确提示并暂停提交，避免丢失重试编号。

幂等作用于同一请求；不同浏览器、清空浏览器数据或主动开始另一份咨询属于新请求。不能用相同手机号/邮箱作为去重依据，否则会阻止合理的再次咨询。详情链接是持有即可访问的私密链接，浏览器共享设备使用者应注意清除回执。

## 邮件与附件

提交和自动邮件任务在同一事务保存，邮件失败不回滚咨询。后台每轮并发处理最多 5 个任务，数据库租约阻止重复领取；供应商请求使用固定幂等键和固定内容，临时失败退避重试。超过首次尝试 23 小时仍无法确认的任务标记失败，需核查供应商记录后由员工显式重发；避免超过供应商幂等窗口后盲目重投。

`CONSULTATION_EMAIL_MODE` 默认 disabled。预览发送必须配置测试邮箱白名单；本地使用模拟邮件服务，不向真实邮箱发送。`accepted` 代表供应商已接受，不宣称已经投递到收件箱。

已提供可由现有服务器监督运行的 `scripts/native-consultation/run-worker.mjs`，每轮完成后约 60 秒再处理下一轮；加 `--once` 可交给已有定时器调用。它调用受独立密钥保护的 POST 接口。正式发布前需要把这个进程或等效定时任务配置到已选运行环境；本次没有安装生产定时任务。

当前无需上传，因此没有购入或绑定 R2/S3。若后续增加后台附件：使用私有 bucket、受限签名上传、服务端检查大小/类型/归属、元数据关联咨询、员工授权后的短时签名下载。不将 bucket 公共化，也不把文件二进制存进咨询表。供应商选型可以在确有附件时再定。

## 开关与发布顺序

环境变量模板已补到主站及员工站 `.env.example`，均默认关闭。服务器密钥不得添加 `NEXT_PUBLIC_` 前缀。

- `NATIVE_CONSULTATION_ENABLED=true`：启用新 API、独立表单、客户详情和员工查询。主站/员工站使用同一 `CONSULTATION_DATABASE_URL/KEY` 与专用 `CONSULTATION_TOKEN_SECRET`。
- `NATIVE_CONSULTATION_PRIMARY=true`：主站原 `/[region]/consultation` 入口切换到新表单。仅设置 ENABLED 时仍保留原入口。
- `CONSULTATION_ENVIRONMENT=preview|production|local`：预览不允许误连已知生产业务库，不回退使用旧数据库凭据。
- `CONSULTATION_SITE_URL`：客户站真实 HTTPS origin；通知及员工详情链接使用它。
- 邮件还需 Resend key、已验证发件人、已发布模板、地区支持邮箱和独立 `CONSULTATION_WORKER_SECRET`。报价配置沿用现有报价模块，预览必须配置隔离的报价数据库。

获准上线后：先对目标空库应用新增迁移并配置报价 → 部署主站候选及员工站新读取能力 → 配置并验证邮件 worker → 验收两个地区、员工权限和真实邮件 → 切换 PRIMARY。没有历史导入步骤。真实用户开始提交后，紧急回退应先关闭 PRIMARY 并保留新详情/员工读取/队列，不能删表或关闭新记录访问。员工正式版本记录仅在上线成功后追加。

## 本地复现

先在主站、员工站分别安装依赖。测试数据库需 Docker，浏览器测试需 Playwright Chromium。

```sh
node scripts/native-consultation/local-database.mjs
node scripts/native-consultation/local-server.mjs
```

另开终端运行 `node scripts/native-consultation/local-app.mjs`，主站为 `http://127.0.0.1:3136`。员工测试通过 `python3 scripts/native-consultation/staff-fixture.py` 生成无真实凭据的副本，再把输出目录作为 `local-app.mjs` 参数启动，端口 3137。副本中的模拟登录仅用于本地测试，禁止部署。

局域网预览时，保持数据库代理仅监听回环地址，将主站监听地址和允许提交的来源设置为本机局域网地址（以下 IP 按实际网络替换）：

```sh
NATIVE_PREVIEW_HOST=0.0.0.0 NATIVE_PREVIEW_ORIGIN=http://192.168.1.176:3136 node scripts/native-consultation/local-app.mjs
```

同一局域网设备可打开 `http://192.168.1.176:3136/antigua/consultation/new`；Dominica 将地区路径改为 `dominica`。局域网 IP 与 localhost 使用不同的浏览器草稿存储。此命令继续使用隔离的本地测试服务，不会发送真实邮件。

验证顺序：`tests/native-consultation.integration.mjs` → `tests/native-consultation.browser.cjs` → `tests/native-consultation-staff.browser.cjs` → `tests/native-consultation-worker.integration.mjs`。浏览器脚本允许通过 `PLAYWRIGHT_MODULE` 指定模块目录；全部测试只操作固定回环地址和专用 Docker 容器。`local-database.mjs --stop` 停止容器但保留测试数据。数据库 fixture 只在首次创建时初始化，后续 SQL 变动应重建本任务的隔离数据库后重新测试。

界面证据、独立评审及设计说明保存在本地 `design/native-consultation-20261029/`，不进入正式产品。生产构建、真实服务连通和正式投递须在目标发布环境验收。

## 客户自助修改与邮件入口（2026-10-30）

表单按上下单列布局填写两页。顶部进度条和 Page 1/2、Page 2/2 仅表达页数，不可点击；继续/返回/提交负责翻页。刷新保留当前页、答案和未知提交结果的同一个请求。成功弹窗仅显示 Assessment submitted、请查收邮件和 Back to home；不显示编号、结果入口、重新填写或客服区，不自动跳转，关闭时返回对应地区首页。

不提供 My assessments、记录列表或邮箱查询页面；相应页面和公开查询/恢复接口已移除。客户从邮件二维码或邮件链接直接打开 `/[region]/submission/[token]` 对应的一份结果。二维码图片可直接点击，手机看邮件不必换设备扫码。

结果页保留详情摘要，统一通过 Edit details 原地切换为与首次填写共用的完整两页卡片。第一页编辑姓名、邮箱、电话、安装地址；第二页编辑用电和可选房产信息，沿用相同校验、地区号码和曲线选择器。进度条不可点击，Continue / Back 切页，Save changes 一次保存全部字段，Cancel 放弃草稿。保存后返回摘要并刷新预估，员工继续跟进同一记录及修改历史。

新迁移 `20261030011931_consultation_self_service.sql` 中的 `consultations.revision/updated_at`、`consultation_management_grants` 和 `consultation_changes` 继续使用。原候选中的 recovery 表/RPC 没有客户侧调用入口；本轮未删除库中数据。设备凭证为 HttpOnly、SameSite=Lax、90天有效，生产启用 Secure；数据库只存其哈希。修改和历史在同一事务写入，幂等结果先于版本检查，重试不再写历史或新建咨询。员工历史每页5条，URL保留页数。

邮件链接使用独立的、限定单份记录及当前邮箱的 HMAC 编辑凭证，放在 URL fragment 的 `edit` 参数；不由只读预览 token 推导。客户端向本记录的 `/api/consultations/[token]/access` POST 兑换设备权限，成功后移除 fragment。邮件链接可重复使用，丢失响应后安全重试，不因邮件扫描器访问消耗；记录访问被撤销/过期或邮箱改变后旧凭证无法新授权。更改邮箱后当前设备仍可编辑；如果设备权限丢失，员工可向新邮箱重发。转发完整客户邮件也会转发其管理权限；结果页 Share quote 和页面二维码专用只读 URL，不包含邮件凭证。

提交接口仅返回确认回执，不返回 previewPath，也不创建编辑设备授权或 cookie；浏览器生成的 requestId 仅供幂等重试，不作为结果访问凭证。原浏览器同样需要从邮件私密入口查看和获取编辑授权。无设备授权、也无私密邮件凭证的分享访问只读，不显示 Edit 或查询入口。编辑接口严格限制可修改字段，不能改国家、提交编号、同意时间或主键；国际手机/邮箱规则复用。RLS、服务角色限制、私密页面统计过滤和切换地区时移除 fragment 均保留。

编辑草稿在当前标签页 sessionStorage 中保存，7天过期；F5及同标签页离开返回保留，关闭标签页清除。提交前冻结请求编号/版本/内容；未知结果只能重试同次更新。冲突保留输入，用户可保留自己的修改并确认再次保存，或加载最新完整详情。两页当前页码也随草稿恢复。

邮件 worker 的首次通知和员工手动重发共用同一私密邮件链接/二维码生成逻辑。已发送邮件不回写；发送失败仍使用原冻结 payload 重试。本地仅使用 loopback 邮件 stub，不向真实邮箱投递。员工候选范围与双语说明在 `ticket-query-local/docs/self-service-edit-release-candidate.md`，没有正式版本历史写入。

本轮验证脚本（隔离本地库）：

- `node tests/native-consultation.browser.cjs`：三轮两页表单、不可点击进度、无列表入口、F5、隐私弹窗、丢失提交响应与重试。
- `node tests/native-consultation-edit.integration.mjs`：三轮并发/幂等、权限、冲突、字段限制、真实邮件 payload 的直接授权、只读 token 不可兑换、移除查询路由及过期授权。
- `node tests/native-consultation-email-entry.browser.cjs`：三轮1440/390/320、两地区，新设备从邮件直接进入、丢失兑换响应后刷新、原地编辑和保存读回、分享无编辑权限。
- `node tests/native-consultation-edit.browser.cjs`：原地编辑草稿、冲突、未知保存结果、估算刷新和只读分享回归。
- `node tests/native-consultation-edit-staff.browser.cjs`：员工历史前后值、分页/F5、手机和权限隔离。

候选证据及独立 UX 走查在 `design/native-consultation-20261030/ux-flow/`。本轮重点为流程，统一视觉优化尚未开展。未部署生产、未应用生产迁移、未发送真实邮件。

## 提交和修改操作环境（2026-10-30，本地候选）

主站迁移 `20261030025725_consultation_request_context.sql` 新增私有 `consultation_submission_context`，一条咨询只保存首次成功提交的环境；`consultation_changes.environment` 保存每次成功修改时的环境。两者与业务写入共用原有事务，重复请求返回原结果，不覆盖第一次环境，也不增加重复记录。客户使用的 `consultation_records` 视图保持不含这些字段，客户 GET、PATCH 及冲突响应不返回环境或位置。

记录内容：IP（可信来源可用时）、原始 User-Agent（最多 1024 字符）、推断浏览器/版本、系统/版本、设备类型，以及 IP 推断的国家/地区、城市和时区；提交及修改时间由数据库生成。浏览器解析复用 Next 的 `userAgent()`，不使用跨站或硬件指纹。仅 Vercel 平台覆写的 `x-forwarded-for` 被当作可信 IP；本地直连或未配置可信代理的其他部署记为空，不把可伪造的头当作事实。环境信息不参与授权和幂等摘要。

首次提交：校验答案 → 隐私确认（如尚未勾选）→ 冻结请求 → 直接提交。不调用浏览器定位或权限 API，不采集设备坐标，没有等待或跳过定位步骤。旧草稿读取时删除 location 字段并写回，保留冻结答案和 requestId；旧页面提交的 location 字段在接口中丢弃，不保存。迁移 `20261030080733_remove_consultation_gps.sql` 移除已存 GPS 列及数据，并更新提交函数忽略旧定位上下文。

首次提交与每次修改由服务端从可信 Vercel 请求头保存 IP 和 IP 所在地：国家代码、省/地区代码、城市、时区。只接受平台环境且有有效 IP 的字段，解码、长度及控制字符校验后保存；缺失字段留空，不用用户选的安装地区补全。不记录任何 IP 经纬度。新字段为 environment.ipGeo，RLS/私有接口隔离沿用现有规则；客户页面、邮件与公开分享不返回这些环境信息。员工详情及修改记录将地区标记为估算，历史无地区字段的记录显示“未记录”。

当前隐私说明版本 `2026-10-30-native-v3`；接口及 RPC 同时接受旧 `2026-10-29-native-v1` 与 `2026-10-30-native-v2`，用于此前冻结请求安全重试。保存实际提交的说明版本，不改写旧记录。员工 `/submissions/[id]` 增加折叠提交环境与每次修改的操作环境，不显示 GPS、坐标或地图入口；IP、IP 地区与 User-Agent 不进入邮件、公开结果或客户编辑数据。

部署顺序：先迁移，再主站/员工站代码；同步打包 consultation-core 1.1.0。此次仅应用到本地 Docker 隔离数据库，未发布、未写正式员工版本记录。普通 HTTP 局域网仍可填写与提交，平台 IP 信息缺失时记为空。

验证命令：
- `node --conditions=react-server --import tsx --test tests/native-consultation-environment.test.ts`
- `node tests/native-consultation-environment.integration.mjs`
- `node tests/native-consultation-no-gps.browser.cjs`
- `node tests/native-consultation-environment-staff.browser.cjs`（先运行集成测试并准备员工隔离 fixture）

完整卡片保存由 `20261030052411_consultation_full_assessment_edit.sql` 增加 `assessment` 事务分支：全部业务字段、revision 与 before/after 操作历史一起提交或回滚。旧分组 API 分支仅用于已冻结的旧草稿安全重试；界面不再提供分组编辑入口。修改不请求 GPS、不重新确认隐私、不新增咨询或自动提交邮件。

结果页保存成功显示右上角 Saved 提示，3 秒自动消失。结果页客服沿用 Knocket 窗口，但 SDK 在独立 opaque sandbox iframe 中运行，只获得公开 `/support/chat.html` 地址；不能访问客户详情或主站存储。客服访客状态只保存在该 iframe 内存，关闭后重开保留，刷新整页会重置；不自动把咨询资料提交给客服。

无 GPS 回归：`node tests/native-consultation-no-gps.browser.cjs` 验证隐私确认、新提交、旧定位草稿清理与同编号重试，浏览器定位和权限 API 均不能被调用。环境单元/集成测试覆盖可信 IP 地区字段与私有读写边界。
