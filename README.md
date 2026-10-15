# Xunneng Tally + Resend Flow

## 当前主站发布流程

主站通过 GitHub `qqyk3321/xunneng_solar` 的 `main` 分支自动部署到 Vercel。
操作顺序、干净检出验证、上线核对与回退边界见
[Git 发布流程](docs/git-release-workflow.md)。不要用本地 CLI 上传代替正常 Git 发布。

当前公开页面是品牌首页、两国地区首页/咨询/FAQ/工作原理及隐私页；客户结果页不收录。
旧测试页面和内部工具已移除，下面的旧开发导航及服务部署说明仅作历史参考，
不应据此重新开放路由或执行数据库/后台服务部署。

---

这个仓库当前拆成两段：

- 主项目：现有 Next.js 站点 + `Supabase Edge Function tally-webhook`
- 独立邮件项目：[`email/`](/home/qqyk/project/xunneng/email/README.md)

## 本地测试页面导航

统一入口：`http://192.168.1.176:3003/test-pages`（仅开发环境）。按功能分类展示测试页、登录要求和注意事项；点击后才打开，不预加载页面数据。导航本身不改变业务流程。

首页 `/` 的计算器、Contact us 和 `/faq` 提问均为正式功能，统一提交到 `/api/contact`。账号、上传实验和留言管理等归档为仅本地开发可用；线上页面及子接口统一返回 404。原有问价和客户结果链接保留。

生产部署配置与验收说明见 [Vercel 发布说明](docs/vercel-release.md)。

以后新增测试页，在 `lib/test-pages/catalog.ts` 登记；详见 [测试页导航维护说明](docs/test-pages.md)。

## Data Flow

Tally webhook -> Supabase Edge Function `tally-webhook` -> Postgres table
`public.tally_form_submissions` -> 独立 `email` 服务 -> Resend -> 客户邮箱

同一时间，客户如果直接回复发件邮箱，推荐用 Cloudflare Email Routing
把域名邮箱转发到你自己的真实邮箱。

## Database

The migration in `supabase/migrations` creates:

- `id`: auto-incrementing primary key
- `form_id`: Tally form id
- `submission_id`: Tally response/submission id when present
- `response_id`: Tally response id when present
- `respondent_id`: Tally respondent id when present
- `submission_pdf_url`: Tally-generated PDF URL when present
- `submission_preview_url`: Tally submission preview URL when present
- `location_json`: parsed hidden-field location payload when present
- `email`: extracted email field
- `payload`: full webhook JSON body
- `received_at`: insert timestamp

RLS is enabled and `anon` / `authenticated` table privileges are revoked. The
Edge Function writes with Supabase secret credentials available only server-side.

## Supabase Edge Function

The function is in `supabase/functions/tally-webhook/index.ts`.

It accepts only `POST`, checks the query-string `secret` against
`TALLY_WEBHOOK_SECRET`, extracts the email from common Tally payload shapes,
stores the original JSON payload, and then forwards a compact payload to the
independent email service.

需要新增三个 Supabase secrets：

- `RESEND_SERVICE_URL`
- `RESEND_SERVICE_SECRET`
- `CONSULTATION_PREVIEW_BASE_URL=https://xunneng.qqyk.uk`

`CONSULTATION_PREVIEW_BASE_URL` 只配置在 Edge Function 中。Webhook 会将
`submission_id + response_id + respondent_id` 组合成本站预览页链接，并将该链接
发送给用户；不会将 Tally 的原始 preview URL 直接发送到邮件中。

Supabase 只做 webhook 和转发，不负责模板渲染。

## Email Service

独立邮件服务在 [`email/`](/home/qqyk/project/xunneng/email/README.md)。

它负责：

- 本地预览 React Email 模板
- 对外暴露 `POST /send/consultation`
- 使用 Resend SDK 发客户确认邮件
- 可选给内部邮箱抄送一份通知

## Deployment

```bash
supabase link --project-ref ixantspqezmpfudbmwib
supabase db push --linked --yes
supabase secrets set TALLY_WEBHOOK_SECRET=<long-random-secret>
supabase secrets set RESEND_SERVICE_URL=https://mail-api.example.com/send/consultation
supabase secrets set RESEND_SERVICE_SECRET=<same-secret-used-by-email-service>
supabase secrets set CONSULTATION_PREVIEW_BASE_URL=https://xunneng.qqyk.uk
supabase functions deploy tally-webhook
```

The webhook URL is:

```text
https://ixantspqezmpfudbmwib.supabase.co/functions/v1/tally-webhook?secret=<TALLY_WEBHOOK_SECRET>
```

## Verification

Send a test payload:

```bash
curl -sS -X POST \
  'https://ixantspqezmpfudbmwib.supabase.co/functions/v1/tally-webhook?secret=<TALLY_WEBHOOK_SECRET>' \
  -H 'Content-Type: application/json' \
  --data '{"formId":"QKQpNX","submissionId":"manual-test-001","data":{"fields":[{"label":"联系邮箱","value":"test@example.com"}]}}'
```

Query the cloud database:

```bash
supabase db query --linked -o table \
  "select id, form_id, submission_id, response_id, respondent_id, email, received_at from public.tally_form_submissions order by id desc limit 10;"
```

调用独立邮件服务做联调：

```bash
curl -sS -X POST \
  'http://127.0.0.1:3200/send/consultation' \
  -H 'Content-Type: application/json' \
  -H 'x-resend-service-secret: <RESEND_SERVICE_SECRET>' \
  --data '{"email":"test@example.com","customerName":"张三","previewUrl":"https://tally.so/r/test-preview","locationAddress":"上海市黄浦区人民广场"}'
```

## DNS Notes

Resend 发信域名和 Cloudflare 收件转发建议分开理解：

- 出站发信：在 Resend 里接入你的发送域名，例如 `mail.example.com`
- 入站回复：在 Cloudflare Email Routing 里接入 `example.com` 或指定地址
  例如 `support@example.com -> your-real-mailbox@gmail.com`

这样客户看到的是你的品牌域名，回复邮件也会回到你的真实收件箱。
