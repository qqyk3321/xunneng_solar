# 匿名咨询独立测试页

入口：`http://192.168.1.176:3003/contact-preview`。

本功能只是匿名留言收集，不是工单系统。没有员工回复入口、会话、状态流转、自动邮件或员工通知，也没有接入首页、Tally 或账户提交列表。员工在 Supabase 后台查看咨询，再使用自己的邮箱联系用户。

## 页面与数据

- 可复用组件：`components/anonymous-inquiry-form.tsx`，样式独立 CSS Module。
- 邮箱必填；问题必填，去除首尾空白后 5–5000 个字符。
- 图片可选，最多 3 张。支持 JPEG、PNG、WebP，原图每张不超过 10 MiB，拒绝超大尺寸图片。
- 浏览器默认清晰度优先：从长边 1920、WebP 质量 0.8 开始，以约 100 KiB 为目标，必要时依次尝试 1600/0.78、1280/0.72、1280/0.6、1024/0.65，达到目标即停止，不继续追求更小。若仍未达到目标，接受最小候选但前后端都限制每张不超过 150 KiB；超限则提示裁剪，不继续缩成小图。浏览器不支持 WebP 编码时回退 JPEG，不上传体积膨胀的 PNG；透明背景统一转白。最多尝试 5 档，每次从原始图片重采样，不叠加有损压缩。清晰度不能自动保证，细字不清楚时应裁剪重点区域再上传。支持本地预览、移除，显示上传大小与体积节省比例；点击发送前不上传，不保存原图。
- 当前清晰度策略的示例图实测为 87,100 字节（约 85 KiB），保留原图 1672×941 分辨率，优于上一版 1280×720 的 42 KiB 激进压缩结果。下方“强压缩验证”记录是旧策略的历史结果，不是现行参数。
- 本版已升级为 Tiptap 富文本编辑器：加粗、斜体、下划线、删除线、有序/无序列表、引用、换行、撤销/重做。支持在光标位置插入正文图片，也可以粘贴截图或拖入本地图片（拖入时使用当前光标位置）。外部网页图片不自动抓取；超链接、表格、字体颜色、视频、GIF、HEIC 不在本版范围内。压缩会改变图片内容、可能丢失元数据或动画，不能当作原件存档。
- 成功后显示提交回执和邮件联系提示；失败时保留当前页面内的表单及图片。刷新页面不保留草稿。
- POST `/contact-preview/submit` 经服务端校验后写入 `public.anonymous_inquiries_preview`；图片保存到私有 bucket `anonymous-inquiry-images-preview`，表中记录对象路径。
- 员工查看方式：Supabase 的 Table Editor 打开上述表，按 `created_at` 查看新留言；需要图片时在 Storage 中按记录内的路径查找。没有新增员工页面。

## 富文本保存与还原

可复用编辑器：`components/inquiry-rich-editor.tsx`；只读渲染器：`components/inquiry-rich-content.tsx`。工具栏现在采用官方 Tiptap Simple Editor 的组件和分组方式，由 `components/inquiry-official-toolbar.tsx` 接入，不再使用自制文字按钮。表单保留“预览排版”按钮。保存成功后，会使用数据库返回的正文结构展示保存结果，而不是将输入框中的 HTML 原样插入页面。

官方模板来源：`@tiptap/cli@3.19.4 add simple-editor`，先在 `/tmp/tiptap-official-ycNu9a` 提取，再导入当前需要的 78 个源码/样式依赖文件。上游地址为 `https://github.com/ueberdosis/tiptap-ui-components`，许可证保存在 `docs/licenses/tiptap-ui-MIT.txt`。本地改动为中文标签、编辑器内工具栏布局及样式变量作用域限制；未引入模板全页布局、全局主题切换、示例正文或演示图片上传流程。只复用实际需要的组件，不依赖 Tiptap Cloud。

当前工具栏提供撤销/重做、标题 1–3、列表下拉、引用、加粗/斜体/删除线/下划线、四种对齐方式、图片。代码块、链接、高亮色、任务列表、上/下标、搜索等暂未启用，不展示无法保存的操作。标题和对齐已加入前后端结构白名单及只读渲染，不需要更改 Supabase 表结构或权限。

样式隔离：官方 SCSS 的 `:root` 变量改为 `.inquiry-official-editor` 及官方菜单/提示浮层作用域，`app/globals.css`、首页及全局布局未修改；移动端工具栏在编辑器内换行，不覆盖整站页面。图片仍使用现有压缩、私有存储、UUID 引用和提交去重逻辑。上游 `lib/tiptap-utils.ts` 中的演示上传辅助函数没有被业务组件调用。

官方 UI 接入验证（2026-09-09）：62 项单元/回归测试通过，TypeScript 与业务适配文件 ESLint 通过；上游源码 ESLint 无错误，只有 `lib/tiptap-utils.ts` 两处无需使用的 eslint-disable 注释警告。真实浏览器验证了标题 2/居中保存后还原、列表菜单、图片、响应丢失后的幂等重试、私有图片 SHA256 对比、匿名读写拒绝，以及客户端导航回首页后 body 字体/颜色/背景/行高不变。真实测试新增两条测试留言及两张图片，无邮件发送。产物位于 `/tmp/anonymous-inquiry-test-SOrdXg/`，包含官方工具栏桌面、手机和保存成功截图。未推送、部署或重启服务器。

`content` 列使用 JSONB，保存当前 v1 白名单内的 Tiptap 文档结构。段落、文本标记、列表和图片节点的先后顺序都保留。`message` 是服务端从文档提取的纯文字，供快速查看或未来搜索；它不是富文本的替代存储。原有纯文字测试记录不改写，`content` 为 NULL。

正文图片节点只存 `{ type: "inquiryImage", attrs: { id: "图片 UUID" } }`。同条留言的 `images` 数组保存 `{ id, path, mime, bytes }`，把正文位置关联到私有 Storage 对象。数据库不保存 blob URL、Base64、公开 URL 或会过期的签名 URL。

服务端校验节点类型、父子关系、标记、属性、图片引用、最多 12 层/2000 节点及 128 KiB 文档结构；不接受任意 HTML、脚本、事件属性、CSS 或外部图片地址。只读组件现在使用 Tiptap 自身的 `editable: false` 模式，无工具栏，与编辑器共用扩展和样式，不再手写 JSON 到 React 的格式映射。输入仍经过同一白名单验证，不使用 `dangerouslySetInnerHTML`。图片地址只能由可信调用方根据私有对象授权解析后提供。

当前成功页的文字结构确实来自保存后返回的数据，图片仍用当前页面已有的本地 Blob 显示；不提供匿名凭回执读取历史留言的接口。自动测试另外从私有 bucket 下载图片验证文件一致性。后续若做邮件排版，需要单独进行 JSON 到邮件 HTML 的安全转换，本版没有自动发送邮件。

为支持撤销删除图片，当前草稿保留已压缩图片到重新填写或离开页面；最多累计处理 10 张图片、正文中最多 3 张。刷新仍会丢失草稿。仅格式变化同样会改变内容摘要和提交 ID，原样重试才会复用原回执。

匿名邮箱是未经验证的联系方式，不是登录身份，也不能据此授权访问账户历史记录。提交回执仅用于定位记录，不是读取权限或会话入口。

## 隔离与限制

页面和接口仅在 `NODE_ENV=development` 开放；生产模式返回 404。仅接受配置的 `AUTH_PREVIEW_ORIGIN`（默认 `http://192.168.1.176:3003`）。没有修改首页、认证配置或现有业务表。

按 Supabase 和 Postgres 技能的权限要求，新表启用 RLS，并撤销 PUBLIC、anon、authenticated 的表权限。只由服务端使用 service-role key 写入；客户端不会收到此密钥。没有公开留言读取接口；图片 bucket 为私有，不生成公开图片链接。

当前防护是测试级：单进程每分钟最多 20 次尝试、最多 2 个并发请求、单请求最多 768 KiB、蜜罐字段及类型/长度校验。**尚未接入 Upstash、验证码或分布式限流，不能直接当作生产匿名上传入口。** Origin 校验不能阻止脚本伪造请求。服务端检查图片签名和 MIME，并非完整图片解码或恶意文件扫描。已有私有 bucket 保持历史 1.5 MiB 上限及原权限不变，150 KiB 是当前前后端上传硬限制；旧文件不重新压缩、不删除。

同一草稿使用相同 UUID 和内容摘要重试，可返回原有回执，避免重复保存；内容改变会使用新的提交 ID。数据库主键防止并发重复写入。不能保证用户刷新或开启新页面后再提交相同内容也去重。

上传明确失败时尝试清理已知成功的附件；数据库提交结果不确定时优先保留私有文件，避免误删已保存留言的图片。因此极端网络故障可能留下孤立附件，需要人工核对。没有自动到期清理；删除留言不会自动删除 Storage 文件。清理时应通过 Storage API/控制台删除对象，不直接修改 Storage 元数据表。

## 初始化与验证

新环境先确认 Supabase 项目正确，再执行一次独立建表脚本。脚本遇到同名表会失败，不覆盖已有数据；它不是迁移历史文件。已经初始化的当前项目无需重复建表。

```bash
supabase db query --linked --file scripts/anonymous-inquiry-schema.sql --output json
supabase db query --linked --file scripts/anonymous-inquiry-rich-content.sql --output json
node --env-file=.env --import tsx scripts/setup-anonymous-inquiry.ts
node --import tsx --test tests/anonymous-inquiry.test.ts
node --import tsx --test tests/inquiry-rich-text.test.ts
npx tsc --noEmit
```

浏览器测试不会启动服务器，使用已有 3003 服务。默认只验证界面；开启真实写入选项后会创建两条 `example.com` 测试留言及两张图片，不会发送邮件。

```bash
PLAYWRIGHT_MODULE=/path/to/playwright node --env-file=.env tests/anonymous-inquiry.browser.cjs
INQUIRY_LIVE_WRITE=1 PLAYWRIGHT_MODULE=/path/to/playwright node --env-file=.env tests/anonymous-inquiry.browser.cjs
```

2026-09-09 验证结果：

- 新增 12 项接口测试通过；已有认证、提交列表、首页预览和图片实验的 40 项回归测试通过。
- TypeScript 和本功能 ESLint 检查通过。
- 实际浏览器完成匿名文字、图片压缩/预览/移除、错误反馈及真实保存测试。
- 模拟数据库已保存但浏览器收到 503，原表单和图片保留，重试返回相同回执。
- 从私有 bucket 下载的文件 SHA256 与浏览器压缩后的文件一致；公开下载链接不可访问。
- anon 无法直接读写表；数据库权限查询确认 authenticated 同样无直接读写权限，RLS 已开启。
- 320、375、768、1280 宽度均无横向溢出，人工检查移动端及成功页截图。
- 测试产物：`/tmp/anonymous-inquiry-test-6SN1Ov/`。两条测试留言和两张测试图片保留供检查，未发送任何邮件。

未推送、未部署、未启动或重启现有开发服务器。

富文本升级验证：56 项单元/回归测试通过，TypeScript 和本功能 ESLint 通过。浏览器验证了加粗、列表、斜体引用、图文先后顺序、图片删除/撤销/重做和排版预览。真实保存后对比数据库 JSON 与回执正文完全一致；模拟响应丢失后重试仍是同一条留言。图片私有下载的 SHA256 与浏览器压缩结果一致。此次新增两条测试留言、两张测试图片，产物在 `/tmp/anonymous-inquiry-test-eNt4j6/`，没有发送邮件。

实现参考：[Tiptap 的 Next.js 集成](https://tiptap.dev/docs/editor/getting-started/install/nextjs)、[Supabase JSON/JSONB 保存](https://supabase.com/docs/guides/database/json)。按照 Supabase/Postgres 技能采用增量加列，保留现有数据和 RLS 权限，不给匿名用户增加查询权限。

强压缩验证：61 项单元/回归测试、TypeScript、ESLint 和本地富文本浏览器测试通过。`tests/inquiry-compression.browser.cjs` 实测示例图从 1,150,947 字节压至 43,046 字节（1280×720 WebP，减少 96.3%）；模拟 WebP 不支持时 JPEG 为 69,612 字节；高噪声测试图从 5,850,922 字节压至 74,580 字节（800×450）。这是样本结果，不代表所有图片的压缩率。产物：`/tmp/inquiry-compression-srEJ5m/`；本次浏览器测试未提交任何文件到云端。只读确认旧 bucket 仍为私有，原文件与设置均未改动。编码兼容性参考：[Canvas toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)。
