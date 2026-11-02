# 自有咨询系统正式切换 · 2026-10-30

主站与员工站已正式切换为自有咨询系统。没有导入历史数据，没有 Tally 回退或新旧数据合并读取。

## 正式入口和部署

- https://www.solortide.com/antigua/consultation
- https://www.solortide.com/dominica/consultation
- https://staff.solortide.com/submissions
- 客户通过本次提交的私密邮件链接或二维码访问对应结果，不提供 My assessments 或公开邮箱查询入口。
- `/[region]/consultation/new` 仅重定向到正式表单，不是独立功能。

主站部署 `dpl_9kAtCKiYjTAD8x5pemfK7v25SDa8`；员工站部署 `dpl_6eLU9aLofWsMYfu17Bh9hyRvDy7n`。正式域名已核对指向这些部署。

发布源是正式部署基线加本任务的限定改动：主站基线 `a843b69b46f08c743932cb84f37337b51462217b`，员工基线 `dpl_3DxKjLPxLQGRS89p93uHUd2qzo3x` 的文件清单及 SHA1。没有直接上传整个混有其他改动的工作区。共用 consultation-core 版本为 1.2.0。

## 数据和邮件

业务库 `thiqsnscgdjwihcfpomw` 已应用以下四个限定迁移，并登记到 Supabase 迁移历史：

- `20261029062138_native_consultations.sql`
- `20261030011931_consultation_self_service.sql`
- `20261030025725_consultation_request_context.sql`
- `20261030034426_consultation_native_only_views.sql`

客户数据、编辑授权、通知队列和操作环境均启用 RLS；匿名及普通 authenticated 角色没有直接表权限或提交 RPC 执行权限。员工站在现有员工认证后由服务端读取新业务库。

正式发件人为 `no-reply@solortide.com`，使用已验证域名及已发布的咨询模板 `650bda63-3534-4206-8c94-4002cb956f58`；两地分别使用相应 support 邮箱回复。邮件链接和二维码都使用 `https://www.solortide.com`，私密编辑凭证仅放在 fragment；页面分享链接只读，不携带该凭证。

业务库的 `pg_cron` 任务 `native-consultation-notifications` 每分钟检查到期的 pending 任务，通过 `pg_net` POST 正式站 `/api/consultations/process-notifications`。认证密钥从 Vault 的 `native_consultation_worker` 读取；不写进任务文本。无待发任务时不发 HTTP 请求。已经验证自动队列和员工重发均由该任务处理，响应 200。此配置不依赖 Vercel 每分钟 Cron 或开发机常驻进程。

通知任务使用数据库租约、冻结内容和 Resend 幂等键；失败重试保留同一个发送任务。员工界面的“已接受”指服务商接受请求，不表示收件或阅读；本次验收另行读取了服务商投递状态及实际 Gmail 收件。

## 正式环境验收

- Antigua 桌面和 Dominica 手机浏览器从正式表单提交，验证两页进度、必填校验、刷新草稿、隐私确认和成功弹窗。
- 定位授权成功使用浏览器测试坐标；另一地区模拟拒绝授权，仍正常提交。数据库记录可信代理 IP 来源、浏览器及定位状态；客户结果和编辑接口不返回这些环境数据。
- 同一请求重试后，两地仍各只有一条咨询；原始通知各一条。员工对同一重发请求重试后，只生成一条手动通知。
- 两封自动邮件显示 delivered；Antigua 验收邮件实际到达 Gmail 收件箱。下载实际邮件二维码附件解码，确认与邮件私密链接完全相同且为正式域名。
- 全新浏览器通过收到的邮件进入，成功兑换编辑权限并移除 fragment。修改联系方式、用电、地址三组，F5 恢复草稿，保存后 revision 为 4，员工可见三次修改记录及环境；编辑期间未调用定位。
- 无授权的分享访问不显示 Edit；有效格式的未授权修改请求返回 403。匿名不能读取员工业务接口。
- 员工正常登录后验证咨询列表、详情、邮箱统计与邮箱详情、原生客户链接、提交环境和修改历史；桌面、390px 手机、中英文均验证。
- 员工重发进入新队列并成功投递（服务商 delivered）；管理员邮件页面显示两条自动发送和一条员工重发，保留操作人。
- 扫描主站根页、两地首页、FAQ、流程、表单、隐私页，以及客户结果、员工详情和管理员邮件页面链接；没有 Tally、localhost、局域网、`/consultation/new` 或已移除管理入口的业务跳转。两个旧预览别名实际跳转至正式表单。
- 两个发布源均完成生产构建和类型检查。主站单元回归中旧路由边界快照已更新为原生 API/正式别名并单独重跑通过；其余 164 项通过。员工针对本次变更的 8 项回归通过。

## 旧链路与版本

旧主站组件、员工读取/重发实现和 Edge Functions 源码备份位于 `deprecated/tally-20261030/source-backup.tar.gz`。旧 `tally-webhook`、`staff-resend-consultation` 已从正式 Supabase 删除部署；直接请求均应返回 404。`wishlist-confirmation` 保持运行。主站旧 Tally 环境变量已移除，活动业务代码没有旧适配分支。

员工数据库 `qxwngipzjddfeygswfzo` 已为 submissions、submission-detail、contacts、contact-detail、admin-emails 分别追加 v1.1 双语历史并读回；平台保持 v1.0。网页记录见 https://staff.solortide.com/updates 。

保留两条带 Native release check 标识的验收咨询，便于从验收邮件复核。验收专用员工账号在完成检查后停用；管理验收会话只用于读取并单独退出，不改变原管理员密码。没有向客户发送测试邮件。

## 运维核对

- 查看 `consultation_notifications` 的 pending/failed/accepted、next_attempt_at、lease_until、last_error，以及 `consultation_notification_attempts`；不要把冻结邮件内容或私密链接输出到普通日志。
- 查看 `cron.job` 的任务是否 active、`cron.job_run_details` 的调度结果，以及 `net._http_response` 的 HTTP 状态。队列没有任务时没有新增 HTTP 响应属于正常情况。
- 更换 worker 密钥须同时更新主站 Vercel Production 环境并重新部署、更新 Vault；两端必须一致。客户令牌密钥须保持稳定并与员工端一致，不可随部署随机更换。
- 旧源码只供人工恢复参考。恢复旧业务部署必须另行核对数据库、邮件与入口，不启用自动故障回退。员工站任何正式回退仍须追加版本记录。

## 同日修正：地区电话前缀

主站补充部署 `dpl_3WVQy55LL1P2fqPvDqWxYpWCinMq`，替代上述首发主站部署。员工站未变，无数据库或员工版本更新。

- 电话选择器及下拉列表：安提瓜显示国旗与 `+1 (268)`，多米尼克显示国旗与 `+1 (767)`；美国保持 `+1`。
- 两地输入框只编辑七位本地号码，完整国际格式仍用于缓存、校验、提交和读取。既有数据不转换。
- 支持直接粘贴本地、带地区区号、带国家代码、`+` 和 `00` 国际格式；不重复追加区号。不截断超长号码，不误删本地七位号码开头的 268/767。
- 首次填写与结果页编辑复用同一个组件。四项号码处理测试、两地手机浏览器输入/粘贴/刷新、美国和中国输入回归、现有记录编辑/切换地区/刷新草稿/真实本地接口保存及生产构建均通过。

## 同日修正：继续按钮

主站部署 `dpl_6kQA4GoZmVjQDSxfxdBALASRCBmk`：移除表单 Continue 按钮右侧箭头，只保留文字；没有员工站、数据或业务逻辑变更。


## 同日修正：定位授权等待与提交成功界面

主站部署 `dpl_A6KWMMqmuNdwwJJoPxHigYcP1aHC` 已接管正式域名，替代 `dpl_6kQA4GoZmVjQDSxfxdBALASRCBmk`。发布源与上一正式源比较仅四个文件不同：定位请求、表单等待提示、成功弹窗和其样式。员工站、数据库、邮件服务未修改。

- 移除把授权等待也算进去的 8 秒应用计时器。用户尚未允许/拒绝定位时不发送提交；主动选择 Submit without location 可继续。浏览器原生 7 秒定位采集超时保留，不包含等待授权时间。
- 继续忽略结束等待后到达的定位回调；保持冻结请求、刷新重试和幂等行为。定位拒绝、不可用、不支持及不安全上下文仍可提交。
- 从旧咨询源码中复用原 SubmissionComplete 的完成标识、布局配色、返回首页、FAQ 和地区联系信息，接入原生成功弹窗。短编号可复制，保留查看结果和重新填写；没有自动跳转，也没有恢复 Tally 运行依赖。
- 隔离发布源完成生产构建与类型检查。3 项环境/幂等单元测试通过；本地与正式域名分别验证 10 种定位情形，新增授权悬而未决 60 秒后允许/拒绝/跳过的回归。浏览器测试拦截提交接口，未新增咨询或触发真实邮件。
- 两地成功弹窗验证桌面、390px、320px 与短视口，键盘焦点、复制、刷新后完成状态、结果链接、显式重新填写、关闭和 Escape 返回地区首页，及 60 秒后仍不自动跳转。截图位于 `design/native-consultation-20261030/success-dialog/`。
- 最新发布源另存 `.vercel/releases/native-20261030/main-location-success-source.tar.gz`，上一份仍保留供定位此次差异。


## 同日修正：查看结果重复加载

主站部署 `dpl_6fww6FFFUN2v5BMxxaJekr5fAYwj` 已接管正式域名。相对上一正式源仅修改 `success-dialog.tsx` 与 `site-navigation-loader.tsx`。

- 根因：成功弹窗通过 Next Link 客户端进入私密结果页后，Knocket 隔离逻辑发现公共页面已载入客服 SDK，又触发整页 reload。因此先有结果页 RSC 请求，随后还有完整文档请求与第二次初始加载动画。
- 查看结果改为正常文档链接，在进入私密结果前一次切换文档；链接本身显示 Opening your assessment…，不再同时启动旧页面的全屏加载层。保留客服 SDK 在私密结果页不可运行的隔离规则。
- 正常点击防重复；保留新标签页等原生链接行为；通过 pageshow 恢复浏览器返回时的链接状态。
- 本地已有咨询记录及正式站两地已有验收记录，在 390px、1440px 下验证：结果页面及详情实际可见，一次文档请求、零多余 RSC 结果请求、无额外 reload、结果页没有客服 SDK、返回成功弹窗可再次查看。没有新提交、数据库写入或邮件发送。
- 成功弹窗回归、3 项导航/插件范围单元测试、生产构建与类型检查通过。没有员工站或数据库版本变更。
- 发布源备份：`.vercel/releases/native-20261030/main-navigation-source.tar.gz`。

## 同日修正：复用完整表单卡片修改

主站正式部署 `dpl_AV6t6iGqmF3CAun39o9guEE8iwdQ`，替代 `dpl_6fww6FFFUN2v5BMxxaJekr5fAYwj`。正式域名与 READY 状态已读回核对。员工应用部署不变；共享业务库新增完整修改事务，详情页版本由 v1.1 更新为 v1.2，平台仍 v1.0。

- 结果页统一 Edit details 入口，原地切换为首次填写同一张两页卡片；共享 AssessmentCard、AssessmentFields、安装地址、月用电量及完整用电曲线选择组件，不再维护三套分组编辑表单。
- 第一页包括姓名、邮箱、电话和安装地址，第二页为用电与可选房产信息；原有答案自动带入。沿用原有不可点击进度条、校验与手机布局。保存一次更新全部字段并回到摘要；取消放弃草稿。
- 当前标签页保存编辑值、页码、版本与冻结请求；刷新保留进度，未知保存结果重试相同请求。并发冲突可保留自己的修改再次确认或加载最新完整数据。
- 主库迁移 `20261030052411_consultation_full_assessment_edit.sql` 已上线并登记迁移历史。`assessment` 分支把全部字段、revision 与 before/after 环境记录放在同一事务中，失败整体回滚；旧分组仅保留在 API 中供已冻结草稿重试。匿名和普通认证角色无 RPC 执行权限。
- 本地 1440px / 390px / 320px 真实接口覆盖地址校验、两页刷新、曲线/可选字段、响应丢失后重试、取消、冲突、只读分享和无横向溢出。实际邮件入口三轮通过；定位流程十种回归通过。原子回滚与角色权限检查、九项单元测试、类型检查、隔离生产构建通过。
- 正式站沿用两地已有验收记录，通过真实邮件私密入口验证卡片预填、修改地址与用电、两页刷新、保存、回读，再恢复原测试值。每次保存仅一条 revision；邮件数量未增加；修改记录含 IP 和 User-Agent，不含 GPS。
- 正式员工站通过临时员工账号核对两地 before/after 历史、操作环境及手机布局。此次仅增加共享事务分支，现有员工历史组件已支持全部字段，无需重部署员工应用。
- 发布源码备份 `.vercel/releases/native-20261030/main-full-edit-source.tar.gz`，当前源备份同步更新；之前的发布备份继续保留。
- 员工更新记录已追加并读回：详情页 v1.2，平台 v1.0；正式 `/updates` 以及详情页版本入口均已验证。

## 同日修正：保存提示与结果页客服

主站部署 `dpl_F991Bb896LDFDfosGSv1tR8n6smL`，替代 `dpl_AV6t6iGqmF3CAun39o9guEE8iwdQ`。本次只有七个主站文件，没有数据库、员工站或邮件变更。

- Saved 从详情标题行移到视口右上角，以轻量提示显示 3 秒后自动消失；通过 portal 避免卡片容器影响定位，不遮挡点击、不改变详情排版。
- 两地结果页增加与首页相同的 Knocket 客服窗口。第三方 SDK 位于 `/support/chat.html` 的 opaque sandbox iframe 内，不能读取父页面、私密结果 URL 或站点存储；不传客户字段，Referrer 为空。父页面仅接收来自本 iframe 的展开/收起布尔消息。
- SDK 会话存储仅保存在 iframe 内存中，使重复读取使用同一访客身份；不共享主站 localStorage/cookie，页面重载后此客服会话状态不保留。实际 SDK 使用 Shadow DOM，展开状态与键盘入口在其 shadow root 中观察和处理；Escape 可收起。公共页面原有组件继续使用原方式。
- 本地真实接口验证保存提示出现、位置、自动消失，桌面和手机打开客服、进入聊天表单、输入但不发送、关闭和重新打开。第三方请求未出现私密 token，父页面没有顶层 SDK，sandbox 无法读取父页面位置。初期的 SDK 身份不一致报错已通过独立内存会话修复，最终浏览器验证无页面脚本报错。
- 生产构建、类型检查及四项路径/导航测试通过。正式站测试使用已有验收记录的邮件入口；保存响应仅在浏览器拦截模拟，不修改客户数据、不发送提交邮件，也不发送客服测试消息。
- 备份 `.vercel/releases/native-20261030/main-support-toast-source.tar.gz`；前一发布源继续保留。
- 正式域名 READY 状态与部署 ID 已核对；Antigua 桌面、Dominica 手机的保存提示和实际客服打开/聊天输入表单/关闭/重开均通过，零脚本报错、无私密链接外传。临时验收链接文件已清除。

## 同日修正：提交后清除成功缓存

- 确认提交成功后删除本地区的草稿缓存，不持久化回执、结果链接、填写内容或定位；成功弹窗只存在于当次页面内存中。
- 重新打开、刷新、浏览器返回恢复时仅恢复 unfinished 草稿；旧版本留下的 complete 回执自动替换为空白新表单，不重复显示成功弹窗。
- 未确认结果的 pending 请求保留原 requestId、冻结答案和定位，仍可在刷新后安全重试。其他标签页收到缓存清除后丢弃已提交的旧答案，原提交标签页保留当次成功弹窗。
- Start another assessment 会尊重另一个标签页已经开始的新草稿，避免覆盖其内容。
- 实际修改仅主站表单组件；无数据库、邮件及员工站版本变更。本地两地通过成功清除、刷新/重入、旧版回执清理、丢失响应后同请求重试、BFCache 恢复、多标签页清除和新草稿保护。成功弹窗键盘/复制/320px 与短视口、查看结果单次导航及返回空白表单回归通过；九项单元测试、类型检查与生产构建通过。
- 中间发布 `dpl_GYmtrsXxuMN7bWeSBCACrb4VD1mk` 完成缓存清除并通过两地正式站验证，随后追加多标签页新草稿保护。
- 最终正式部署 `dpl_CsbcAC2WB44qmZWLFK1hfwKTmNRe` 已接管正式域名，READY 与部署 ID 已读回核对；新增的多标签页新草稿保护在正式站复测通过。浏览器提交接口由测试拦截模拟，不产生咨询、邮件或业务数据变更。
- 发布源备份 `.vercel/releases/native-20261030/main-completion-cache-source.tar.gz`，当前源备份同步更新，之前的正式源仍保留。

## 同日修正：等待定位授权与简洁邮件确认

主站正式部署 `dpl_4y53ivHGgqprsrNySBfmWME7UnXJ`，替代 `dpl_CsbcAC2WB44qmZWLFK1hfwKTmNRe`。`www.solortide.com` 和 `solortide.com` 均已读回该 READY 部署；员工应用仍为 `dpl_6eLU9aLofWsMYfu17Bh9hyRvDy7n`。

- 纠正两处权限绕过：冻结草稿的 interrupted 定位状态在刷新/重试时重新等待；浏览器 PermissionStatus 仍为 prompt 时，提前到达的定位错误回调不能代表用户拒绝，也不能触发提交。
- 改用 watchPosition 和权限 change 监听，明确 granted 后才启动 10 秒采集计时。允许后采集一次，拒绝或主动 Submit without location 后继续；未决定不自动跳过。完成、跳过或卸载时 clearWatch 并移除监听和定时器。已取得定位/拒绝/跳过的未知提交结果仍复用同一请求与环境重试。
- 成功弹窗缩为 420px 卡片，仅保留 Assessment submitted、Please check your email to view your assessment. 和 Back to home；关闭/Escape 返回对应地区首页。不显示编号、查看结果、重新填写、客服区，不自动跳转。确认成功后仍删除浏览器草稿，重入空白。
- POST 只返回内部确认字段 id/reference/submittedAt，不再返回 previewPath、不创建管理设备授权、不设置管理 cookie。浏览器 requestId 仅用于幂等；结果查看及编辑授权从邮件私密入口进入。邮件生成、通知任务、访问凭证兑换与只读分享保持现有实现。
- 本地通过九种定位状态/刷新/丢失响应测试，原生 Chromium 权限状态等待测试，三种尺寸成功弹窗键盘/无自动跳转/返回空白表单、两地完成缓存、多标签页、BFCache；三轮真实本地邮件入口及编辑权限/并发更新、环境隔离、16 次并发提交、通知幂等与角色权限检查通过。类型检查、九项单元测试、隔离生产构建通过；既有字体/ARIA/lint 警告未在此次扩大修改。
- 正式站验证 1440/390/320px 两地简洁弹窗、键盘、返回首页与空白重入；GPS 刷新后仍等待。原生 Chromium 权限用 CDP 控制 prompt/granted/denied，保持 prompt 15 秒确认零 POST，分别允许、拒绝、主动跳过后仅发一次请求。浏览器 UI 测试拦截提交接口，不发送邮件，不将模拟坐标写入生产。
- 两地生产 API 验证使用已有验收记录的原 requestId 和摘要完全匹配的冻结答案重试；返回原记录、不含预览路径、不设置 cookie，前后通知、管理授权与咨询数量一致，没有新增邮件或咨询。
- 发布仅六个主站实现文件；无数据库迁移、员工功能或版本变更。源码备份 `.vercel/releases/native-20261030/main-email-success-source.tar.gz`，当前源同步更新，旧发布源保留。

## 同日变更：取消 GPS，增强 IP 地区信息

主站正式部署 `dpl_DLs7JqRG2JLGPbVeFZXLrw5NfKRw`；员工站正式部署 `dpl_3XJfX2t5Kgaxg5fKNxSNxtJkVubv`。发布源码逐文件 SHA1 与正式 Vercel 源清单核对一致（主站 831、员工站 218 个源文件），仅叠加本次限定文件，没有上传其他工作区改动。

- 主站移除浏览器 GPS/权限调用、定位等待与跳过操作、定位同意文案。提交在校验及隐私确认后直接进行。成功弹窗保持简洁、邮件入口及确认后清缓存行为不变。
- 旧浏览器草稿读取时清除 location 并写回，保留冻结答案与 requestId；旧客户端请求中的 location 在服务端丢弃。数据库迁移 `20261030080733_remove_consultation_gps.sql` 已应用并登记，移除 location 列及既有坐标数据，提交函数不再写定位。RLS、匿名禁止读写和原业务幂等摘要均保留。
- 首次提交和后续修改由服务端读取可信 Vercel IP 与地区头，保存国家代码、地区代码、城市与时区；解码、长度、格式和控制字符检查后存储，不保存 IP 经纬度。不接入额外收费服务。缺失或旧记录未保存的字段显示未记录，不猜测或补写历史地区。
- 员工询价详情和客户修改记录显示 IP 所在地（估算），明确可能为运营商或 VPN 出口。移除 GPS 状态、坐标和地图链接。统一详情、提交环境、修改记录、邮件记录卡片间距：桌面 28px、手机 20px；保留既有布局和操作。
- 共用 consultation-core 1.3.0；隐私说明 v3 描述 IP 地区信息并明确不收集设备坐标，接口及数据库继续接受 v1/v2 已冻结请求。隐私页面同步纠正为提交成功清除缓存、查看入口由邮件提供。
- 本地九项主站单元测试、七项员工相关单元测试、两端类型及生产构建通过。环境真实数据库集成验证幂等首次记录、修改操作、GPS 列删除及权限隔离。三种无 GPS 浏览器流程通过：新提交、旧定位草稿恢复、响应丢失重试。员工中英桌面/手机验证字段、四张卡片间距、分页/F5、无横向溢出和拒绝访问。
- 正式站 Antigua 与 Dominica 真实提交测试使用明确命名的测试记录和 Resend 测试收件地址：零 GPS/权限调用、请求无坐标、实际平台 IP 地区入库；同编号重试仍一条咨询/通知，不直接授予编辑权限。浏览器拦截测试另覆盖旧草稿和未知结果重试。
- 使用实际通知生成的邮件入口进入两地测试结果，复用完整卡片修改安装地址成功；操作历史保存 IP 地区，无 GPS 调用，无额外邮件。正式员工登录验证两地中英详情、地区显示、卡片间距、刷新及手机宽度；查询列表保持正常。
- 员工详情页已追加 v1.3 中英文记录并读回，平台仍 v1.0，询价列表仍 v1.1；更新记录页面已验证。记录发布时间为 2026-10-30 16:20:56（北京时间）。
- 源备份 `main-ip-only-source.tar.gz` 与 `staff-ip-only-source.tar.gz` 位于 `.vercel/releases/native-20261030/`，当前源同步更新。已删除的 GPS 数据不会通过回退代码恢复；回退旧版本前需处理数据库列兼容，不能直接回退旧定位功能。
- 最终核对：两地客户修改后的 IP 地区已在正式员工操作历史中显示；两条测试通知均为 accepted。临时员工已停用、其登录会话全部撤销，临时登录凭据和浏览器会话文件已删除。两个主站域名及员工域名部署均为 READY。

## 提交来源统计上线

- 员工站正式部署：`dpl_JAN7YP6CU2Gh3haimKFduAJAvtvP`（`ticket-query-local-ug3b-mxr05zwah-solortide2026.vercel.app`）。仅统计页及其组件，主站部署仍为 `dpl_DLs7JqRG2JLGPbVeFZXLrw5NfKRw`。
- `/contacts?tab=sources` 新增提交来源统计：IP 国家（估算）、设备、小时/天/周/月趋势，默认近 30 天、北京时间。时间明细支持精确数值；空区间补零，缺失来源显示未知。
- 业务库迁移 `20261030083928_consultation_source_statistics`：首次来源上下文增加存储生成字段和三个覆盖索引，私有汇总 RPC 仅 service_role 可调用。首次提交快照唯一，不读取修改记录；新请求独立计数，同次重试不增加记录。不恢复 GPS。
- 验证：事务回滚 SQL 测试覆盖新建/重试/修改/重新提交/权限/时区边界/筛选/零值；5000 条隔离样本 EXPLAIN 确认时间范围索引；TypeScript、定向 ESLint、正式构建通过。三轮本地浏览器回归，三轮故障恢复；独立 UX 两轮，修复标签往返条件丢失。
- 线上普通员工实测：总数 6，与 6 个首次快照相符，11 条修改不计入；国家、设备、小时明细、刷新及标签往返、英文手机布局和空结果通过；匿名跳转登录。无需发出新测试邮件。
- 员工版本范围 contacts v1.1 → v1.2，平台 v1.0；正式验证后追加双语记录并核对。视觉与测试证据：`design/submission-source-stats-20261030/`。
- 维护旧邮箱列表单测夹具，将仍引用 Tally 表的测试数据源改为已上线的 native 表，业务代码未因此改变。

## 来源统计时间范围与面板交互升级

- 首次发布 `dpl_3jjwB4pwuiH1sov45tKM44ZPK6MH`，contacts v1.3；正式功能检查后发现浏览器与服务器国家名称翻译不同，引起 React hydration 重绘，随后发布补修 `dpl_GX6CdnYJisNGJ7zTiqCmgTS5hbqB`（`ticket-query-local-ug3b-ltfmkawaa-solortide2026.vercel.app`），contacts v1.4。平台 v1.0，主站部署不变。正式历史保留两次发布，不覆盖。
- 顶部趋势面板内选择最近 1h/6h/1d/7d/1mo（30 天），并支持北京时间自定义分钟起止。按范围自动使用 5min/15min/1h/6h/1d/7d 分段，直线连接真实数据点；空时段补零、范围边缘的分段只计有效部分。
- 国家与设备在对应面板的筛选控件或数据行中选择，顶部仅显示当前条件摘要；支持清除、F5、返回和页签往返。流式页面结果未就绪时禁用旧条件控件，避免快速切换丢条件。国家名称统一在服务器生成并序列化，避免客户端 Intl 版本差异引起重绘。
- 业务迁移 `20261030090850_consultation_source_time_windows`：新私有时间戳窗口 RPC，限制日期长度和时间点数量，仍只聚合首次快照；新增 `(ip_country,device_kind,recorded_at)` 联合索引。保留已有日期 RPC 供前版回退。无 GPS 或新外部依赖。
- 检查：SQL 精确区间、部分桶、零值、组合筛选、权限，原幂等/修改排除测试；11 项相关单测、TypeScript、定向 lint 和正式构建通过。三轮桌面/英文手机浏览器回归、三轮失败恢复；独立 UX 两轮并修复手机条件可见性。模拟浏览器 Intl 名称差异回归通过。
- 最终线上普通员工验证五个快捷范围、自定义分钟范围、数据库总数与时间明细求和、国家设备筛选和清除、标签往返、刷新、手机空结果、自定义输入及匿名拒绝；最终浏览器无 hydration/runtime 错误。
- 证据：`design/submission-source-stats-v2-20261030/`。最终源码归档 `staff-source-statistics-v2-source.tar.gz`，不包含凭据。

### 提交来源统计：局部数据刷新（正式上线）

- 范围：员工站 `/contacts?tab=sources`；页面 v1.4 → v1.5，平台保持 v1.0。
- 刷新及时间/国家/设备筛选改用统计组件内部的 React transition；仍由服务器校验员工会话并重新读取统计，不触发工作区全局加载遮罩，也不做 document reload。
- 来源统计的 Suspense boundary 不再随筛选参数重新挂载，保留 chart 实例及时间明细展开状态；刷新保留未应用的自定义日期，筛选导航明确 `scroll: false`。
- 刷新按钮以 `aria-controls` 指向统计区，仅统计区 `aria-busy` 和简短状态文字提示加载；不遮挡已有数据。
- TypeScript、定向 ESLint、既有三轮来源统计浏览器回归通过；新增慢请求桌面/手机浏览器检查验证一次请求、无全局遮罩/文档导航、节点实例/滚动/日期/明细保留以及故障后重试恢复。

- 正式部署 `dpl_5jEdm2tZhgzRjuwiQnUkngTdtb3G`（`ticket-query-local-ug3b-dvmd1scjy-solortide2026.vercel.app`）已绑定 staff.solortide.com。正式站 1440px / 390px 慢请求检查通过，无 hydration/runtime 错误；部署 228 个源文件与隔离候选完全匹配，主站部署未变。
- 2026-10-30 17:52 北京时间追加页面 v1.5 中英文更新历史，读回 current/history 与更新记录 UI 核对通过，平台仍为 v1.0。临时员工停用并撤销会话。

### 统计卡片及筛选标签固定布局（正式上线）

- 员工站 `/contacts?tab=sources`，页面 v1.5 → v1.6；平台保持 v1.0。
- 图表筛选摘要始终保留 32px 单行标签槽，长标签横向滚动；国家/设备面板各保留固定 44px 清除标签槽。
- 趋势卡片桌面 600px / 手机 640px，分类卡片桌面 320px / 手机 300px；筛选栏保持在卡片顶部，数据内容、长列表及时间明细在卡片内部滚动。
- 桌面/手机浏览器实测选择/清除国家和设备、无数据筛选、展开时间明细、自定义时间均不改变卡片尺寸及页面位置。验证内部横向/纵向滚动与无整页横向溢出。类型检查及定向 ESLint 通过。

- 正式部署 `dpl_9dHbkQERfx6iD24AaZUBWvHeggpc`（`ticket-query-local-ug3b-eh4eee6ea-solortide2026.vercel.app`）已绑定 staff.solortide.com；线上桌面/手机检查通过，卡片及 canvas 位置在筛选变化时不变。228 个正式源文件与隔离候选完全匹配，主站未改动。
- 2026-10-30 18:12 北京时间追加 v1.6 中英文更新历史，current/history 读回和 UI 核对通过。临时验证员工停用，会话撤销。

### 2026-11-02：补齐 GitHub 源码并恢复 main 发布链路

本次把此前在 Vercel 上线但未提交的主站、员工站源码、迁移、测试与文档同步到各自 GitHub `main`。后续只由 Vercel Git 集成部署 `main`，不再从本地副本创建或提升生产部署。员工站运行代码与 2026-10-30 v1.6 一致，本次仅补齐仓库、测试及发布指引，不重复增加功能版本记录。

补齐此前被忽略的共享提交时间模块、来源统计 SQL 回归用例、邮件模板/示例配置和 Tally 人工恢复归档；员工站邮件历史路由测试改用当前 UUID 编号。环境凭据、依赖缓存、本地设计证据不提交。
