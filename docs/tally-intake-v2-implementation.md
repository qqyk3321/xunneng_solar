# 无地图咨询与新 Supabase 接收端

日期：2026-09-14。未推送 GitHub、未发布 Vercel、未更改 Tally。没有重启已有 3003 服务。

最新状态（2026-09-14）：本地 NEXT_PUBLIC_TALLY_INTAKE_FORM_ID 已指向 `9q8RYQ`。根据用户提供的真实 webhook 请求体，已配置新项目的九个字段映射并设定 `TALLY_INTAKE_ENABLED=true`；原签名密钥保持不变。本地私有 `.env.tally-intake-v2` 与云端配置摘要一致。下文早期“准备中”及“等待映射/关闭接收”记录描述启用前状态，以本段为准。

启用验证：使用实际字段映射发送一条合成签名测试请求，返回 200；重复请求返回 duplicate=true；无效签名返回 401。通过数据库读取确认只有一条测试记录，邮箱、电话和地址字段保存正确。保留的测试 submission_id：`config-test-fea0b163-0daa-4a0d-938e-b21a7a3402da`，名称为 `Webhook Configuration Test`。没有重放用户的真实提交，没有下载附件。仍需 Tally 端重试失败请求，以确认其签名配置和完整投递链路。

注意：`scripts/test-tally-intake-v2.mjs` 是启用前测试脚本，会尝试临时切换配置；当前已启用，不要运行该脚本。后续验证必须保持实际配置不变。

## 已实施

- `/consultation` 读取现有 `sol-tide:installation-region:v1`。缺失/无效时返回首页并弹出国家选择；读取完成前不加载 Tally。浏览器禁止存储时提示允许存储，不用内存国家绕过检查。
- 国家有效时，隐私确认后进入 Tally，URL 只传国家与嵌入样式参数，不携带旧 location_json。AG/DM 与首页一致；刷新回到隐私确认。
- 使用独立 `NEXT_PUBLIC_TALLY_INTAKE_FORM_ID`；尚未配置，因此本地显示“表单准备中”。旧 `NEXT_PUBLIC_TALLY_FORM_ID` 不再用于当前咨询入口。
- 完成消息校验 Tally origin、实际 iframe 的 source 和对应 formId，不把无关或损坏的 postMessage 当作提交成功。
- Google Maps 组件、查询库和旧接口实现移入 `docs/archive/*.txt`，不会编译或运行；删除 Maps SDK 依赖。原 `/api/geocode`、`/api/reverse-geocode` 仅保留 404 响应，不调用外部服务。地图样式和部分纯数据辅助函数仍是历史代码，不产生 Google API 请求。
- 首页卫星方案文案不改。隐私页删除地图收集说明；Google 字体和图片仍是独立资源，不等于 Maps API。
- 所有旧测试页及子接口（含登录、注册、回调、上传、提交预览）由 middleware 在开发/生产均禁用。`/test-pages` 仅作为本地归档目录，无旧页面操作链接。代码保留，不创建或迁移账户。
- 正式 `/api/contact`、首页 Contact us 和 FAQ 留言不变，仍使用原有本地/生产数据库环境变量；本轮没有迁移其表和图片 bucket。

## 新 Supabase

固定目标：`thiqsnscgdjwihcfpomw`。CLI 已关联到新项目；这不代表网站 `.env` 也切换了。以后运行 `--linked` 命令前应再次核对目标。

表：`public.tally_form_submissions`。country_code、country_name（数据库生成）、name、email、phone、address JSONB、payload JSONB、form_id、submission_id、event_id、submitted_at、received_at。没有登录依赖，没有旧地图或预览 URL 必填约束。

表启用 RLS，撤销 PUBLIC/anon/authenticated 权限；接收端 service_role 只授予表 SELECT/INSERT 和必要序列权限。唯一约束 `(form_id, submission_id)`，重试不覆盖原记录。没有匿名查询端点。

初始化脚本 `scripts/setup-tally-intake.sql` 用于空的新项目，遇到已有表会失败，不覆盖数据。权限加固脚本 `scripts/harden-tally-intake.sql` 已执行；还撤销新项目默认 `rls_auto_enable()` 事件触发函数的公开执行权限，不删除触发器或改变其功能。旧项目没有改动。

函数：`supabase/functions/tally-webhook/index.ts` 和 `intake.ts`。仅新流程，无旧邮件逻辑。请求体上限 1 MiB、Tally 官方 HMAC 签名、显式字段 key 映射、国家/文本/邮箱/电话校验，保存超时或失败返回可重试的 503。完整 payload 保留其他业务字段，但不抓取附件 URL。

请求身份不使用 Supabase 用户 JWT（Tally 没有用户 session），部署使用 `--no-verify-jwt`，由函数校验 `Tally-Signature`。

## 部署与启用

已部署地址：`https://thiqsnscgdjwihcfpomw.supabase.co/functions/v1/tally-webhook`。

当前 `TALLY_INTAKE_ENABLED=false`、`TALLY_INTAKE_CONFIG={}`，POST 返回 503；浏览器 GET 返回 405 是正常的，不是打开网页。

私有 `.env.tally-intake-v2` 含 Signing secret（chmod 600、Git 忽略），不上传 GitHub。不复制网站 service-role key 到 Tally。

收到 Tally agent 的 formId 和九个字段 key 后，把交接对象配置为 TALLY_INTAKE_CONFIG；安全配置同一 Signing secret，完成测试后启用 TALLY_INTAKE_ENABLED。网站再设置 NEXT_PUBLIC_TALLY_INTAKE_FORM_ID。新库与旧库不自动同步。

部署命令（只对新项目）：

```sh
supabase functions deploy tally-webhook --project-ref thiqsnscgdjwihcfpomw --no-verify-jwt --use-api
supabase secrets set --env-file .env.tally-intake-v2 --project-ref thiqsnscgdjwihcfpomw
```

注意第二条使用当前文件会保持接收关闭；正式启用前应按实际映射更新私有文件，不能把空配置覆盖到已上线接收端。

## 验证

本轮结果：149 项单元测试通过；应用 TypeScript 和所改核心前端文件 ESLint 通过；375/1440px 浏览器测试通过；新项目安全检查无 warn/error。实际写入测试仅保留虚构测试记录，不发送邮件。

- 单元测试：`npm test`，包括签名、必填/类型/映射错误、去重响应、正文体积、国家参数、可信完成事件、归档路由禁用。
- 浏览器：`tests/consultation-v2.browser.cjs` 使用现有 3003。375px 和 1440px，检查缺失/非法国家返回首页、选择持久化、AG/DM、隐私门槛、F5、准备中提示、无 Maps/Auth 请求、归档接口 404 和无横向溢出。截图 `/tmp/consultation-v2-{AG,DM}-{375,1440}.png`。
- 真实新项目测试：`scripts/test-tally-intake-v2.mjs`，必须 `TALLY_V2_LIVE_TEST=1` 显式开启。临时只允许虚构 V2TEST 表单，测试后 finally 恢复关闭。拒绝覆盖已启用接收端。每次成功运行保留两条标记为测试的 example.com 记录，不发送邮件、不修改 Tally。
- 真实测试验证表列和 JSON 内容、国家全名、电话、换行及空选填项，并验证匿名 REST 读写拒绝。它不是 Tally 真实提交联调的替代。

## 后续事项

等待 Tally 完成表单和回传 key；真实表单双国家联调；如需要邮件确认另行配置验证；正式 Contact us 表/图片存储的迁移与 Vercel 切换仍待后续协调。本轮不发布、不删除旧项目。

协议详见 [Tally agent 交接说明](./tally-intake-v2-handoff.md)。签名遵循 [Tally 官方 Webhook 文档](https://tally.so/help/webhooks)，权限参考 [Supabase Edge Function 身份验证](https://supabase.com/docs/guides/functions/auth)。
