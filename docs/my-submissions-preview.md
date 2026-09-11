# 我的全部提交（独立测试页）

地址：`http://192.168.1.176:3003/my-submissions-preview`。

## 展示与操作

- 按当前登录账号的已验证邮箱查询 `tally_form_submissions` 的全部匹配记录；兼容邮箱大小写差异。不接受查询参数指定邮箱。
- 表格列为提交时间（UTC）、提交位置、Preview。默认按时间从新到旧排列，点击时间或位置表头切换升序/降序。
- 服务端按 ID 游标分批读完全部匹配记录，再对完整集合排序和分页展示，每页 20 条。不会受 REST 单次返回条数限制而只显示第一批。
- 显示总记录数、页码、上一页/下一页与刷新按钮。无记录时显示明确空状态。
- 地点优先读取 `location_json.address`，其次展示有效经纬度；没有信息时标为未提供。
- Preview 按现有 webhook 和预览页规则拼接：`/submission-preview-test?id=<submission_id><response_id><respondent_id>`，依次拼接三个 7 位字母数字 ID，在新标签打开。缺失或非法 ID 不生成错误链接。
- 没有添加聊天、回复、编辑提交或新增工单功能。
- 未登录或会话无效时启用[登录提示蒙层](./login-required-overlay.md)，禁止背景操作，5 秒后自动前往登录页，也可立即登录或返回首页。网络故障不启动倒计时。

## 隔离与权限

原 `/`、咨询页面、Tally webhook 和现有结果预览页不作改动。独立路由接入会话刷新中间件和登录返回路径白名单。`/home-preview` 的已登录账户下拉菜单新增 `My submissions` 入口，点击进入本页；关闭预取以避免打开菜单时就触发全量数据查询。本页的返回链接回到 `/home-preview`。

依照 Supabase skill 的身份校验要求，查询前使用服务端 `getUser()` 获取当前账户，要求邮箱已确认，不使用 `user_metadata` 或网址参数决定归属。旧表已启用 RLS 且撤销匿名/认证角色读权限，本次不改变这些权限；沿用现有服务端凭据查询方式，在 `server-only` 模块中使用 service-role key。该 key 绕过 RLS，因此这里的访问控制由服务器验证身份、强制邮箱筛选、返回行二次核对共同完成，不能将这个读取函数开放为任意邮箱查询接口。

不向浏览器返回数据库凭据、原始 payload 或无关字段。页面与数据库请求禁用共享缓存。请求失败、身份服务不可用、返回数据异常、后续批次失败都显示错误，不将错误或半份结果当成“没有提交”或完整列表。

参考 Supabase Postgres skill，采用游标分批读取及最小字段投影。为兼容未统一大小写的历史邮箱，目前使用转义并首尾锚定的 `imatch` 进行完整邮箱匹配；未改数据库索引。此模式适用于当前小规模测试。数据量增大后应评估邮箱规范化/相应索引，以及数据库侧全局排序分页，避免一次传输大量记录。

## 验证

自动测试：

```sh
node --conditions=react-server --import tsx --test tests/account-submissions.test.ts tests/home-preview.test.ts
npm run test:auth
npx tsc --noEmit
npx eslint app/my-submissions-preview lib/account-submissions app/auth-preview/page.tsx middleware.ts tests/account-submissions.test.ts
```

本次完成：

- 12 项新增测试覆盖身份门禁、全量批次读取、大小写与邮箱隔离、空列表、失败不返回半份结果、游标异常、配置错误、特殊邮箱字符、Preview 拼接、字段回退与全局排序。
- 现有 3003 服务浏览器检查未登录门禁、忽略外传邮箱、登录返回链接、禁止缓存、原首页不新增入口。
- 首页账户菜单回归检查：三个菜单项顺序、键盘导航、`My submissions` 点击到真实列表路由，以及返回 `/home-preview`。菜单登录态采用隔离模拟会话，没有伪造真实路由身份或操作真实账号。
- 隔离测试使用真实表格组件与 45 条模拟记录，验证三页切换、全局排序、空状态、刷新、Preview 链接，以及 320/375/768/1440 宽度布局。
- 对现有 Supabase 数据进行只读查询，确认匹配记录及 ID 拼接；没有创建用户、写入工单、修改云端配置或发送邮件。

没有使用真实账号执行完整登录验收。可手动登录上述页面，核对该账号邮箱的实际记录、排序与 Preview 内容。

官方依据：[Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser)、[PostgREST 筛选与投影](https://docs.postgrest.org/en/stable/references/api/tables_views.html)。
