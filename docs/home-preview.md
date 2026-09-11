# 带账户菜单的独立首页测试页

访问：`http://192.168.1.176:3003/home-preview`。

## 隔离范围

- 首页仍为 `/`，不读取登录状态、不要求登录。经用户明确确认，首页现已接入计算器与 Contact us，见 [首页改版说明](./homepage-redesign.md)。
- 复用 `DemoHomepage` 正文，通过可选的 `accountSlot` 增加账户入口。首页不传账户参数；`/home-preview` 跟随共享正文更新，但仍保留独立账户逻辑。
- 账户组件、账户样式和服务端会话读取仅由 `/home-preview` 引入。小屏布局调整限定在测试页的 CSS Module 容器下。
- 会话刷新中间件仅匹配 `/auth-preview/**`、`/home-preview` 和 `/my-submissions-preview`，不匹配 `/`、咨询或其他业务页面。
- 未修改 Supabase 云端配置、Upstash 策略或现有业务流程；不新增服务，不推送、不部署。

## 交互

- 未登录：右上角 `Sign in`。
- 已登录：头像缩写和账户邮箱；窄屏收起邮箱，打开菜单仍可查看完整邮箱。
- 菜单提供 `My submissions`、`Change password` 和 `Sign out`，支持键盘导航、Escape 和点击外部关闭。`My submissions` 进入独立的 `/my-submissions-preview`，不会改动原 `/` 首页。
- 登出仅退出当前会话（`scope: "local"`），失败保留登录状态并提示重试，成功刷新服务端状态。
- 登录入口携带 `returnTo=/home-preview`，密码登录成功后回到新首页。
- 修改密码页面提供返回新首页的链接；没有有效会话时不会展示修改密码表单。
- `returnTo` 仅允许 `/home-preview` 和 `/my-submissions-preview`，不接受任意外站或其他业务路径。无此参数时保持已有认证页行为。
- 邮件确认/重置仍沿用已有 `/auth-preview/confirm` 回调，不更改邮件配置。

## 会话处理

沿用 Supabase skill 的 SSR 会话验证要求：服务端通过 `getClaims()` 校验 cookie 中的会话，不以浏览器展示状态作为授权依据。账户菜单监听认证事件及窗口重新获得焦点，刷新服务端身份数据；原首页不引入这套逻辑。

## 本次验证

- `npx tsc --noEmit` 和变更范围 ESLint。
- `npm run test:auth`：既有认证保护测试 16 项。
- `node --import tsx --test tests/home-preview.test.ts`：返回路径白名单测试 3 项。
- 现有 3003 服务的浏览器检查：新旧首页正文和页脚 HTML 一致，原首页页头不变；登录及返回链接；未登录密码表单保护；外站返回地址拒绝；无页面脚本错误。
- 320、375、768、1440 像素视口检查：未登录入口、已登录菜单、长邮箱展示和菜单边界。
- 已登录交互使用真实账户组件与隔离的模拟 Supabase 适配器验证：键盘导航、外部关闭、修改密码链接、登出失败/重试/成功、当前会话登出参数、页面刷新。

未使用真实账号执行登录、登出或修改密码。真实会话最终验收：从新首页登录，确认回到 `/home-preview`；刷新后仍显示账户；打开修改密码页面并返回；登出后显示 `Sign in`。无需创建新的 Supabase 用户来运行上述自动测试。
