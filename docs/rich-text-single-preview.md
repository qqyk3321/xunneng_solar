# 单份富文本表单实验

仅开发环境开放，不改首页和原 `/contact-preview` 咨询记录。

- 填写：`http://192.168.1.176:3003/rich-text-preview`
- 独立预览：`http://192.168.1.176:3003/rich-text-preview/view`

这是所有访问者共用的一份测试表单，没有用户归属。任何能访问本地服务的人都能读取和覆盖它，只用虚构邮箱、文字和图片。数据库本身不开放匿名访问；Next.js 后端在开发环境提供这条共享测试通道。不可直接作为公开业务入口发布。

## 保存的是什么

1. Tiptap 输出正文 JSON，记录标题、段落、加粗、列表和图片位置。图片节点只有 `id`，没有 HTML、Base64 或临时 URL。
2. 图片先在浏览器压缩，优先 WebP，目标约 100 KiB，硬上限 150 KiB；只上传压缩结果，最多 3 张。
3. 提交时后端校验表单并上传图片到私有 bucket `anonymous-inquiry-images-preview` 的独立 `single-form-preview/<本次随机ID>/` 目录。
4. 邮箱、正文 JSON、图片 ID 与路径全部存在 `rich_text_single_preview.form` 这一列 JSONB 中。不建关联表。
5. 固定记录 ID 为 `00000000-0000-4000-8000-000000000001`；每次 upsert 整份替换。表的主键和 CHECK 约束共同保证最多一条记录。

简化示例（说明用，图片 ID 实际为 UUID）：

```json
{
  "email": "demo@example.com",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [{ "type": "text", "text": "需要咨询的问题" }]
      },
      { "type": "inquiryImage", "attrs": { "id": "图片A的UUID" } }
    ]
  },
  "images": [
    {
      "id": "图片A的UUID",
      "path": "single-form-preview/本次UUID/0.webp",
      "mime": "image/webp",
      "bytes": 87100
    }
  ]
}
```

## 如何在另一个页面预览

服务端 `loadSingleForm()` 查询这条记录、校验正文和图片引用，然后为本实验的图片路径生成 1 小时签名地址。浏览器从 Storage 读取图片。临时签名地址不写入数据库，重新打开/重新读取页面会获取新地址。地址失效不等于图片被删除。

预览使用 `InquiryRichContent` 封装的 Tiptap 只读实例（`editable: false`），不显示工具栏，也不接上传或保存事件。编辑和预览共用 `lib/anonymous-inquiry/tiptap-extensions.ts` 中的扩展、图片节点及排版样式，不再单独实现标题、列表等格式的渲染。页面需要 JavaScript 初始化只读实例，加载时显示提示。

图片按压缩后的宽高比显示，默认最大宽度为正文宽度、最大高度 420px；图文先后位置由 JSON 节点顺序保存。首页 Contact us 测试编辑器另有小图默认尺寸和缩放手柄，其可选 `width` 属性也能由共享只读组件还原，并受容器宽度限制；旧数据无需迁移。此独立编辑页面仍不提供缩放手柄。正文工具栏的对齐作用于段落和标题，不是图片；不提供图片左右对齐或裁剪。不同屏幕或容器宽度会自然缩放和换行，不保证不同宽度下像素尺寸相同。

其他**开发测试服务端页面**可以这样复用（实际示例见 `app/rich-text-preview/view/page.tsx`，含错误、空状态和开发环境保护）：

```tsx
import { notFound } from "next/navigation";
import { loadSingleForm } from "@/lib/rich-text-preview/storage";
import { InquiryRichContent } from "@/components/inquiry-rich-content";

export const dynamic = "force-dynamic";

export default async function AnotherPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const saved = await loadSingleForm();
  if (!saved) return <p>还没有保存的表单</p>;
  return (
    <InquiryRichContent
      content={saved.form.content}
      imageUrls={saved.imageUrls}
    />
  );
}
```

要显示邮箱等普通字段，直接读取 `saved.form.email`。不要将带 service-role 密钥的读取模块导入客户端组件。将来用于正式业务时，必须在查询和签名前补充相应的身份与数据权限检查。

## 覆盖和边界

- 编辑页每次从空白填写，暂不回填旧内容。点击保存后才替换数据库记录。
- 不做历史版本、账号归属、工单、邮件或图片清理；覆盖后的旧文件、失败上传遗留文件仍留在 bucket，占用存储。
- 先上传图片，后写整份表单；图片上传失败不会提前替换原记录。数据库超时可能已经写入，先到预览页重新读取确认；重试仍是覆盖同一条记录，但可能多留一组图片。
- 不做多人的并发编辑保护；最终内容以最后成功执行的数据库写入为准。仅适合本次共享验证。
- 后端沿用已有的文档白名单、图片类型/大小校验、请求体上限、Origin 校验和开发环境限频。
- 新表启用 RLS，撤销 PUBLIC/anon/authenticated 权限，仅后端 service_role 可读写；原 bucket 权限不变。

## 初始化与测试

一次性新建测试表（已在当前连接的 Supabase 项目执行；不要重复运行建表 SQL）：

```bash
supabase db query --linked --file scripts/setup-rich-text-single-preview.sql --output json
```

使用已启动的 3003 服务，不自动启动或重启：

```bash
node --conditions=react-server --import tsx --test tests/rich-text-single-preview.test.ts
SINGLE_FORM_LIVE_WRITE=1 PLAYWRIGHT_MODULE=/path/to/playwright node --env-file=.env tests/rich-text-single-preview.browser.cjs
```

浏览器测试会覆盖自己的测试记录；遇到不是测试标记邮箱的现有表单会拒绝运行。测试覆盖真实压缩上传、保存失败保留草稿、关闭编辑上下文后独立读取、图文顺序/格式、Storage 字节校验、第二次保存覆盖且总数为 1、旧图片保留、移动端与匿名数据库拒绝访问。

参考：[Supabase upsert](https://supabase.com/docs/reference/javascript/upsert)、[Storage signed URLs](https://supabase.com/docs/reference/javascript/file-buckets-createsignedurls)。
