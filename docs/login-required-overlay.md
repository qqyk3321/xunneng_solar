# 可复用登录提示蒙层

组件：`components/login-required-overlay.tsx`。当前接入 `/my-submissions-preview`，原首页、首页测试页和认证页本身不添加蒙层。

## 行为

- 服务端判定未登录/会话无效时，显示全屏模糊蒙层与登录提示，5 秒后自动前往登录页。
- 提供 `Sign in now` 和 `Back to homepage` 两个入口；登录目标携带安全的 `returnTo`，沿用现有登录成功返回逻辑。
- 蒙层覆盖的页面内容使用 `inert`、`aria-hidden`、禁止点击和选中样式；激活后锁定页面滚动，并将键盘焦点限制在提示框的按钮内。
- Escape 和点击背景不会关闭权限提示。离开页面或 `required` 变为 false 后，清理计时器、事件监听器，并恢复之前的滚动样式。
- 自动跳转和普通点击立即登录使用 `location.replace`，避免浏览器返回时重新进入同一个倒计时提示。
- JavaScript 不可用时，服务端仍输出蒙层和 inert 背景，可以通过普通链接手动前往登录页，不执行倒计时。
- 网络/认证服务错误仍显示原有错误和刷新入口；未验证邮箱显示验证提示。这两种情况不启用倒计时，不误判为登录过期。

## 复用

在服务端完成认证检查和受保护数据查询后，用组件包住整个页面（包括页头）：

```tsx
<LoginRequiredOverlay
  required={result.kind === "signed-out"}
  returnTo="/my-submissions-preview"
>
  {/* 未登录时这里只渲染公开标题、占位内容，不传入任何受保护记录。 */}
  {pageContent}
</LoginRequiredOverlay>
```

`returnTo` 沿用 `lib/supabase-auth/return-path.ts` 白名单，目前允许 `/home-preview` 和 `/my-submissions-preview`。新增受保护页面时需同时接入服务端校验、会话刷新和安全返回路径；不接受任意外站重定向。

依据 Supabase skill，蒙层不替代服务端授权。当前页面只有 `ready` 状态才向客户端传入提交记录；未登录状态的页面背景只有公开标题和占位说明。组件不会自行轮询会话，已打开页面的状态变化需要父页面刷新或更新 `required`。

背景失活采用浏览器原生 [inert 属性](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert)，而不只是透明遮挡。

## 测试

保持已有开发服务运行，然后使用已安装的 Playwright 执行：

```sh
node tests/login-required-overlay.browser.cjs
```

如 Playwright 不在项目依赖内，可设置 `PLAYWRIGHT_MODULE` 为它的安装目录；`PREVIEW_TEST_ORIGIN` 默认 `http://192.168.1.176:3003`。脚本不启动服务、不创建用户、不登录真实账户。

本次验证了：真实路由未登录无记录、背景鼠标/选中/键盘/滚动限制、准确 5 秒跳转、立即登录、返回首页后无残留跳转、蒙层卸载后恢复交互、React StrictMode、重新激活时重置倒计时、非法返回地址、禁用 JS 的手动登录，以及手机/桌面布局。原有 31 项认证/提交测试、TypeScript 和变更范围 ESLint 也通过。
