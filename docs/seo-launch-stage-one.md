# SEO 第一阶段与正式域名上线清单

正式域名：https://www.solortide.com。品牌仍为 Sol & Tide Energy。仅使用两个地区邮箱：安提瓜 ag-support@solortide.com，多米尼克 dm-support@solortide.com，无通用邮箱。

## 已实现

- `/` 输出完整品牌首页和 Organization 数据，保留必须选择地区的蒙层；地区页直接访问不弹窗。没有向爬虫提供不同内容。
- `/antigua`、`/dominica` 为主要地区搜索入口，各自 canonical 和 en-AG / en-DM / x-default；首页背景的计算器与留言地区入口仍输出真实链接。
- 首页、地区页和 FAQ 提供标题、描述及 Open Graph / Twitter 分享信息，新增本地生成的 `/opengraph-image`，不依赖图片生成或外部图片请求。
- FAQ 内容共用：三种 FAQ 网址 canonical 指向 `/faq`，FAQ 不再发布地区 alternate 标记，sitemap 仅列 `/faq`。地区 FAQ 路由、国家上下文和留言保持不变。
- Footer、留言、FAQ 和隐私页按 URL 地区显示对应邮箱，未选地区显示选择入口，不显示邮箱。mock 电话、地址保留配置但默认不展示。
- 总首页 Organization 仅包含品牌、网址、Logo，不发布通用邮箱。地区首页使用相同 Organization ID，并添加当地 ContactPoint（邮箱、服务国家、对应地区网址）；不虚构分公司、实体地址、电话、评价或安装数量。
- 隐私页补充支持邮箱，未伪造公司资料或更改 Cookie 演示功能的实际声明。

## 上线时操作（本轮未部署）

1. 在 Vercel 绑定 www.solortide.com 并核验 DNS / HTTPS。Production 的 SITE_URL 设置为 https://www.solortide.com，然后重新构建部署。本地 .env 不更改，继续使用本地访问地址。
2. 裸域名 solortide.com 永久跳转至 www.solortide.com，保留路径与查询参数。旧 xunneng.qqyk.uk 若退役，再设置逐路径永久跳转；开发 / Preview 域名不要重定向到正式站。
3. 核验正式域名各首页、FAQ、咨询页为 200，canonical/sitemap/分享链接没有旧域名或内网地址；正式页面无 noindex，Preview 仍禁止索引。发布前已将废弃页面的 6 处站内链接改为 Next Link，保留原路由与归档限制，不禁用全局 lint。
4. 实际提交一次咨询和匿名留言，验证新域名下的来源校验与表单流程。邮件地址仅更新展示，不会自动创建邮箱或更改邮件发送服务。
5. Search Console 验证正式域名，提交 /sitemap.xml，检查两个地区首页的抓取结果。旧域名如已收录，按域名迁移流程处理。

## 保留待办，不作为本轮已完成项

- 强制地区蒙层存在侵入式弹窗的 SEO 取舍，按用户要求保留。不保证 Google 只展示地区页或保证排名。
- 100+ 安装量仍为设计占位；95% 节省、5 年内回本需核验业务依据与计算器口径。未为了 SEO 擅自改动这些已确认的设计模块。
- 核实真实公司身份、设备认证及保修文件；电话地址确认后再开放展示。
- Cookie UI 仍是演示；隐私说明和实际第三方行为需另做上线审查。
- 安提瓜 Hero 外链图片的授权、本地化与性能；真实项目案例、性能指标和后续搜索数据优化另行处理。

## 本地验证记录

Git 发布前复核：修复废弃页面 6 处站内链接 lint 错误后，在隔离副本执行正常 `next build`（未使用 --no-lint），编译、lint、类型与 23 页静态生成全部通过；保留 6 条非阻断历史警告。158 项测试通过，检查待提交文件未包含本地私密环境变量；此前的 no-lint 构建记录仅为历史记录。

地区邮箱更新：154 项原单元测试及 4 项 SEO 测试通过；类型与本次文件 ESLint 通过。检查生成 HTML，两个地区的首页、FAQ、隐私页仅展示各自邮箱，总首页 / 通用 FAQ / 通用隐私页均无 mailto 链接。地区 Organization 使用相同品牌 ID 和各自 ContactPoint。邮箱开通、收信和 DNS 未执行或验证；未推送部署。

- 154 项原单元测试及 3 项 SEO 测试通过；TypeScript 检查通过，本次 SEO 文件 ESLint 检查无错误。
- 隔离副本使用正式 SITE_URL 执行 `next build --no-lint`，编译、类型与 23 页静态生成通过；未改工作区 `.next` 或关闭项目 lint 配置，不代表历史 lint 问题已经修复。
- 检查总首页、两个地区首页和三个 FAQ 的生成 HTML：正式域名、分享图片、FAQ canonical 正确，公开页面无 mock 电话地址。品牌 PNG 分享图实际生成约 34 KB。
- 浏览器测试使用隔离构建产物；API 和 Tally 为模拟，不发送真实留言或操作云数据库。未推送、部署或修改本地环境变量。
