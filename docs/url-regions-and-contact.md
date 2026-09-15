# URL 地区与匿名留言国家字段

2026-09-15 实施。替代过去的 localStorage 地区方案；旧浏览器里的地区值不再读取，也不覆盖 URL。

## 路由与页面

- `/`：保留现有首页作为背景，进入即弹出地区选择。弹窗默认选中安提瓜，Continue 立即可用；用户也可改选多米尼克再继续。默认仅作用于弹窗草稿，点击 Continue 前 URL 国家仍为空，不自动导航或提交地区。确认前不能关闭弹窗或操作背景。移除 Hero 中重复的地区按钮，不额外设计入口页面。
- 直接访问或刷新地区网址不弹窗；重新访问 `/` 会再次要求选择，不读取浏览器历史存储。Header / Footer 仍可手动切换地区，手动弹窗可取消。
- `/{region}`：对应国家首页、认证、图片及计算器；继续共享首页组件。
- `/{region}/consultation`：直接可访问；地区由 URL 生成 Tally hidden 的 `installation_country` 和显示名称。刷新重新进行隐私确认，但地区不丢失。
- `/consultation`：提供地区链接，不依赖浏览器历史，也不强制回首页。
- `/{region}/faq`：共用同一份 FAQ 内容和搜索组件，路径保留地区，留言携带该地区。
- `/{region}/privacy`：复用隐私页，标准网址指向 `/privacy`，避免重复收录同一份隐私文案。
- 未支持的 region 返回 404。Header、Footer、评估按钮及跨页锚点都保留当前地区。
- 切换国家会导航，页面草稿重置，防止旧地区草稿被误归入新地区；弹窗中有说明。各标签页互不影响。

## SEO

后续第一阶段 SEO 更新以 `docs/seo-launch-stage-one.md` 为准：正式域名改为 www.solortide.com，共用 FAQ 统一 canonical 到 `/faq`，不再为重复 FAQ 发布地区 alternate / sitemap 条目。下文验证记录为当时的历史执行记录。

地区首页、FAQ、咨询页分别通过服务端 metadata 提供标题、描述、canonical 和 en-AG/en-DM/x-default 对应链接。
提供 sitemap.xml；只列正式路由，不列测试页。robots.txt 在开发或 Vercel Preview 环境禁止抓取，正式环境允许正式页面。
页面的地区内容由 URL 决定，不等待 localStorage 读取；总入口与地区页面共用布局组件。
`SITE_URL` 仍是唯一配置网址的环境变量，Vercel Production 必须填正式 HTTPS 域名，不能复制本地 LAN 地址。
本次不保证排名或收录，不添加虚构结构化数据，也不新增追踪服务。

## 留言存储

新增 migration `20260915055021_add_contact_country.sql`，经 CLI dry-run 后已 db push 到新项目。
表 `anonymous_inquiries_preview` 新增：

- `country_code`：AG / DM，旧记录为空，不猜测历史国家。
- `country_name`：数据库生成的 Antigua and Barbuda / Dominica，历史未知保持空值。

公开 `/api/contact` 必须提交且只能提交一个合法 `country_code`；普通文字与富文本采用相同校验。
国家代码包含在幂等哈希里，避免同一请求 ID 换国家却误返回旧回执。
匿名用户的国家是自己选择的安装地区，不是可信的物理位置或身份权限。URL 和表单字段都不是安全认证。
RLS、私有 bucket、现有权限和 Upstash 配置不变。无地区的总首页/FAQ 表单先要求选择地区再编辑提交。

## 验证入口

- `npm test`：包括 URL 解析、链接、国家必填/白名单/重复字段拒绝、幂等哈希测试。
- `scripts/test-contact-storage-live.ts`：真实路由处理器连接云端，验证 AG 普通文字和 DM 富文本及图片；只在测试进程中跳过 Upstash。
- `tests/site-region.browser.cjs`：使用用户启动的 3003 服务验证地区切换、刷新、前进后退、国旗、FAQ、Tally 字段及浏览器留言 payload（拦截提交，不写真实数据）。
- `tests/consultation-progress.browser.cjs`：模拟 Tally 完成消息，验证隐私、表单和完成步骤。

本轮云端测试保留两条留言：`8296006c-982a-419f-a3e7-cdb31278f08d`（AG / plain）与 `b2453c39-1f97-47ca-b673-cf515b05dd66`（DM / rich），以及一张小 PNG。两种地区代码及生成名称都已读回核对。
补测国家变更与同一请求 ID 冲突返回 409，再保留 `61bba003-85c5-4d64-98a4-c4ab9e8c4cca`（AG / plain）、`57986326-4255-4483-87e3-3ed7e47f3592`（DM / rich）和一张小 PNG。本轮合计四条测试留言、两张小图片，无真实客户数据。
未修改 Supabase Edge Function 或 Tally 表单配置，未更改 `.env` 的 Upstash 开关，未推送 Git 或发布 Vercel。

## 本轮验证范围与限制

后续默认值修正：初始弹窗真正默认 AG，不再只有安提瓜按钮获得焦点却没有选择值。已选地区的手动切换窗口仍默认当前国家，取消不会改变网址。浏览器回归覆盖无需再次点击安提瓜即可 Continue，以及改选 DM 的路径。以下“未选择时禁用”的记录是修正前历史行为。

首页弹窗补充验证（2026-09-15）：进入 `/` 自动显示，Continue 在未选择时禁用，Escape 不能跳过，背景锁定；两国选择均正确导航，地区页刷新不弹窗，回到 `/` 再次弹出。手动切换弹窗仍可取消。以上纳入隔离构建的 375/1440 浏览器测试；此次未改数据库或提交真实留言。3003 首页可响应，但在线测试访问 `/dominica/consultation` 仍在 20 秒超时，未重启服务。

- 154 项单元测试、TypeScript 检查通过；本次修改文件 ESLint 无错误，根布局已有字体警告仍保留。
- 3003 服务在监听但访问超时，未由代理启动或重启。在线浏览器测试脚本留待用户恢复服务后运行。
- 在 `/tmp/xunneng-region-build-lbPe5I` 独立副本执行生产构建，不污染工作区 `.next`。常规 build 被废弃页面原有的 no-html-link-for-pages 错误阻断；仅在副本使用 `next build --no-lint` 验证编译、类型与静态生成，全部通过，未修改项目 lint 配置。
- 已检查构建产物中的地区正文、标题、canonical、hreflang 与隐私步骤初始 HTML；八个地区页面静态生成成功。
- `tests/region-build.browser.cjs` 使用真实构建 HTML、JS、CSS 和 RSC，通过 Playwright 拦截请求提供这些文件；不启动 HTTP 服务器，API 与 Tally 为模拟。375/1440 尺寸下验证 hydration、地区导航、旧存储冲突、刷新、返回、FAQ 上下文及国家字段提交。
- Supabase security advisors 无 warn/error；三份 migration 本地/云端一致。真实存储验证与离线浏览器验证分开，不声称已对 Vercel 部署或真实 Tally 发送做端到端验证。
