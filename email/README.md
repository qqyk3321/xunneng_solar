# Xunneng Email Service

邮件模板与独立 Resend 服务，不和主站 Next.js 运行时混用。

当前生产链路为 Supabase `tally-webhook` 直接调用 Resend 托管模板；
`src/server.ts` 是备用独立服务，并非当前 webhook 的发信入口。
编号使用 Tally 的 `submission_id`，通过模板变量 `SUBMISSION_ID` 传递，
展示在 Submitted at 上方。历史已发送邮件不会被修改。

邮件提供 `View your preliminary quote` 和绿色 `Chat on WhatsApp` 两个按钮。
发信端构造完整 WhatsApp 链接，通过 `WHATSAPP_URL` 传入托管模板，消息预填本次
Tally Submission ID；用户点击后仍需在 WhatsApp 中确认发送。
`tally-webhook`、`staff-resend-consultation` 和备用邮件服务支持可选环境变量
`WHATSAPP_BASE_URL`（例如 `https://wa.me/8617605886812`），修改收件号码不需要修改模板。
未配置时使用 `supabase/functions/_shared/whatsapp.ts` 中的公共默认链接。
主站也引用该默认链接；发信环境变量不会自动修改主站号码或二维码。
旧版重试未携带新变量时，模板回退到默认号码及通用咨询消息。

## 功能

- `POST /send/consultation`
  - 接收上游 webhook 转发的咨询信息
  - 使用 Resend 给客户发送确认邮件
  - 可选给内部邮箱发送一份通知
- `GET /health`
  - 健康检查
- `templates/consultation-received.tsx`
  - React Email 模板
  - 可本地预览

## 本地开发

1. 安装依赖

```bash
cd email
npm install
```

2. 配环境变量

```bash
cp .env.example .env
```

3. 启动邮件服务

```bash
npm run dev
```

4. 本地预览模板

```bash
npm run template:dev
```

默认会启动 React Email 的本地预览界面，你可以直接调样式和文案。

模板业务字段包括：

- `previewUrl`
- `previewQrHtml`（由发信端生成的可信 CID 图片片段）
- `whatsappUrl`
- `submissionId`
- `recipientName` / `recipientEmail`
- `submittedAt`
- `supportEmail`

提交时间以 AST 时间格式传入模板；邮件不展示报价金额或 48 小时回复承诺。

### 报价二维码

邮件部分已于 2026-10-12 全量发布，覆盖两地区的自动回复与后台重发；
发布版本和线上验证记录见 [邮件二维码发布记录](../docs/consultation-email-qr-release-2026-10-12.md)。

咨询邮件的报价按钮、200px PNG 二维码、WhatsApp 按钮沿同一中线对齐，
Submission ID 标题和编号也居中；二维码无底部扫码说明文字。
二维码采用品牌深青色、浅海盐绿底、圆角定位图形和太阳海浪 Logo；外缘圆角
直接绘入 PNG，透明角落可融入邮件背景。图片通过 Resend 的 CID
附件直接随邮件发送，扫码目标与 `PREVIEW_URL` 完全一致；不调用外部二维码
服务，也不把客户访问凭证放到公开图片地址。原有报价和 WhatsApp 按钮保留。

`tally-webhook`、`staff-resend-consultation` 和备用邮件服务都使用同一二维码
生成规则。托管模板增加可选变量 `PREVIEW_QR_HTML`，默认空字符串：旧的员工
重试仍发送原封不动的已存 payload，不会显示缺失的 CID 图片。此变量仅接收
代码中的固定 HTML 片段，不接收客户输入。二维码 PNG 单独放在 `attachments`。

Logo 从 `app/icon.svg` 生成；修改品牌图标后运行
`node scripts/build-consultation-qr-logo.mjs`。PNG 合成使用可在 Node 和 Deno
运行的纯 JavaScript，高纠错等级为 Logo 留出余量；Edge Function 不需要
原生图像库或外部图片请求。

上线顺序：先发布含空值回退的新模板，再部署两个 Edge Functions，最后发布网站。
部署 webhook 前先确认没有上一版仍在重试的咨询发信请求；同一 provider
idempotency key 的请求体必须保持一致，不要通过换 key 重发不确定的请求。
二维码生成失败会进入原有发信失败处理，不将未发送邮件标记成功。

本地检查：`node --import tsx --test src/consultation-email.test.ts`。图片渲染已做
浏览器预览；最终邮箱显示仍需在目标邮件客户端中验收。

## 本地预览

```bash
cd email
npm run template:dev
```

然后打开 `http://localhost:3000`，在左侧选择 `consultation-received.tsx`。这是 Resend 官方推荐的 React Email 本地预览方式。来源：Resend React Email 指南。

## 推送模板到 Resend

有两种方式：

1. 在本地预览页右上角使用 Resend 集成上传

```bash
npx react-email@latest resend setup
npm run template:dev
```

在预览页的 Resend 面板里选择 Upload 或 Bulk Upload。

2. 用本项目脚本直接创建并发布模板

```bash
npm run template:push
```

这个脚本会用本地 React 模板渲染 HTML，并调用 Resend Templates API 创建并发布模板。
这一步会更新并发布生产发信使用的托管模板。建议指定 `RESEND_TEMPLATE_ID`
以锁定已核对的生产模板；先发布含新变量的模板，再部署发送该变量的 webhook。

## 生产环境

部署这个 `email/` 服务到你单独的运行环境，例如 VPS、Railway、Render、Fly.io。

当前生产 webhook 使用 `RESEND_API_KEY`、`RESEND_TEMPLATE_ID`、
`RESEND_FROM_EMAIL` 和各地区支持邮箱环境变量。

仅在明确切换到备用独立服务时才使用以下服务连接配置：

- `RESEND_SERVICE_URL=https://your-email-service.example.com/send/consultation`
- `RESEND_SERVICE_SECRET=<same-secret-as-email-service>`
