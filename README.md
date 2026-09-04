# Xunneng Tally + Resend Flow

这个仓库当前拆成两段：

- 主项目：现有 Next.js 站点 + `Supabase Edge Function tally-webhook`
- 独立邮件项目：[`email/`](/home/qqyk/project/xunneng/email/README.md)

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

需要新增两个 Supabase secrets：

- `RESEND_SERVICE_URL`
- `RESEND_SERVICE_SECRET`

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
