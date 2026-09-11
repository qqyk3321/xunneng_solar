# Auth Preview 页面需求与拆分

两组 UI 稿已拆成实际 React 页面，继续使用已有 Supabase Auth。不改首页、咨询表单、Tally、邮件工单业务或全局登录要求。后续已接入独立的本地 Upstash 限流，详见 [认证限流说明](./auth-preview-rate-limiting.md)。

## 设计来源与页面

保留 `demo/auth_preview_sign_in_sign_up_authenticated_states/` 和 `demo/auth_preview_set_new_password_token_states/` 原稿作为参考，不将演示 HTML 或 Tailwind CDN 脚本放入应用。

| 入口 / 状态 | 功能 |
| --- | --- |
| `/auth-preview`，未登录 | 邮箱与密码登录、密码显隐、忘记密码、注册入口 |
| `/auth-preview?view=sign-up` | 邮箱、密码、确认密码；注册后按真实 session 判断进入账户页或邮件确认提示 |
| 注册确认提示 | 展示提交邮箱、收件箱提示、重发确认邮件、返回登录；重发成功后 60 秒前端按钮冷却 |
| `/auth-preview?view=forgot` | 输入邮箱申请重置；发送后使用不泄露账号是否存在的中性文案 |
| `/auth-preview`，已登录 | 展示服务端核验后的真实邮箱，修改密码、退出当前浏览器会话 |
| `/auth-preview/update-password`，有效会话 | 新密码、确认密码、保存，成功后显示独立结果卡 |
| 重置页无会话 / 回调验证失败 | 链接不可用提示、重新申请重置邮件、返回账户入口 |
| `/auth-preview/confirm` | 邮件回调；仅允许返回账户页或重置页，使用本站相对路径回跳 |

已登录用户也可以直接打开忘记密码入口。会话详情仅在开发环境折叠展示，不把调试面板放进正式账户界面。

## 组件职责

- `layout.tsx`：预览专属品牌页头、背景、卡片布局和页脚。
- `auth-ui.tsx`：卡片、标题、邮箱/密码输入框、密码显隐、行内提示、提交按钮、结果卡和图片失败降级。
- `auth-panel.tsx`：登录、注册、重置邮件请求、确认邮件重发、已登录状态和退出流程。
- `update-password/update-password-form.tsx`：设置密码表单及成功、会话失效结果。
- `auth-preview.module.css`：局部样式与手机布局；不修改全局 CSS。

## 交互边界

- 新设密码前端要求至少 8 位、两次输入一致；登录不额外限制旧密码长度。最终密码规则仍由 Auth 服务校验。
- 校验失败显示字段错误并聚焦首个无效字段；请求期间禁用表单，避免重复提交。
- 不保留稿件中的虚构账户、设备遥测、角色、固定有效期、30 天登录承诺、未实现的条款链接或模拟强度条。
- 不用 URL 参数伪造已登录身份。服务端沿用已有 claims 校验；前端不使用服务端 secret/service-role key。
- 前端倒计时配合后端 Upstash 限流；刷新页面不会清除后端计数。发送邮件的操作共享服务端冷却。
- 页面沿用设计稿英文文案。设计稿远程品牌图片加载失败时显示 ST 字母占位。

认证实现按 Supabase skill 的会话与密钥检查清单核对。确认邮件重发和认证事件订阅分别参考 [resend](https://supabase.com/docs/reference/javascript/auth-resend) 与 [onAuthStateChange](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) 官方文档。

## 本轮验证

- TypeScript 无输出检查、auth-preview 局部 ESLint。
- 通过现有 3003 服务执行浏览器检查：空表单、错误登录、密码显隐、注册密码不一致、模拟注册确认提示、模拟重置邮件提示、失效链接回跳、重新申请入口。
- 检查桌面布局，以及 375 / 320 像素手机宽度无横向溢出。
- 匿名 session 接口返回未登录，首页仍返回 200。
- 浏览器邮件请求使用模拟响应，未创建真实账号或发送邮件。真实邮箱收信、成功登录后的跨端会话、真实修改密码仍需人工联调；没有启动或重启服务器，没有执行会干扰正在运行的开发服务的生产构建。

手动检查时打开 `http://192.168.1.176:3003/auth-preview`。认证提交必须来自配置的测试 Origin。需要有效登录或有效重置链接才能看到真实的新密码表单，不能通过查询参数绕过。
