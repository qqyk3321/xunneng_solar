# 废弃方案

2026-09-14：当前咨询流程不再使用 Google Maps、独立地址确认或用户登录。

这里的 `.txt` 是原实现的源码快照，仅作参考，不编译、不运行。相关 Google Maps npm 依赖已移除；旧查询 URL 仅返回 404。

其他登录、富文本实验和历史预览源码暂留原位置备查，但其页面与全部子接口已由 middleware 在开发和生产环境统一禁用，不刷新用户 session。`/test-pages` 只保留本地说明目录，不提供旧工具的运行链接。

正式首页、FAQ 和 Contact us 不是废弃功能；本次没有删除留言或旧数据库数据。历史资料不代表当前产品承诺。当前咨询流程见 `docs/tally-intake-v2-implementation.md`。
