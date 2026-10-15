# 当前报价配置

业务项目 `thiqsnscgdjwihcfpomw` 的报价功能只保存 `public.quote_pricing_settings` 一条当前配置：七项价格参数、并发版本、更新时间，以及当前发布编号/员工方案版本编号。每次上线覆盖更新这一条，不积累方案、价格历史、发布历史或员工审计。

所有方案、版本、上线过程及操作审计都在 staff 项目 `qxwngipzjddfeygswfzo`，分别由 `staff_quote_plans`、`staff_quote_versions`、`staff_quote_publications`、`staff_quote_audit` 保存，`staff_quote_state` 指向当前上线版本。

当前初始数据为 admin@solortide.com 名下的「初始方案 · V1」，包含一条初始上线记录及创建/上线两条审计。参数直接沿用原业务配置，V13 和原更新时间均不改动。

## 客户业务

客户报价详情页继续通过原 `loadPricing()` 读取同一张配置表，并使用原有公式、推荐算法和客户用电输入计算。网站页面及价格参数不因本次改造改变。

邮件只发送现有通知和详情链接。已移除 Tally Webhook 中的金额计算及 QUOTE_XCD、REPLY_DEADLINE 传参。`tally_form_submissions.confirmation_pricing` 及其冻结触发器已经移除；邮件不再依赖任何报价配置或历史。原客户表单、访问令牌、邮件发送及手动补发功能继续保留。

## 上线和存储

仅服务端 `apply_current_quote_plan` 可以写当前价格。相同发布请求可以核对当前行并确认；不同发布操作使用并发版本条件，旧请求不能覆盖新结果。所有返回结果由 staff 记录，业务库不写发布记录表。`quote_pricing_audit` 和 `quote_plan_publications` 均已删除。

先安装新入口兼容旧代码，再部署 staff；先部署不再读取快照的邮件函数，再删除字段。最后移除过渡发布接口及旧表。使用生产源文件作为发布基线，保留其他并行开发功能。

验证包括客户提交和邮件通知、客户报价详情、员工会话与权限、并发发布、相同参数新上线、迟到旧请求、结果核对及失败回滚。价格发布测试仅在隔离 PostgreSQL 容器进行，不向客户发送测试邮件。
