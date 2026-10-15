# 业务站 SEO 与站内跳转复核 — 2026-10-12

检查对象：`https://www.solortide.com`，以及当前工作区的路由、SEO 和链接生成代码。未发布应用，未修改业务数据或员工站。

## Sitemap 与 SEO

线上 `/sitemap.xml` 与 `app/sitemap.ts` 一致，仅列出 10 个公开页面：

- `/`、`/privacy`
- `/antigua`、`/antigua/consultation`、`/antigua/faq`、`/antigua/how-it-works`
- `/dominica`、`/dominica/consultation`、`/dominica/faq`、`/dominica/how-it-works`

全部返回 200，canonical 指向自身，允许索引；hreflang 目标均在有效公开页面内。`robots.txt` 指向当前 sitemap。结构化品牌信息与分享图检查通过。

客户结果页 `/{region}/submission/[token]` 保留，不进入 sitemap，继续 noindex/nofollow。线上无效 token 不显示客户结果；在已有路由清理构建的本地隔离数据库 fixture 中，两地区有效 token、错误地区拒绝和 noindex 检查通过。未枚举或读取真实客户的报价记录。

## 跳转检查

- 对 10 个公开页面的服务端 HTML 共检查 191 处站内链接，目标均正常返回 200，无旧页面或兼容重定向入口。
- 已删除的 25 类测试/预览/子接口路由，以及 `/consultation`、`/faq`、`/how-it-works`、地区 `/privacy` 和旧内部工具入口均按当前规则返回 404。
- 390px 与 1440px 浏览器验证通过：首页先选地区再进入 FAQ / How it works，页脚进入该地区 consultation，privacy 新标签打开，原表单状态保留，隐私页使用中立导航和两地区联系方式。
- 两地区 FAQ 场景链接的 `#scene-*` 由 JavaScript 切换内容，并非失效的 HTML id。六种场景均在手机和桌面验证能显示对应内容；桌面首次快速连续导航有一次超时，独立重跑全部场景通过。
- `app/faq/` 中留下的是两地区共用的组件和样式，没有 `page.tsx`，不产生 `/faq` 路由。FAQ 数据中的通用路径经 `getFaqItems(country)` 转为地区链接，实际输出检查通过。

## 本次修正

旧 SEO 检查脚本仍预期 12 个 sitemap 页面、地区隐私页返回 200，以及旧中间件的响应头。这些断言已更新为当前路由规则：

- `tests/seo-public.smoke.mjs`：核对准确的 10 个公开 URL、已删除入口 404，并追加实际 HTML 站内链接目标检查。
- `tests/seo-release.smoke.mjs`：同步公开路由清单、地区隐私页 404、Next 默认 noindex，并保留隔离客户结果页校验。

## 验证入口

- `node tests/seo-public.smoke.mjs`：线上 SEO 与公开页站内链接。
- `HOME_TEST_ORIGIN=https://www.solortide.com node tests/route-cleanup.smoke.mjs`：公开页、25 类删除路由、旧入口、接口方法与 cron 保护。
- `HOME_TEST_ORIGIN=https://www.solortide.com PLAYWRIGHT_MODULE=<本地 Playwright 路径> node tests/privacy-paths.browser.cjs`：桌面和手机跳转；POST 与 Tally iframe 被拦截，不提交表单或发送邮件。
- `SEO_RELEASE_DIR=<已构建的路由清理版本目录> node tests/seo-release.smoke.mjs`：本地隔离 fixture，包含有效客户结果页。
- `node --import tsx --test tests/seo.test.ts tests/public-redirects.test.ts tests/site-region-routing.test.ts tests/faq.test.ts`：24 项通过。

结论仅涵盖当前站点链接、路由和本次测试；搜索引擎索引中的旧 URL 是否已清除，需要另查 Search Console，不能由 sitemap 正确推断。
